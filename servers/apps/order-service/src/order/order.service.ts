import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Inject,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { randomUUID } from 'crypto';
import { OnlineOrder } from '../entities/online-order.entity';
import { LocalOrder } from '../entities/local-order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { OrderItemOption } from '../entities/order-item-option.entity';
import { OrderStatusHistory } from '../entities/order-status-history.entity';
import { OrderRating } from '../entities/order-rating.entity';
import { OrderKind, OrderStatus, PaymentStatus } from '../entities/order-enums';
import { CartService } from '../cart/cart.service';
import { PromoService } from '../promo/promo.service';
import { RedisLockService } from '../shared/redis-lock.service';
import { S3Service } from '../shared/s3.service';
import {
  JOBS,
  ONLINE_AUTO_READY_QUEUE,
  ONLINE_PREPARING_AUTO_READY_MS,
  RECEIPT_QUEUE,
} from '../queue/queue.constants';
import {
  CheckoutDto,
  UpdateOrderStatusDto,
  AssignDeliveryDto,
  RateOrderDto,
  OrderFilterDto,
} from './checkout.dto';

// ─── Role → allowed status transitions ────────────────────────────────────────
// Manager has unrestricted access (checked separately).
const ALLOWED_TRANSITIONS: Record<string, Partial<Record<OrderStatus, OrderStatus[]>>> = {
  restaurant_owner: {
    [OrderStatus.PENDING]:   [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
    [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
    // Cancel-during-prep is allowed too (e.g. ingredient ran out after starting).
    [OrderStatus.PREPARING]: [OrderStatus.READY_FOR_PICKUP, OrderStatus.CANCELLED],
    // "done" in the spec = READY_FOR_PICKUP (restaurant signals meal is ready)
  },
  delivery: {
    // "closed" in the spec = DELIVERED (delivery confirms arrival)
    [OrderStatus.READY_FOR_PICKUP]: [OrderStatus.OUT_FOR_DELIVERY],
    [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED],
  },
  customer: {
    [OrderStatus.PENDING]: [OrderStatus.CANCELLED],
  },
};

// Statuses that lock the order after transition
const LOCKING_STATUSES = new Set<OrderStatus>([
  OrderStatus.DELIVERED,
  OrderStatus.CANCELLED,
  OrderStatus.REFUNDED,
]);

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    @InjectRepository(OnlineOrder) private readonly orderRepo: Repository<OnlineOrder>,
    @InjectRepository(LocalOrder) private readonly localOrderRepo: Repository<LocalOrder>,
    @InjectRepository(OrderItem) private readonly itemRepo: Repository<OrderItem>,
    @InjectRepository(OrderItemOption) private readonly optionRepo: Repository<OrderItemOption>,
    @InjectRepository(OrderStatusHistory) private readonly historyRepo: Repository<OrderStatusHistory>,
    @InjectRepository(OrderRating) private readonly ratingRepo: Repository<OrderRating>,
    private readonly dataSource: DataSource,
    private readonly cartService: CartService,
    private readonly promoService: PromoService,
    private readonly lockService: RedisLockService,
    private readonly s3: S3Service,
    @InjectQueue(RECEIPT_QUEUE) private readonly receiptQueue: Queue,
    @InjectQueue(ONLINE_AUTO_READY_QUEUE) private readonly autoReadyQueue: Queue,
    @Inject('NATS_SERVICE') private readonly nats: ClientProxy,
  ) {}

  // ─── Checkout ─────────────────────────────────────────────────────────────

  async checkout(
    userId: string,
    userInfo: { name: string; phone: string; role: string },
    dto: CheckoutDto,
  ): Promise<OnlineOrder & { _idempotent?: true }> {

    // ── 1. Idempotency fast path ──────────────────────────────────────────
    // If the client sent a key, check for an existing order BEFORE acquiring
    // the lock — this keeps retries cheap (one DB read, no lock contention).
    if (dto.idempotencyKey) {
      const existing = await this.orderRepo.findOne({
        where: { customerId: userId, idempotencyKey: dto.idempotencyKey },
      });
      if (existing) {
        this.logger.log({
          msg: 'checkout_idempotent_hit',
          orderId: existing.id,
          idempotencyKey: dto.idempotencyKey,
          userId,
        });
        return Object.assign(existing, { _idempotent: true as const });
      }
    }

    // ── 2. Redis distributed lock ─────────────────────────────────────────
    // One in-flight checkout per user at a time. Prevents race conditions
    // when a user double-clicks or a network retry fires before the first
    // request commits.
    const lockKey = this.lockService.lockKey(userId);
    const lockToken = await this.lockService.acquire(lockKey);
    if (!lockToken) {
      throw new ConflictException('طلبك قيد المعالجة، يرجى الانتظار لحظة');
    }

    try {
      // ── 3. Re-check idempotency inside the lock (handles the race where two
      //       concurrent requests both missed the fast-path read above).
      if (dto.idempotencyKey) {
        const existing = await this.orderRepo.findOne({
          where: { customerId: userId, idempotencyKey: dto.idempotencyKey },
        });
        if (existing) {
          this.logger.log({
            msg: 'checkout_idempotent_hit_inside_lock',
            orderId: existing.id,
            idempotencyKey: dto.idempotencyKey,
            userId,
          });
          return Object.assign(existing, { _idempotent: true as const });
        }
      }

      // ── 4. Normal checkout ────────────────────────────────────────────────
      const cart = await this.cartService.get(userId);
      if (!cart || cart.items.length === 0) {
        throw new BadRequestException('السلة فارغة');
      }

      // Promo validation
      let discountAmount = 0;
      let promoCodeId: string | undefined;
      if (dto.promoCode) {
        const validation = await this.promoService.validate(
          dto.promoCode,
          cart.subtotal,
          userId,
          cart.restaurantId,
        );
        discountAmount = validation.discountAmount;
        promoCodeId = validation.promoCodeId;
      }

      const deliveryFee = dto.deliveryFee ?? 0;
      const totalAmount = Math.max(0, cart.subtotal - discountAmount + deliveryFee);

      // Collision-resistant order number: prefix + timestamp (ms) + 4 random hex chars
      const orderNumber = `ORD${Date.now().toString(36).toUpperCase()}${randomUUID().replace(/-/g, '').slice(0, 4).toUpperCase()}`;

      // Resolve restaurant owner authoritatively from the restaurants table.
      // Trusting the client-provided dto.ownerUserId leaves orders unscoped to
      // the owning restaurant_owner, which breaks dashboard listing + socket push.
      const ownerRow = await this.dataSource.query(
        'SELECT owner_user_id FROM restaurants WHERE id = $1',
        [cart.restaurantId],
      );
      const resolvedOwnerUserId = ownerRow?.[0]?.owner_user_id ?? dto.ownerUserId ?? null;

      let order: OnlineOrder;
      try {
        order = await this.dataSource.transaction(async (em) => {
          const newOrder = em.create(OnlineOrder, {
            orderNumber,
            customerId: userId,
            idempotencyKey: dto.idempotencyKey ?? null,
            restaurantId: cart.restaurantId,
            ownerUserId: resolvedOwnerUserId,
            deliveryAddressId: dto.addressId,
            deliveryAddressSnapshot: dto.addressSnapshot,
            restaurantNameSnapshot: dto.restaurantName ?? cart.restaurantName,
            customerNameSnapshot: dto.customerName ?? userInfo.name,
            customerPhoneSnapshot: dto.customerPhone ?? userInfo.phone,
            status: OrderStatus.PENDING,
            subtotal: cart.subtotal,
            deliveryFee,
            discountAmount,
            totalAmount,
            paymentMethod: dto.paymentMethod,
            paymentStatus: PaymentStatus.UNPAID,
            promoCodeId,
            customerNotes: dto.customerNotes,
          });

          const savedOrder = await em.save(OnlineOrder, newOrder);

          for (const cartItem of cart.items) {
            const item = await em.save(OrderItem, em.create(OrderItem, {
              orderId: savedOrder.id,
              mealId: cartItem.mealId,
              mealNameSnapshot: cartItem.mealName,
              unitPriceSnapshot: cartItem.unitPrice,
              quantity: cartItem.quantity,
              totalPrice: cartItem.totalPrice,
              specialInstructions: cartItem.specialInstructions,
            }));

            for (const opt of cartItem.options) {
              await em.save(OrderItemOption, {
                orderItemId: item.id,
                optionId: opt.optionId,
                optionNameSnapshot: opt.optionName,
                extraPriceSnapshot: opt.extraPrice,
              });
            }
          }

          await em.save(OrderStatusHistory, em.create(OrderStatusHistory, {
            orderId: savedOrder.id,
            status: OrderStatus.PENDING,
            changedByUserId: userId,
            note: 'تم إنشاء الطلب',
          }));

          return savedOrder;
        });
      } catch (err: any) {
        // PostgreSQL unique-violation on (customerId, idempotencyKey):
        // another concurrent request just committed the same key.
        // Fetch and return that order instead of failing.
        if (err?.code === '23505' && dto.idempotencyKey) {
          const existing = await this.orderRepo.findOne({
            where: { customerId: userId, idempotencyKey: dto.idempotencyKey },
          });
          if (existing) {
            this.logger.warn({
              msg: 'checkout_unique_violation_recovered',
              idempotencyKey: dto.idempotencyKey,
              orderId: existing.id,
              userId,
            });
            return Object.assign(existing, { _idempotent: true as const });
          }
        }
        throw err;
      }

      if (promoCodeId) {
        await this.promoService.recordUsage(promoCodeId, userId, order.id, discountAmount);
      }

      await this.cartService.clear(userId);

      // Enqueue receipt generation — processed by ReceiptProcessor with retries
      await this.receiptQueue.add(
        JOBS.GENERATE_RECEIPT,
        {
          orderId: order.id,
          orderNumber: order.orderNumber,
          restaurantId: order.restaurantId,
          customerId: userId,
          items: cart.items,
        },
        { jobId: `receipt-${order.id}` },
      );

      this.emitSafe('order.created', {
        eventId: randomUUID(),
        orderId: order.id,
        orderNumber: order.orderNumber,
        restaurantId: order.restaurantId,
        ownerUserId: order.ownerUserId,
        customerId: userId,
        customerName: order.customerNameSnapshot,
        restaurantName: order.restaurantNameSnapshot,
        totalAmount: order.totalAmount,
        status: order.status,
        items: cart.items.map((i) => ({ name: i.mealName, qty: i.quantity })),
        createdAt: order.createdAt,
      });

      this.logger.log({
        msg: 'order_created',
        orderId: order.id,
        orderNumber: order.orderNumber,
        restaurantId: order.restaurantId,
        customerId: userId,
        totalAmount: order.totalAmount,
        idempotencyKey: dto.idempotencyKey ?? null,
      });

      return order;

    } finally {
      // Always release the lock — even if an exception is thrown above
      await this.lockService.release(lockKey, lockToken);
    }
  }

  // ─── List orders ──────────────────────────────────────────────────────────

  async list(userId: string, role: string, dto: OrderFilterDto) {
    const page  = Math.max(1, dto.page ?? 1);
    const limit = Math.min(50, Math.max(1, dto.limit ?? 20));
    const skip  = (page - 1) * limit;
    const kind  = dto.kind ?? OrderKind.ONLINE;

    // Pick the right child repo so TypeORM filters by kind automatically and
    // each row is returned with its kind-specific columns populated.
    const repo = kind === OrderKind.LOCAL ? this.localOrderRepo : this.orderRepo;
    const qb = repo
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.items', 'items')
      .orderBy('o.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    // Strict role-based scoping
    switch (role) {
      case 'customer':
        // POS orders have no customer; customers can only browse online orders
        if (kind === OrderKind.LOCAL) {
          return { data: [], total: 0, page, limit, pages: 0 };
        }
        qb.andWhere('o.customerId = :userId', { userId });
        break;
      case 'restaurant_owner':
        if (!dto.restaurantId) throw new BadRequestException('يجب تحديد restaurantId');
        // Extra guard: ensure the owner actually owns this restaurant via ownerUserId
        qb.andWhere('o.restaurantId = :rid AND o.ownerUserId = :ownerId', {
          rid: dto.restaurantId,
          ownerId: userId,
        });
        break;
      case 'delivery':
        // Delivery agents don't see POS orders
        if (kind === OrderKind.LOCAL) {
          return { data: [], total: 0, page, limit, pages: 0 };
        }
        qb.andWhere('o.deliveryAgentId = :userId', { userId });
        break;
      // manager: no filter — sees all
    }

    if (dto.status) {
      // OnlineOrder.status (order_status enum) vs LocalOrder.localStatus (local_order_status)
      if (kind === OrderKind.LOCAL) {
        qb.andWhere('o.localStatus = :status', { status: dto.status });
      } else {
        qb.andWhere('o.status = :status', { status: dto.status });
      }
    }
    if (dto.search)
      qb.andWhere(
        '(o.orderNumber ILIKE :q OR o.customerNameSnapshot ILIKE :q)',
        { q: `%${dto.search}%` },
      );

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  // ─── Get single order ─────────────────────────────────────────────────────

  async findOne(orderId: string, userId: string, role: string) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['items', 'items.options', 'statusHistory'],
    });
    if (!order) throw new NotFoundException('الطلب غير موجود');
    this.assertAccess(order, userId, role);
    return order;
  }

  // ─── Update status ────────────────────────────────────────────────────────

  async updateStatus(
    orderId: string,
    userId: string,
    role: string,
    dto: UpdateOrderStatusDto,
  ) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('الطلب غير موجود');
    if (order.isLocked) throw new ForbiddenException('الطلب مغلق ولا يمكن تعديله');

    this.assertAccess(order, userId, role);

    const newStatus = dto.status as OrderStatus;
    this.validateTransition(order.status, newStatus, role);

    const updates: Partial<OnlineOrder> = { status: newStatus };

    if (LOCKING_STATUSES.has(newStatus)) {
      updates.isLocked = true;
    }
    if (newStatus === OrderStatus.DELIVERED) {
      updates.deliveredAt = new Date();
    }
    if (newStatus === OrderStatus.PREPARING) {
      // Stamp the moment we enter PREPARING so the dashboard can render the
      // 15-min countdown that matches the BullMQ auto-ready timer below.
      updates.preparingStartedAt = new Date();
    }

    await this.orderRepo.update(orderId, updates);

    // ── Auto-ready timer: PREPARING → READY_FOR_PICKUP after 15 minutes ──
    // Schedule when entering PREPARING; cancel when leaving it (manager
    // moves to READY_FOR_PICKUP / CANCELLED / etc. before the timer fires).
    const autoReadyJobId = `online-auto-ready-${orderId}`;
    if (newStatus === OrderStatus.PREPARING) {
      await this.autoReadyQueue
        .add(
          JOBS.ONLINE_AUTO_READY,
          { orderId },
          { delay: ONLINE_PREPARING_AUTO_READY_MS, jobId: autoReadyJobId },
        )
        .catch((err) => this.logger.warn({ msg: 'auto_ready_schedule_failed', orderId, err }));
    } else if (order.status === OrderStatus.PREPARING) {
      await this.autoReadyQueue.remove(autoReadyJobId).catch(() => undefined);
    }
    await this.historyRepo.save(
      this.historyRepo.create({ orderId, status: newStatus, changedByUserId: userId, note: dto.note }),
    );

    // Auto-archive chat when order is locked
    if (LOCKING_STATUSES.has(newStatus)) {
      this.emitSafe('order.archive.chat', { orderId });
    }

    this.emitSafe('order.status.changed', {
      eventId: randomUUID(),
      orderId,
      orderNumber: order.orderNumber,
      status: newStatus,
      previousStatus: order.status,
      changedBy: userId,
      changedByRole: role,
      restaurantId: order.restaurantId,
      customerId: order.customerId,
      deliveryAgentId: order.deliveryAgentId,
      ownerUserId: order.ownerUserId,
    });

    this.logger.log({
      msg: 'order_status_changed',
      orderId,
      from: order.status,
      to: newStatus,
      changedBy: userId,
      role,
    });

    return { ...order, status: newStatus };
  }

  // ─── Assign delivery ──────────────────────────────────────────────────────

  async assignDelivery(
    orderId: string,
    userId: string,
    role: string,
    dto: AssignDeliveryDto,
  ) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('الطلب غير موجود');
    if (role !== 'manager' && role !== 'restaurant_owner') {
      throw new ForbiddenException('غير مصرح');
    }
    // restaurant_owner can only assign to their own orders
    if (role === 'restaurant_owner' && order.ownerUserId !== userId) {
      throw new ForbiddenException('غير مصرح لهذا الطلب');
    }
    if (order.status === OrderStatus.CANCELLED || order.status === OrderStatus.DELIVERED) {
      throw new BadRequestException('لا يمكن تعيين مندوب لطلب منتهٍ');
    }

    await this.orderRepo.update(orderId, { deliveryAgentId: dto.deliveryAgentId });

    this.emitSafe('order.delivery.assigned', {
      eventId: randomUUID(),
      orderId,
      orderNumber: order.orderNumber,
      deliveryAgentId: dto.deliveryAgentId,
      restaurantId: order.restaurantId,
      customerId: order.customerId,
      ownerUserId: order.ownerUserId,
    });

    this.logger.log({
      msg: 'delivery_assigned',
      orderId,
      deliveryAgentId: dto.deliveryAgentId,
      assignedBy: userId,
      role,
    });

    return { success: true, orderId, deliveryAgentId: dto.deliveryAgentId };
  }

  // ─── Rate order ───────────────────────────────────────────────────────────

  async rate(orderId: string, userId: string, dto: RateOrderDto) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('الطلب غير موجود');
    if (order.customerId !== userId) throw new ForbiddenException('غير مصرح');
    if (order.status !== OrderStatus.DELIVERED)
      throw new BadRequestException('يمكن التقييم فقط بعد تسليم الطلب');

    const existing = await this.ratingRepo.findOne({ where: { orderId } });
    if (existing) throw new ConflictException('تم تقييم الطلب مسبقاً');

    const rating = await this.ratingRepo.save(
      this.ratingRepo.create({ orderId, customerId: userId, ...dto }),
    );

    this.emitSafe('order.rated', {
      eventId: randomUUID(),
      orderId,
      restaurantId: order.restaurantId,
      foodRating: dto.foodRating,
      deliveryRating: dto.deliveryRating,
    });

    return rating;
  }

  // ─── Payment proof upload ─────────────────────────────────────────────────

  async uploadPaymentProof(
    orderId: string,
    userId: string,
    role: string,
    file: Express.Multer.File,
  ): Promise<{ paymentProofKey: string }> {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('الطلب غير موجود');
    this.assertAccess(order, userId, role);

    if (!file) throw new BadRequestException('لم يتم إرفاق ملف');
    if (!file.mimetype?.startsWith('image/'))
      throw new BadRequestException('يجب أن يكون الملف صورة');

    const key = await this.s3.upload(file, `payment-proofs/${orderId}`);
    await this.orderRepo.update(orderId, { paymentProofKey: key });

    return { paymentProofKey: key };
  }

  // ─── Access guards ─────────────────────────────────────────────────────────

  /**
   * Returns true if the user has read/write access to the order.
   * Throws ForbiddenException otherwise.
   */
  assertAccess(order: OnlineOrder, userId: string, role: string): void {
    if (role === 'manager') return;

    if (role === 'customer') {
      if (order.customerId !== userId) throw new ForbiddenException('غير مصرح للوصول لهذا الطلب');
      return;
    }

    if (role === 'restaurant_owner') {
      // ownerUserId must match — prevents an owner from viewing other restaurants' orders
      if (order.ownerUserId && order.ownerUserId !== userId)
        throw new ForbiddenException('غير مصرح للوصول لهذا الطلب');
      return;
    }

    if (role === 'delivery') {
      if (!order.deliveryAgentId || order.deliveryAgentId !== userId)
        throw new ForbiddenException('غير مصرح للوصول لهذا الطلب');
      return;
    }

    throw new ForbiddenException('غير مصرح');
  }

  private validateTransition(current: OrderStatus, next: OrderStatus, role: string): void {
    if (role === 'manager') return; // manager can force any transition

    const allowed = ALLOWED_TRANSITIONS[role]?.[current];
    if (!allowed?.includes(next)) {
      throw new BadRequestException(
        `لا يمكن تغيير الحالة من "${current}" إلى "${next}" بدور "${role}"`,
      );
    }
  }

  /** Fire-and-forget NATS emit — never throws, always logs on failure */
  private emitSafe(pattern: string, payload: Record<string, unknown>): void {
    try {
      this.nats.emit(pattern, payload);
    } catch (err) {
      this.logger.error({ msg: 'nats_emit_failed', pattern, err });
    }
  }
}
