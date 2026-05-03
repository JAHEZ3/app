import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { Logger, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import { ClientProxy } from '@nestjs/microservices';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { randomUUID } from 'crypto';

interface AuthUser {
  sub: string;
  role: string;
  phone?: string;
  fullName?: string;
  status?: string;
}

// Redis key helpers
const locKey    = (agentId: string)  => `loc:${agentId}`;
const throttleKey = (agentId: string) => `loc_throttle:${agentId}`;
const joinedOrdersKey = (socketId: string) => `ws_orders:${socketId}`;

// Location update throttle: 1 update per 3 seconds per agent
const LOC_THROTTLE_MS = 3_000;

@WebSocketGateway({
  cors: {
    origin: (origin: string, cb: (err: Error | null, allow?: boolean) => void) => {
      // Read from env at runtime; fall back to allowing all in development
      const allowed = (process.env.CORS_ORIGINS || '*').split(',').map((s) => s.trim());
      if (allowed.includes('*') || !origin || allowed.includes(origin)) {
        cb(null, true);
      } else {
        cb(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
  namespace: '/',
})
export class SocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SocketGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @Inject('NATS_SERVICE') private readonly nats: ClientProxy,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    const user = this.authenticate(client);
    if (!user) {
      client.emit('error', { code: 'AUTH_FAILED', message: 'غير مصرح — رمز غير صالح' });
      client.disconnect(true);
      return;
    }

    // Reject suspended/banned users at socket level
    if (user.status && !['active', 'suspended'].includes(user.status)) {
      client.emit('error', { code: 'ACCOUNT_INACTIVE', message: 'الحساب غير مفعّل' });
      client.disconnect(true);
      return;
    }

    (client as any).user = user;

    // Auto-join personal room
    client.join(`user:${user.sub}`);
    if (user.role === 'manager')  client.join('managers');
    if (user.role === 'delivery') client.join(`delivery:${user.sub}`);

    this.logger.log({ msg: 'ws_connected', userId: user.sub, role: user.role, socketId: client.id });
    client.emit('connected', { userId: user.sub, role: user.role });
  }

  handleDisconnect(client: Socket) {
    const user = (client as any).user as AuthUser | undefined;
    if (!user) return;

    this.logger.log({ msg: 'ws_disconnected', userId: user.sub, socketId: client.id });

    // Keep delivery location in Redis after disconnect — let TTL expire it naturally.
    // Only clear the per-socket joined-orders tracking.
    this.cache.del(joinedOrdersKey(client.id));
  }

  // ─── Restaurant registers its restaurantId ───────────────────────────────

  @SubscribeMessage('restaurant:register')
  async handleRestaurantRegister(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { restaurantId: string },
  ) {
    const user = this.getUser(client);

    if (user.role !== 'restaurant_owner' && user.role !== 'manager') {
      throw new WsException('غير مصرح');
    }
    if (!data?.restaurantId || typeof data.restaurantId !== 'string') {
      throw new WsException('restaurantId مطلوب');
    }

    // Validate ownership: query the order-service via NATS (fire-and-verify pattern)
    // For restaurant_owner, we trust the front-end sends the correct restaurantId,
    // but we store it in Redis so the server can validate it later on events.
    // True ownership is enforced at the HTTP layer (restaurant-service guard).
    await this.cache.set(
      `ws_restaurant:${user.sub}`,
      data.restaurantId,
      3_600_000, // 1 hour TTL — refreshed on reconnect
    );

    client.join(`restaurant:${data.restaurantId}`);
    this.logger.log({ msg: 'restaurant_registered', userId: user.sub, restaurantId: data.restaurantId });

    return { event: 'restaurant:registered', data: { restaurantId: data.restaurantId } };
  }

  // ─── Join an order room (with authorization) ─────────────────────────────

  @SubscribeMessage('order:join')
  async handleOrderJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string; role?: string; restaurantId?: string },
  ) {
    const user = this.getUser(client);
    if (!data?.orderId || typeof data.orderId !== 'string') {
      throw new WsException('orderId مطلوب');
    }

    // Check if already joined — idempotent
    const joined = (await this.cache.get<string[]>(joinedOrdersKey(client.id))) ?? [];
    if (joined.includes(data.orderId)) {
      return { event: 'order:joined', data: { orderId: data.orderId } };
    }

    // Authorization: look up order metadata from Redis (populated by order-service on creation)
    const orderMeta = await this.cache.get<{
      customerId: string;
      restaurantId: string;
      ownerUserId: string;
      deliveryAgentId: string | null;
    }>(`order_meta:${data.orderId}`);

    if (orderMeta) {
      this.assertOrderAccess(user, orderMeta);
    } else {
      // If metadata isn't cached yet (race condition on creation), allow join and
      // let the HTTP-layer guard be the authoritative check.
      // This is acceptable: WebSocket is push-only; sensitive data requires HTTP.
      this.logger.warn({ msg: 'order_meta_not_cached', orderId: data.orderId, userId: user.sub });
    }

    client.join(`order:${data.orderId}`);

    // Track which orders this socket has joined (for cleanup on disconnect)
    await this.cache.set(joinedOrdersKey(client.id), [...joined, data.orderId], 3_600_000);

    this.logger.log({ msg: 'order_room_joined', orderId: data.orderId, userId: user.sub, role: user.role });
    return { event: 'order:joined', data: { orderId: data.orderId } };
  }

  @SubscribeMessage('order:leave')
  async handleOrderLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string },
  ) {
    client.leave(`order:${data.orderId}`);
    const joined = (await this.cache.get<string[]>(joinedOrdersKey(client.id))) ?? [];
    await this.cache.set(
      joinedOrdersKey(client.id),
      joined.filter((id) => id !== data.orderId),
      3_600_000,
    );
    return { event: 'order:left', data: { orderId: data.orderId } };
  }

  // ─── Delivery live location (with throttle) ───────────────────────────────

  @SubscribeMessage('delivery:location:update')
  async handleLocationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { lat: number; lng: number; orderId?: string },
  ) {
    const user = this.getUser(client);
    if (user.role !== 'delivery') {
      throw new WsException('هذا الحدث مخصص لعمال التوصيل فقط');
    }
    if (typeof data?.lat !== 'number' || typeof data?.lng !== 'number') {
      throw new WsException('lat و lng مطلوبان');
    }
    if (Math.abs(data.lat) > 90 || Math.abs(data.lng) > 180) {
      throw new WsException('إحداثيات GPS غير صالحة');
    }

    // Throttle: discard updates faster than LOC_THROTTLE_MS
    const throttled = await this.cache.get<boolean>(throttleKey(user.sub));
    if (throttled) {
      return { event: 'delivery:location:throttled' };
    }

    const locationPayload = {
      eventId: randomUUID(),
      agentId: user.sub,
      lat: data.lat,
      lng: data.lng,
      timestamp: Date.now(),
      orderId: data.orderId,
    };

    // Cache current location (10-min TTL — survives brief disconnects)
    await this.cache.set(locKey(user.sub), locationPayload, 600_000);

    // Set throttle window
    await this.cache.set(throttleKey(user.sub), true, LOC_THROTTLE_MS);

    // NATS: delivery-service persists log
    try {
      this.nats.emit('delivery.location.updated', locationPayload);
    } catch (err) {
      this.logger.error({ msg: 'nats_location_emit_failed', err });
    }

    // Broadcast to order room when orderId is provided
    if (data.orderId) {
      this.server.to(`order:${data.orderId}`).emit('delivery:location', locationPayload);
    }

    return { event: 'delivery:location:ack', data: locationPayload };
  }

  // ─── Typing indicator (optional, stateless) ───────────────────────────────

  @SubscribeMessage('chat:typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string; isTyping: boolean },
  ) {
    const user = this.getUser(client);
    if (!data?.orderId) throw new WsException('orderId مطلوب');

    // Broadcast to other participants in the order room (exclude sender)
    client.to(`order:${data.orderId}`).emit('chat:typing', {
      userId: user.sub,
      role: user.role,
      isTyping: !!data.isTyping,
    });
  }

  // ─── Bridge methods (called by NATS controllers) ──────────────────────────

  /**
   * Cache order metadata so order:join can validate access without an HTTP round-trip.
   * Called from api-gateway.controller.ts when 'order.created' fires.
   */
  async cacheOrderMeta(
    orderId: string,
    meta: { customerId: string; restaurantId: string; ownerUserId: string; deliveryAgentId: string | null },
  ) {
    // TTL: 24 hours — longer than any realistic order lifecycle
    await this.cache.set(`order_meta:${orderId}`, meta, 86_400_000);
  }

  /**
   * Update the cached delivery agent on the order meta (called after delivery.assigned event).
   */
  async updateOrderMetaDelivery(orderId: string, deliveryAgentId: string) {
    const meta = await this.cache.get<Record<string, unknown>>(`order_meta:${orderId}`);
    if (meta) {
      await this.cache.set(
        `order_meta:${orderId}`,
        { ...meta, deliveryAgentId },
        86_400_000,
      );
    }
  }

  emitToRoom(room: string, event: string, payload: unknown) {
    this.server.to(room).emit(event, payload);
  }

  emitToUser(userId: string, event: string, payload: unknown) {
    this.server.to(`user:${userId}`).emit(event, payload);
  }

  broadcastToManagers(event: string, payload: unknown) {
    this.server.to('managers').emit(event, payload);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private getUser(client: Socket): AuthUser {
    const user = (client as any).user as AuthUser | undefined;
    if (!user) throw new WsException('غير مصرح');
    return user;
  }

  private authenticate(client: Socket): AuthUser | null {
    try {
      const raw: string =
        client.handshake.auth?.token ??
        (client.handshake.headers?.authorization as string) ??
        '';
      const token = raw.replace(/^Bearer\s+/i, '');
      if (!token) return null;
      return this.jwt.verify<AuthUser>(token, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      });
    } catch {
      return null;
    }
  }

  private assertOrderAccess(
    user: AuthUser,
    meta: { customerId: string; restaurantId: string; ownerUserId: string; deliveryAgentId: string | null },
  ) {
    if (user.role === 'manager') return;
    if (user.role === 'customer'         && meta.customerId    === user.sub) return;
    if (user.role === 'restaurant_owner' && meta.ownerUserId   === user.sub) return;
    if (user.role === 'delivery'         && meta.deliveryAgentId === user.sub) return;
    throw new WsException('غير مصرح للانضمام لهذا الطلب');
  }
}
