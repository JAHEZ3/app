import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderRead, OrderStatus, PaymentStatus } from './read-models/order.read';
import { RestaurantRead, RestaurantStatus } from './read-models/restaurant.read';
import { CustomerRead } from './read-models/customer.read';
import { DeliveryRead, DeliveryStatus } from './read-models/delivery.read';
import { DeliveryAgentRead, AgentStatus } from './read-models/delivery-agent.read';
import { UserRead, UserRole, UserStatus } from './read-models/user.read';
import { OrderTransactionRead } from './read-models/order-transaction.read';

const REVENUE_STATUSES = [OrderStatus.DELIVERED];

const num = (v: string | number | null | undefined) =>
  v == null ? 0 : Number(v);

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const daysAgo = (n: number) => {
  const x = startOfDay(new Date());
  x.setDate(x.getDate() - n);
  return x;
};

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(OrderRead) private readonly orderRepo: Repository<OrderRead>,
    @InjectRepository(RestaurantRead) private readonly restaurantRepo: Repository<RestaurantRead>,
    @InjectRepository(CustomerRead) private readonly customerRepo: Repository<CustomerRead>,
    @InjectRepository(DeliveryRead) private readonly deliveryRepo: Repository<DeliveryRead>,
    @InjectRepository(DeliveryAgentRead) private readonly agentRepo: Repository<DeliveryAgentRead>,
    @InjectRepository(UserRead) private readonly userRepo: Repository<UserRead>,
    @InjectRepository(OrderTransactionRead) private readonly txRepo: Repository<OrderTransactionRead>,
  ) {}

  // ─── Public landing stats (no auth) ────────────────────────────────────────
  // Aggregate counts only — used by the unauthenticated login/landing page.
  // Safe to expose: no PII, just totals every platform shows publicly.

  async getPublicStats() {
    const [restaurants, customers, deliveredOrders] = await Promise.all([
      this.restaurantRepo.count({ where: { status: RestaurantStatus.ACTIVE } }),
      this.customerRepo.count(),
      this.orderRepo.count({ where: { status: OrderStatus.DELIVERED } }),
    ]);
    return {
      data: {
        restaurants,
        customers,
        completedOrders: deliveredOrders,
        uptimePercent: 99.9,
      },
      message: 'تم استرجاع الإحصائيات العامة.',
    };
  }

  // ─── Top-level overview ────────────────────────────────────────────────────

  async getOverview() {
    const [
      orders,
      restaurants,
      customers,
      agents,
      users,
      revenue,
    ] = await Promise.all([
      this.orderCounts(),
      this.restaurantCounts(),
      this.customerCounts(),
      this.agentCounts(),
      this.userCounts(),
      this.revenueTotals(),
    ]);

    return {
      data: { orders, restaurants, customers, agents, users, revenue },
      message: 'تم استرجاع نظرة عامة على النظام.',
    };
  }

  // ─── Orders ────────────────────────────────────────────────────────────────

  /**
   * Manager-facing listing of every order on the platform with the snapshot
   * fields (order number, customer / restaurant names, city, item count, driver).
   * Reads directly from `orders` since the read-model deliberately omits
   * snapshot columns — `orderRepo.query` is the cheapest path here.
   */
  async listOrders(params: {
    status?: OrderStatus;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(params.limit) || 50));
    const offset = (page - 1) * limit;

    const where: string[] = [];
    const args: (string | number)[] = [];
    if (params.status) {
      args.push(params.status);
      where.push(`o.status = $${args.length}`);
    }
    if (params.search && params.search.trim().length) {
      args.push(`%${params.search.trim()}%`);
      const i = args.length;
      where.push(
        `(o.order_number ILIKE $${i} OR o.customer_name_snapshot ILIKE $${i} OR o.restaurant_name_snapshot ILIKE $${i})`,
      );
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const listSql = `
      SELECT
        o.id::text                                                           AS "id",
        o.order_number                                                       AS "orderNumber",
        COALESCE(o.customer_name_snapshot, '')                               AS "customerName",
        COALESCE(o.restaurant_name_snapshot, '')                             AS "restaurantName",
        o.status                                                             AS "status",
        o.total_amount::float                                                AS "totalAmount",
        COALESCE(o.delivery_address_snapshot->>'city', '')                   AS "city",
        o.created_at                                                         AS "createdAt",
        CASE WHEN a.id IS NULL THEN NULL
             ELSE a.first_name || ' ' || a.last_name END                     AS "driverName",
        (SELECT COUNT(*)::int FROM order_items oi WHERE oi.order_id = o.id)  AS "itemsCount"
      FROM orders o
      LEFT JOIN delivery_agents a ON a.id = o.delivery_agent_id
      ${whereSql}
      ORDER BY o.created_at DESC
      OFFSET ${offset} LIMIT ${limit}
    `;
    const countSql = `SELECT COUNT(*)::int AS total FROM orders o ${whereSql}`;

    const [items, totalRows] = await Promise.all([
      this.orderRepo.query(listSql, args),
      this.orderRepo.query(countSql, args),
    ]);

    return {
      data: {
        items,
        total: num(totalRows?.[0]?.total),
        page,
        limit,
      },
      message: 'تم استرجاع قائمة الطلبات.',
    };
  }

  /**
   * Full single-order detail bundle: order header, customer, restaurant,
   * delivery, payment totals, and items. Reads directly from the live
   * tables (orders, order_items, deliveries, delivery_agents, restaurants).
   */
  async getOrderDetails(id: string) {
    const orderRows = await this.orderRepo.query(
      `
      SELECT
        o.id::text                              AS "id",
        o.order_number                          AS "orderNumber",
        o.status                                AS "status",
        o.created_at                            AS "createdAt",
        o.delivered_at                          AS "deliveredAt",
        o.estimated_delivery_at                 AS "estimatedDeliveryAt",
        o.subtotal::float                       AS "subtotal",
        o.delivery_fee::float                   AS "deliveryFee",
        o.discount_amount::float                AS "discountAmount",
        o.total_amount::float                   AS "totalAmount",
        o.payment_method                        AS "paymentMethod",
        o.payment_status                        AS "paymentStatus",
        o.customer_id::text                     AS "customerId",
        o.restaurant_id::text                   AS "restaurantId",
        o.delivery_agent_id::text               AS "deliveryAgentId",
        COALESCE(o.customer_name_snapshot, '')  AS "customerName",
        COALESCE(o.customer_phone_snapshot, '') AS "customerPhone",
        COALESCE(o.restaurant_name_snapshot,'') AS "restaurantName",
        o.delivery_address_snapshot             AS "deliveryAddress",
        o.customer_notes                        AS "customerNotes"
      FROM orders o
      WHERE o.id = $1
      LIMIT 1
      `,
      [id],
    );
    const order = orderRows[0];
    if (!order) throw new NotFoundException('الطلب غير موجود.');

    const [items, restaurantRows, deliveryRows] = await Promise.all([
      this.orderRepo.query(
        `
        SELECT
          oi.id::text                       AS "id",
          oi.meal_name_snapshot             AS "name",
          oi.quantity::int                  AS "quantity",
          oi.unit_price_snapshot::float     AS "unitPrice",
          oi.total_price::float             AS "totalPrice",
          oi.special_instructions           AS "specialInstructions"
        FROM order_items oi
        WHERE oi.order_id = $1
        ORDER BY oi.id
        `,
        [id],
      ),
      this.orderRepo.query(
        `SELECT id::text AS "id", name, city FROM restaurants WHERE id = $1 LIMIT 1`,
        [order.restaurantId],
      ),
      order.deliveryAgentId
        ? this.orderRepo.query(
            `
            SELECT
              d.status                              AS "status",
              d.distance_km::float                  AS "distanceKm",
              d.agent_earnings::float               AS "agentEarnings",
              d.delivered_at                        AS "deliveredAt",
              a.id::text                            AS "agentId",
              a.first_name || ' ' || a.last_name    AS "agentName",
              a.city                                AS "agentCity"
            FROM deliveries d
            LEFT JOIN delivery_agents a ON a.id = d.agent_id
            WHERE d.order_id = $1
            LIMIT 1
            `,
            [id],
          )
        : Promise.resolve([]),
    ]);

    return {
      data: {
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          createdAt: order.createdAt,
          deliveredAt: order.deliveredAt,
          estimatedDeliveryAt: order.estimatedDeliveryAt,
          customerNotes: order.customerNotes,
        },
        customer: {
          id: order.customerId,
          name: order.customerName,
          phone: order.customerPhone,
          address: order.deliveryAddress ?? null,
        },
        restaurant: {
          id: order.restaurantId,
          name: restaurantRows?.[0]?.name ?? order.restaurantName,
          city: restaurantRows?.[0]?.city ?? null,
        },
        delivery: deliveryRows?.[0]
          ? {
              status: deliveryRows[0].status,
              distanceKm: deliveryRows[0].distanceKm,
              agentEarnings: deliveryRows[0].agentEarnings,
              deliveredAt: deliveryRows[0].deliveredAt,
              agent: deliveryRows[0].agentId
                ? {
                    id: deliveryRows[0].agentId,
                    name: deliveryRows[0].agentName,
                    city: deliveryRows[0].agentCity,
                  }
                : null,
            }
          : null,
        payment: {
          method: order.paymentMethod,
          status: order.paymentStatus,
          subtotal: order.subtotal,
          deliveryFee: order.deliveryFee,
          discountAmount: order.discountAmount,
          totalAmount: order.totalAmount,
        },
        items,
      },
      message: 'تم استرجاع تفاصيل الطلب.',
    };
  }

  async getOrdersAnalytics() {
    const [counts, byStatus, byPaymentMethod, timeSeries] = await Promise.all([
      this.orderCounts(),
      this.orderCountByStatus(),
      this.orderCountByPaymentMethod(),
      this.orderTimeSeries(30),
    ]);
    return {
      data: { ...counts, byStatus, byPaymentMethod, last30Days: timeSeries },
      message: 'تم استرجاع تحليلات الطلبات.',
    };
  }

  private async orderCounts() {
    const today = startOfDay(new Date());
    const week = daysAgo(7);
    const month = daysAgo(30);

    const [total, todayCount, weekCount, monthCount, delivered, cancelled] =
      await Promise.all([
        this.orderRepo.count(),
        this.orderRepo.createQueryBuilder('o').where('o.created_at >= :d', { d: today }).getCount(),
        this.orderRepo.createQueryBuilder('o').where('o.created_at >= :d', { d: week }).getCount(),
        this.orderRepo.createQueryBuilder('o').where('o.created_at >= :d', { d: month }).getCount(),
        this.orderRepo.count({ where: { status: OrderStatus.DELIVERED } }),
        this.orderRepo.count({ where: { status: OrderStatus.CANCELLED } }),
      ]);

    return { total, today: todayCount, week: weekCount, month: monthCount, delivered, cancelled };
  }

  private async orderCountByStatus() {
    const rows = await this.orderRepo
      .createQueryBuilder('o')
      .select('o.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('o.status')
      .getRawMany<{ status: OrderStatus; count: string }>();
    return rows.map((r) => ({ status: r.status, count: num(r.count) }));
  }

  private async orderCountByPaymentMethod() {
    const rows = await this.orderRepo
      .createQueryBuilder('o')
      .select('o.payment_method', 'method')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(o.total_amount), 0)', 'total')
      .groupBy('o.payment_method')
      .getRawMany<{ method: string; count: string; total: string }>();
    return rows.map((r) => ({ method: r.method, count: num(r.count), total: num(r.total) }));
  }

  private async orderTimeSeries(days: number) {
    const since = daysAgo(days - 1);
    const rows = await this.orderRepo
      .createQueryBuilder('o')
      .select("DATE(o.created_at)", 'day')
      .addSelect('COUNT(*)', 'orders')
      .addSelect("COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN o.total_amount ELSE 0 END), 0)", 'revenue')
      .where('o.created_at >= :since', { since })
      .groupBy("DATE(o.created_at)")
      .orderBy("DATE(o.created_at)", 'ASC')
      .getRawMany<{ day: string; orders: string; revenue: string }>();
    return rows.map((r) => ({ day: r.day, orders: num(r.orders), revenue: num(r.revenue) }));
  }

  // ─── Revenue ───────────────────────────────────────────────────────────────

  async getRevenueAnalytics() {
    const [totals, timeSeries, byPaymentMethod] = await Promise.all([
      this.revenueTotals(),
      this.orderTimeSeries(30),
      this.orderCountByPaymentMethod(),
    ]);
    return {
      data: { ...totals, byPaymentMethod, last30Days: timeSeries },
      message: 'تم استرجاع تحليلات الإيرادات.',
    };
  }

  private async revenueTotals() {
    const today = startOfDay(new Date());
    const week = daysAgo(7);
    const month = daysAgo(30);

    const baseQb = () =>
      this.orderRepo
        .createQueryBuilder('o')
        .where('o.status IN (:...statuses)', { statuses: REVENUE_STATUSES });

    const [allRow, todayRow, weekRow, monthRow] = await Promise.all([
      baseQb()
        .select('COALESCE(SUM(o.total_amount), 0)', 'sum')
        .addSelect('COUNT(*)', 'count')
        .getRawOne<{ sum: string; count: string }>(),
      baseQb()
        .andWhere('o.created_at >= :d', { d: today })
        .select('COALESCE(SUM(o.total_amount), 0)', 'sum')
        .getRawOne<{ sum: string }>(),
      baseQb()
        .andWhere('o.created_at >= :d', { d: week })
        .select('COALESCE(SUM(o.total_amount), 0)', 'sum')
        .getRawOne<{ sum: string }>(),
      baseQb()
        .andWhere('o.created_at >= :d', { d: month })
        .select('COALESCE(SUM(o.total_amount), 0)', 'sum')
        .getRawOne<{ sum: string }>(),
    ]);

    const totalRevenue = num(allRow?.sum);
    const totalDelivered = num(allRow?.count);
    const avgOrder = totalDelivered > 0 ? totalRevenue / totalDelivered : 0;

    return {
      total: totalRevenue,
      today: num(todayRow?.sum),
      week: num(weekRow?.sum),
      month: num(monthRow?.sum),
      avgOrderValue: avgOrder,
      paidOrders: totalDelivered,
    };
  }

  // ─── Restaurants ───────────────────────────────────────────────────────────

  async getRestaurantsAnalytics() {
    const [counts, byStatus, byCuisine, byCity, top] = await Promise.all([
      this.restaurantCounts(),
      this.restaurantByStatus(),
      this.restaurantByCuisine(),
      this.restaurantByCity(),
      this.topRestaurants(10),
    ]);
    return {
      data: { ...counts, byStatus, byCuisine, byCity, top },
      message: 'تم استرجاع تحليلات المطاعم.',
    };
  }

  private async restaurantCounts() {
    const [total, active, pending, suspended, open] = await Promise.all([
      this.restaurantRepo.count(),
      this.restaurantRepo.count({ where: { status: RestaurantStatus.ACTIVE } }),
      this.restaurantRepo.count({ where: { status: RestaurantStatus.PENDING_APPROVAL } }),
      this.restaurantRepo.count({ where: { status: RestaurantStatus.SUSPENDED } }),
      this.restaurantRepo.count({ where: { status: RestaurantStatus.ACTIVE, isOpen: true } }),
    ]);
    return { total, active, pending, suspended, openNow: open };
  }

  private async restaurantByStatus() {
    const rows = await this.restaurantRepo
      .createQueryBuilder('r')
      .select('r.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('r.status')
      .getRawMany<{ status: string; count: string }>();
    return rows.map((r) => ({ status: r.status, count: num(r.count) }));
  }

  private async restaurantByCuisine() {
    const rows = await this.restaurantRepo
      .createQueryBuilder('r')
      .select('r.cuisine_type', 'cuisine')
      .addSelect('COUNT(*)', 'count')
      .where('r.cuisine_type IS NOT NULL')
      .groupBy('r.cuisine_type')
      .orderBy('COUNT(*)', 'DESC')
      .getRawMany<{ cuisine: string; count: string }>();
    return rows.map((r) => ({ cuisine: r.cuisine, count: num(r.count) }));
  }

  private async restaurantByCity() {
    const rows = await this.restaurantRepo
      .createQueryBuilder('r')
      .select('r.city', 'city')
      .addSelect('COUNT(*)', 'count')
      .where('r.city IS NOT NULL')
      .groupBy('r.city')
      .orderBy('COUNT(*)', 'DESC')
      .limit(20)
      .getRawMany<{ city: string; count: string }>();
    return rows.map((r) => ({ city: r.city, count: num(r.count) }));
  }

  private async topRestaurants(limit: number) {
    const rows = await this.orderRepo
      .createQueryBuilder('o')
      .innerJoin(RestaurantRead, 'r', 'r.id = o.restaurant_id')
      .select('r.id', 'id')
      .addSelect('r.name', 'name')
      .addSelect('r.city', 'city')
      .addSelect('COUNT(o.id)', 'orders')
      .addSelect("COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN o.total_amount ELSE 0 END), 0)", 'revenue')
      .where('o.status NOT IN (:...excluded)', {
        excluded: [OrderStatus.CANCELLED, OrderStatus.REFUNDED],
      })
      .groupBy('r.id')
      .addGroupBy('r.name')
      .addGroupBy('r.city')
      .orderBy('orders', 'DESC')
      .limit(limit)
      .getRawMany<{ id: string; name: string; city: string; orders: string; revenue: string }>();
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      city: r.city,
      orders: num(r.orders),
      revenue: num(r.revenue),
    }));
  }

  // ─── Customers ─────────────────────────────────────────────────────────────

  async getCustomersAnalytics() {
    const [counts, top, walletTotals] = await Promise.all([
      this.customerCounts(),
      this.topCustomers(10),
      this.customerWalletTotals(),
    ]);
    return {
      data: { ...counts, walletTotals, top },
      message: 'تم استرجاع تحليلات العملاء.',
    };
  }

  private async customerCounts() {
    const today = startOfDay(new Date());
    const week = daysAgo(7);
    const month = daysAgo(30);
    const [total, profileCompleted, todayCount, weekCount, monthCount, ordering] =
      await Promise.all([
        this.customerRepo.count(),
        this.customerRepo.count({ where: { profileCompleted: true } }),
        this.customerRepo.createQueryBuilder('c').where('c.created_at >= :d', { d: today }).getCount(),
        this.customerRepo.createQueryBuilder('c').where('c.created_at >= :d', { d: week }).getCount(),
        this.customerRepo.createQueryBuilder('c').where('c.created_at >= :d', { d: month }).getCount(),
        this.orderRepo
          .createQueryBuilder('o')
          .select('COUNT(DISTINCT o.customer_id)', 'count')
          .where('o.created_at >= :d', { d: month })
          .getRawOne<{ count: string }>(),
      ]);
    return {
      total,
      profileCompleted,
      newToday: todayCount,
      newThisWeek: weekCount,
      newThisMonth: monthCount,
      activeLast30Days: num(ordering?.count),
    };
  }

  private async customerWalletTotals() {
    const row = await this.customerRepo
      .createQueryBuilder('c')
      .select('COALESCE(SUM(c.wallet_balance), 0)', 'total')
      .addSelect('COALESCE(AVG(c.wallet_balance), 0)', 'avg')
      .getRawOne<{ total: string; avg: string }>();
    return { total: num(row?.total), avg: num(row?.avg) };
  }

  private async topCustomers(limit: number) {
    const rows = await this.orderRepo
      .createQueryBuilder('o')
      .select('o.customer_id', 'customerId')
      .addSelect('COUNT(o.id)', 'orders')
      .addSelect("COALESCE(SUM(o.total_amount), 0)", 'spent')
      .where('o.status NOT IN (:...excluded)', {
        excluded: [OrderStatus.CANCELLED, OrderStatus.REFUNDED],
      })
      .groupBy('o.customer_id')
      .orderBy('orders', 'DESC')
      .limit(limit)
      .getRawMany<{ customerId: string; orders: string; spent: string }>();
    return rows.map((r) => ({
      customerId: r.customerId,
      orders: num(r.orders),
      spent: num(r.spent),
    }));
  }

  // ─── Delivery ──────────────────────────────────────────────────────────────

  async getDeliveryAnalytics() {
    const [agents, deliveryCounts, byStatus, topAgents] = await Promise.all([
      this.agentCounts(),
      this.deliveryCounts(),
      this.deliveryByStatus(),
      this.topAgents(10),
    ]);
    return {
      data: { agents, deliveries: deliveryCounts, byStatus, topAgents },
      message: 'تم استرجاع تحليلات التوصيل.',
    };
  }

  private async agentCounts() {
    const [total, active, pending, suspended, offline] = await Promise.all([
      this.agentRepo.count(),
      this.agentRepo.count({ where: { status: AgentStatus.ACTIVE } }),
      this.agentRepo.count({ where: { status: AgentStatus.PENDING_APPROVAL } }),
      this.agentRepo.count({ where: { status: AgentStatus.SUSPENDED } }),
      this.agentRepo.count({ where: { status: AgentStatus.OFFLINE } }),
    ]);
    return { total, active, pending, suspended, offline };
  }

  private async deliveryCounts() {
    const today = startOfDay(new Date());
    const month = daysAgo(30);

    const [total, completed, failed, todayCompleted, monthCompleted, earningsRow] =
      await Promise.all([
        this.deliveryRepo.count(),
        this.deliveryRepo.count({ where: { status: DeliveryStatus.DELIVERED } }),
        this.deliveryRepo.count({ where: { status: DeliveryStatus.FAILED } }),
        this.deliveryRepo
          .createQueryBuilder('d')
          .where('d.status = :s', { s: DeliveryStatus.DELIVERED })
          .andWhere('d.delivered_at >= :d', { d: today })
          .getCount(),
        this.deliveryRepo
          .createQueryBuilder('d')
          .where('d.status = :s', { s: DeliveryStatus.DELIVERED })
          .andWhere('d.delivered_at >= :d', { d: month })
          .getCount(),
        this.deliveryRepo
          .createQueryBuilder('d')
          .select('COALESCE(SUM(d.agent_earnings), 0)', 'total')
          .where('d.status = :s', { s: DeliveryStatus.DELIVERED })
          .getRawOne<{ total: string }>(),
      ]);

    return {
      total,
      completed,
      failed,
      todayCompleted,
      monthCompleted,
      totalAgentEarnings: num(earningsRow?.total),
    };
  }

  private async deliveryByStatus() {
    const rows = await this.deliveryRepo
      .createQueryBuilder('d')
      .select('d.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('d.status')
      .getRawMany<{ status: string; count: string }>();
    return rows.map((r) => ({ status: r.status, count: num(r.count) }));
  }

  private async topAgents(limit: number) {
    const rows = await this.deliveryRepo
      .createQueryBuilder('d')
      .innerJoin(DeliveryAgentRead, 'a', 'a.id = d.agent_id')
      .select('a.id', 'id')
      .addSelect("(a.first_name || ' ' || a.last_name)", 'name')
      .addSelect('COUNT(d.id)', 'deliveries')
      .addSelect('COALESCE(SUM(d.agent_earnings), 0)', 'earnings')
      .where('d.status = :s', { s: DeliveryStatus.DELIVERED })
      .groupBy('a.id')
      .orderBy('deliveries', 'DESC')
      .limit(limit)
      .getRawMany<{ id: string; name: string; deliveries: string; earnings: string }>();
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      deliveries: num(r.deliveries),
      earnings: num(r.earnings),
    }));
  }

  // ─── Users (auth) ──────────────────────────────────────────────────────────

  private async userCounts() {
    const rows = await this.userRepo
      .createQueryBuilder('u')
      .select('u.role', 'role')
      .addSelect('COUNT(*)', 'count')
      .groupBy('u.role')
      .getRawMany<{ role: UserRole; count: string }>();

    const byRole: Record<string, number> = {};
    for (const r of rows) byRole[r.role] = num(r.count);

    const [total, active, suspended, banned] = await Promise.all([
      this.userRepo.count(),
      this.userRepo.count({ where: { status: UserStatus.ACTIVE } }),
      this.userRepo.count({ where: { status: UserStatus.SUSPENDED } }),
      this.userRepo.count({ where: { status: UserStatus.BANNED } }),
    ]);

    return { total, active, suspended, banned, byRole };
  }

  // ─── Payments / Transactions ───────────────────────────────────────────────

  async getPaymentsAnalytics() {
    const [totals, byMethod] = await Promise.all([
      this.paymentTotals(),
      this.paymentByMethod(),
    ]);
    return {
      data: { ...totals, byMethod },
      message: 'تم استرجاع تحليلات المدفوعات.',
    };
  }

  private async paymentTotals() {
    const month = daysAgo(30);
    const [allRow, monthRow, paidOrders, unpaidOrders] = await Promise.all([
      this.txRepo
        .createQueryBuilder('t')
        .select('COALESCE(SUM(t.amount), 0)', 'sum')
        .addSelect('COUNT(*)', 'count')
        .getRawOne<{ sum: string; count: string }>(),
      this.txRepo
        .createQueryBuilder('t')
        .select('COALESCE(SUM(t.amount), 0)', 'sum')
        .where('t.created_at >= :d', { d: month })
        .getRawOne<{ sum: string }>(),
      this.orderRepo.count({ where: { paymentStatus: PaymentStatus.PAID } }),
      this.orderRepo.count({ where: { paymentStatus: PaymentStatus.UNPAID } }),
    ]);
    return {
      transactionTotal: num(allRow?.sum),
      transactionCount: num(allRow?.count),
      transactionMonth: num(monthRow?.sum),
      paidOrders,
      unpaidOrders,
    };
  }

  private async paymentByMethod() {
    const rows = await this.txRepo
      .createQueryBuilder('t')
      .select('t.type', 'method')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(t.amount), 0)', 'total')
      .groupBy('t.type')
      .getRawMany<{ method: string; count: string; total: string }>();
    return rows.map((r) => ({
      method: r.method,
      count: num(r.count),
      total: num(r.total),
    }));
  }
}
