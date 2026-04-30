import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NotificationServiceService } from './notification-service.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { NOTIFICATION_QUEUE, JOBS } from './queue/queue.constants';

@Injectable()
class JwtGuard implements CanActivate {
  constructor(private jwt: JwtService, private config: ConfigService) {}
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const token = (req.headers['authorization'] ?? '').replace('Bearer ', '');
    if (!token) throw new UnauthorizedException();
    req.user = this.jwt.verify(token, { secret: this.config.get('JWT_ACCESS_SECRET') });
    return true;
  }
}

@Controller()
export class NotificationServiceController {
  constructor(
    private readonly service: NotificationServiceService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @InjectQueue(NOTIFICATION_QUEUE) private readonly notificationQueue: Queue,
  ) {}

  // ─── REST endpoints ───────────────────────────────────────────────────────

  @Get('notifications')
  @UseGuards(JwtGuard)
  async list(@Query('page') page: number, @Query('limit') limit: number, ctx: any) {
    const userId = ctx?.user?.sub;
    return this.service.getForUser(userId, page, limit);
  }

  @Patch('notifications/:id/read')
  @UseGuards(JwtGuard)
  async markRead(@Param('id') id: string, ctx: any) {
    await this.service.markRead(ctx?.user?.sub, id);
    return { message: 'تم تحديد الإشعار كمقروء' };
  }

  @Patch('notifications/read-all')
  @UseGuards(JwtGuard)
  async markAllRead(ctx: any) {
    await this.service.markAllRead(ctx?.user?.sub);
    return { message: 'تم تحديد جميع الإشعارات كمقروءة' };
  }

  // ─── NATS event handlers — enqueue rather than process inline ────────────

  @EventPattern('order.created')
  async onOrderCreated(@Payload() data: any) {
    await this.notificationQueue.add(
      JOBS.SEND_NOTIFICATION,
      { type: 'order.created', payload: data },
      { jobId: `notif:order.created:${data.orderId}` },
    );
  }

  @EventPattern('order.status.changed')
  async onStatusChanged(@Payload() data: any) {
    await this.notificationQueue.add(
      JOBS.SEND_NOTIFICATION,
      { type: 'order.status.changed', payload: data },
      // No deduplication key here — each status change is a distinct notification
    );
  }

  @EventPattern('order.delivery.assigned')
  async onDeliveryAssigned(@Payload() data: any) {
    await this.notificationQueue.add(
      JOBS.SEND_NOTIFICATION,
      { type: 'order.delivery.assigned', payload: data },
      { jobId: `notif:delivery.assigned:${data.orderId}` },
    );
  }
}
