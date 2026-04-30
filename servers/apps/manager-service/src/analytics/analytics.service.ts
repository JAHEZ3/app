import { Injectable } from '@nestjs/common';
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
