import { Controller, Get, UseGuards } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { ManagerServiceService } from './manager-service.service';
import { AnalyticsService } from './analytics/analytics.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';

@Controller()
export class ManagerServiceController {
  constructor(
    private readonly service: ManagerServiceService,
    private readonly analytics: AnalyticsService,
  ) {}

  @EventPattern('user.manager.created')
  handleManagerCreated(@Payload() data: { userId: string; fullName: string }) {
    return this.service.createManager(data);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Public — unauthenticated landing-page stats
  // ═══════════════════════════════════════════════════════════════════════════

  /** GET /api/manager/public/stats — aggregate counts for the login/landing page */
  @Get('public/stats')
  getPublicStats() {
    return this.analytics.getPublicStats();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Analytics — manager only, platform-wide
  // ═══════════════════════════════════════════════════════════════════════════

  /** GET /api/manager/analytics — top-level overview across the platform */
  @Get('analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('manager')
  getOverview() {
    return this.analytics.getOverview();
  }

  /** GET /api/manager/analytics/orders */
  @Get('analytics/orders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('manager')
  getOrders() {
    return this.analytics.getOrdersAnalytics();
  }

  /** GET /api/manager/analytics/revenue */
  @Get('analytics/revenue')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('manager')
  getRevenue() {
    return this.analytics.getRevenueAnalytics();
  }

  /** GET /api/manager/analytics/restaurants */
  @Get('analytics/restaurants')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('manager')
  getRestaurants() {
    return this.analytics.getRestaurantsAnalytics();
  }

  /** GET /api/manager/analytics/customers */
  @Get('analytics/customers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('manager')
  getCustomers() {
    return this.analytics.getCustomersAnalytics();
  }

  /** GET /api/manager/analytics/delivery */
  @Get('analytics/delivery')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('manager')
  getDelivery() {
    return this.analytics.getDeliveryAnalytics();
  }

  /** GET /api/manager/analytics/payments */
  @Get('analytics/payments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('manager')
  getPayments() {
    return this.analytics.getPaymentsAnalytics();
  }
}
