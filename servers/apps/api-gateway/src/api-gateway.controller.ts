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
