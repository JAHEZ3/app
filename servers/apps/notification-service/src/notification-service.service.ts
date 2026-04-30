import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';

@Injectable()
export class NotificationServiceService {
  private readonly logger = new Logger(NotificationServiceService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
  ) {}

  async create(userId: string, type: string, title: string, body?: string, data?: object) {
    const n = await this.repo.save(
      this.repo.create({ userId, type, title, body, data }),
    );
    this.logger.log(`Notification created for ${userId}: ${type}`);
    return n;
  }

  async getForUser(userId: string, page = 1, limit = 20) {
    const [items, total] = await this.repo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, unread: items.filter((n) => !n.isRead).length };
  }

  async markRead(userId: string, notificationId: string) {
    await this.repo.update({ id: notificationId, userId }, { isRead: true });
  }

  async markAllRead(userId: string) {
    await this.repo.update({ userId, isRead: false }, { isRead: true });
  }
}
