import { Controller, Get } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { ApiGatewayService } from './api-gateway.service';
import { SocketGateway } from './gateway/socket.gateway';

@Controller()
export class ApiGatewayController {
  constructor(
    private readonly apiGatewayService: ApiGatewayService,
    private readonly socketGateway: SocketGateway,
  ) {}

  @Get()
  healthCheck() {
    return { status: 'ok', service: 'api-gateway' };
  }

  // ─── Order Events ────────────────────────────────────────────────────

  @EventPattern('order.created')
  async handleOrderCreated(@Payload() data: any) {
    // Cache order metadata for socket join authorization
    await this.socketGateway.cacheOrderMeta(data.orderId, {
      customerId: data.customerId,
      restaurantId: data.restaurantId,
      ownerUserId: data.ownerUserId,
      deliveryAgentId: null,
    });

    // Notify restaurant room + all managers
    if (data.restaurantId) {
      this.socketGateway.emitToRoom(`restaurant:${data.restaurantId}`, 'order:new', data);
    }
    if (data.ownerUserId) {
      this.socketGateway.emitToUser(data.ownerUserId, 'order:new', data);
    }
    this.socketGateway.broadcastToManagers('order:new', data);
  }

  @EventPattern('order.status.changed')
  handleOrderStatusChanged(@Payload() data: any) {
    // Notify all parties in the order room
    this.socketGateway.emitToRoom(`order:${data.orderId}`, 'order:status', data);

    // Also notify each party directly
    if (data.customerId) this.socketGateway.emitToUser(data.customerId, 'order:status', data);
    if (data.deliveryAgentId) this.socketGateway.emitToUser(data.deliveryAgentId, 'order:status', data);
    if (data.ownerUserId) this.socketGateway.emitToUser(data.ownerUserId, 'order:status', data);
    this.socketGateway.broadcastToManagers('order:status', data);
  }

  /**
   * Payment status flip (unpaid ↔ paid) fired by order-service when a
   * restaurant/manager verifies the customer's bank-transfer proof.
   * Broadcasts to the order room so the customer's tracking screen + the
   * restaurant's dashboard both refresh without a manual reload. Also pushed
   * directly to the customer + the assigned agent so they get the update
   * even if their socket isn't in the order room yet.
   */
  @EventPattern('order.payment.status.changed')
  handleOrderPaymentStatusChanged(@Payload() data: any) {
    this.socketGateway.emitToRoom(
      `order:${data.orderId}`,
      'order:payment:status',
      data,
    );
    if (data.customerId) {
      this.socketGateway.emitToUser(data.customerId, 'order:payment:status', data);
    }
    if (data.deliveryAgentId) {
      this.socketGateway.emitToUser(
        data.deliveryAgentId,
        'order:payment:status',
        data,
      );
    }
    if (data.ownerUserId) {
      this.socketGateway.emitToUser(data.ownerUserId, 'order:payment:status', data);
    }
    this.socketGateway.broadcastToManagers('order:payment:status', data);
  }

  /**
   * Driver tapped Accept on an incoming assignment. Tell the order room +
   * customer + restaurant so the "waiting for driver" state can flip into
   * normal tracking.
   */
  @EventPattern('order.delivery.accepted')
  handleDeliveryAccepted(@Payload() data: any) {
    this.socketGateway.emitToRoom(
      `order:${data.orderId}`,
      'order:delivery:accepted',
      data,
    );
    if (data.customerId) {
      this.socketGateway.emitToUser(data.customerId, 'order:delivery:accepted', data);
    }
    if (data.ownerUserId) {
      this.socketGateway.emitToUser(data.ownerUserId, 'order:delivery:accepted', data);
    }
    this.socketGateway.broadcastToManagers('order:delivery:accepted', data);
  }

  /**
   * Driver declined. `deliveryAgentId` is already wiped on the order, so the
   * customer's UI should flip back to the "pick a driver" state. We push to
   * the rejecting agent's own user room too, so any retry of the same call
   * from a stale UI gets a fresh state.
   */
  @EventPattern('order.delivery.rejected')
  handleDeliveryRejected(@Payload() data: any) {
    this.socketGateway.emitToRoom(
      `order:${data.orderId}`,
      'order:delivery:rejected',
      data,
    );
    if (data.customerId) {
      this.socketGateway.emitToUser(data.customerId, 'order:delivery:rejected', data);
    }
    if (data.deliveryAgentId) {
      this.socketGateway.emitToUser(
        data.deliveryAgentId,
        'order:delivery:rejected',
        data,
      );
    }
    if (data.ownerUserId) {
      this.socketGateway.emitToUser(data.ownerUserId, 'order:delivery:rejected', data);
    }
    this.socketGateway.broadcastToManagers('order:delivery:rejected', data);
  }

  @EventPattern('order.delivery.assigned')
  async handleDeliveryAssigned(@Payload() data: any) {
    // Update cached order metadata so the newly assigned agent can join via WebSocket
    if (data.deliveryAgentId) {
      await this.socketGateway.updateOrderMetaDelivery(data.orderId, data.deliveryAgentId);
    }

    this.socketGateway.emitToRoom(`order:${data.orderId}`, 'order:delivery:assigned', data);
    if (data.deliveryAgentId) {
      this.socketGateway.emitToUser(data.deliveryAgentId, 'order:delivery:assigned', data);
    }
    if (data.customerId) {
      this.socketGateway.emitToUser(data.customerId, 'order:delivery:assigned', data);
    }
  }

  // ─── Chat Events ─────────────────────────────────────────────────────

  @EventPattern('chat.message.sent')
  handleChatMessage(@Payload() data: any) {
    this.socketGateway.emitToRoom(`order:${data.orderId}`, 'chat:message', data);
  }

  // ─── Delivery Location Events ─────────────────────────────────────────

  @EventPattern('delivery.location.updated')
  handleLocationUpdate(@Payload() data: any) {
    if (data.orderId) {
      this.socketGateway.emitToRoom(`order:${data.orderId}`, 'delivery:location', data);
    }
  }

  // ─── Notification Events ──────────────────────────────────────────────

  @EventPattern('notification.push')
  handlePushNotification(@Payload() data: { userId: string; event: string; payload: any }) {
    this.socketGateway.emitToUser(data.userId, data.event, data.payload);
  }
}
