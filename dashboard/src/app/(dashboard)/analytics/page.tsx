"use client";

import { useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import {
  useAnalyticsOverview,
  useAnalyticsOrders,
  useAnalyticsTopMeals,
  useAnalyticsCustomers,
  useAnalyticsRatings,
  useAnalyticsDelivery,
  useAnalyticsReport,
} from "@/hooks/useAnalytics";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import {
  TrendingUp, ShoppingBag, Star, Users, CreditCard,
  Truck, CheckCircle2, XCircle, Clock, Repeat, Award, Wallet,
  ArrowUp, ArrowDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CardSkeleton, Skeleton } from "@/components/ui/skeleton";
import { AnimatedNumber } from "@/components/ui/animated-number";
import type {
  OrderStatus, PaymentMethod, DeliveryStatus, ReportPeriod,
} from "@/types/analytics.types";

const PERIODS: { value: ReportPeriod; label: string }[] = [
  { value: "daily", label: "يومي" },
  { value: "weekly", label: "أسبوعي" },
  { value: "monthly", label: "شهري" },
];

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "معلق",
  confirmed: "مؤكد",
  preparing: "قيد التحضير",
  ready_for_pickup: "جاهز للاستلام",
  out_for_delivery: "قيد التوصيل",
  delivered: "تم التوصيل",
  cancelled: "ملغي",
  refunded: "مسترد",
};

const STATUS_COLOR: Record<OrderStatus, string> = {
  pending: "#F59E0B",
  confirmed: "#6366F1",
  preparing: "#3B82F6",
  ready_for_pickup: "#14B8A6",
  out_for_delivery: "#8B5CF6",
  delivered: "#10B981",
  cancelled: "#EF4444",
  refunded: "#6B7280",
};

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  cash_on_delivery: "الدفع عند الاستلام",
  card: "بطاقة",
  online: "الدفع الإلكتروني",
};

const PAYMENT_COLOR: Record<PaymentMethod, string> = {
  cash_on_delivery: "#10B981",
  card: "#6366F1",
  online: "#FF6B00",
};

const DELIVERY_LABEL: Record<DeliveryStatus, string> = {
  assigned: "مُسند",
  heading_to_restaurant: "إلى المطعم",
  picked_up: "تم الاستلام",
  heading_to_customer: "إلى العميل",
  delivered: "تم التوصيل",
  failed: "فشل",
};

function formatDay(d: string) {
  const date = new Date(d);
  return new Intl.DateTimeFormat("ar-SA", { day: "numeric", month: "short" }).format(date);
}

function StatCard({
  icon, label, value, sub, color, delay = 0,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: string;
  color: string;
  delay?: number;
}) {
  return (
    <div
      className="bg-white rounded-xl border border-border p-5 hover:shadow-md transition-shadow animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-black text-foreground tabular-nums">{value}</p>
      <p className="text-xs font-medium text-muted-foreground mt-1">{label}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function SectionCard({ title, children, className = "" }: {
  title: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`bg-white rounded-xl border border-border p-5 ${className}`}>
      <h3 className="text-base font-bold text-foreground mb-4">{title}</h3>
      {children}
    </div>
  );
}

const tooltipStyle = {
  fontFamily: "Cairo",
  fontSize: 12,
  borderRadius: 12,
  border: "1px solid #e5e7eb",
};

function formatBucket(bucket: string, period: ReportPeriod) {
  const date = new Date(bucket);
  if (period === "daily") {
    return new Intl.DateTimeFormat("ar-SA", { hour: "numeric", hour12: true }).format(date);
  }
  if (period === "monthly") {
    return new Intl.DateTimeFormat("ar-SA", { month: "short", day: "numeric" }).format(date);
  }
  return new Intl.DateTimeFormat("ar-SA", { weekday: "short", day: "numeric" }).format(date);
}

function GrowthBadge({ value }: { value: number }) {
  const positive = value >= 0;
  return (
    <span
      className={cn(
        "text-[11px] font-bold inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full tabular-nums",
        positive ? "text-success bg-success-light" : "text-error bg-error-light",
      )}
    >
      {positive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
      {Math.abs(value).toFixed(1)}٪
    </span>
  );
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<ReportPeriod>("daily");

  const overviewQ = useAnalyticsOverview();
  const ordersQ = useAnalyticsOrders();
  const topMealsQ = useAnalyticsTopMeals();
  const customersQ = useAnalyticsCustomers();
  const ratingsQ = useAnalyticsRatings();
  const deliveryQ = useAnalyticsDelivery();
  const reportQ = useAnalyticsReport(period);

  const overview = overviewQ.data;
  const orders = ordersQ.data;
  const topMeals = topMealsQ.data?.top ?? [];
  const customers = customersQ.data;
  const ratings = ratingsQ.data;
  const delivery = deliveryQ.data;
  const report = reportQ.data;

  // Build a 0–23 hourly series filling missing hours with 0
  const hourlySeries = useMemo(() => {
    const map = new Map<number, number>();
    (orders?.byHour ?? []).forEach((h) => map.set(h.hour, h.count));
    return Array.from({ length: 24 }, (_, h) => ({
      hour: `${h}`,
      orders: map.get(h) ?? 0,
    }));
  }, [orders?.byHour]);

  const revenueSeries = useMemo(
    () => (orders?.last30Days ?? []).map((d) => ({
      day: formatDay(d.day),
      revenue: d.revenue,
      orders: d.orders,
    })),
    [orders?.last30Days],
  );

  const statusPie = useMemo(
    () => (orders?.byStatus ?? []).map((s) => ({
      name: STATUS_LABEL[s.status] ?? s.status,
      value: s.count,
      color: STATUS_COLOR[s.status] ?? "#9CA3AF",
    })),
    [orders?.byStatus],
  );

  const paymentPie = useMemo(
    () => (orders?.byPaymentMethod ?? []).map((p) => ({
      name: PAYMENT_LABEL[p.method] ?? p.method,
      value: p.count,
      total: p.total,
      color: PAYMENT_COLOR[p.method] ?? "#9CA3AF",
    })),
    [orders?.byPaymentMethod],
  );

  const reportSeries = useMemo(
    () => (report?.breakdown ?? []).map((b) => ({
      bucket: formatBucket(b.bucket, period),
      orders: b.orders,
      revenue: b.revenue,
    })),
    [report?.breakdown, period],
  );

  const ratingDistribution = useMemo(() => {
    const map = new Map<number, number>();
    (ratings?.distribution ?? []).forEach((d) => map.set(d.stars, d.count));
    return [5, 4, 3, 2, 1].map((stars) => ({
      label: `${stars} ★`,
      count: map.get(stars) ?? 0,
    }));
  }, [ratings?.distribution]);

  const isLoadingTop = overviewQ.isLoading;

  return (
    <div className="flex flex-col h-full">
      <Header />
      <div className="flex-1 p-5 space-y-5">
        {/* Title + period selector */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-[11px] font-semibold text-primary uppercase tracking-widest mb-0.5">
              ANALYTICS
            </p>
            <h1 className="text-xl font-black text-foreground">الإحصائيات والتقارير</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {report?.label ?? "تحليل أداء مطعمك"}
            </p>
          </div>
          <div className="flex gap-1 bg-muted rounded-xl p-1">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-semibold transition-all",
                  period === p.value
                    ? "bg-white text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Summary cards */}
        {isLoadingTop ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              icon={<TrendingUp className="w-5 h-5 text-primary" />}
              color="bg-primary-light"
              label="إجمالي الإيرادات"
              value={<AnimatedNumber value={overview?.revenue.total ?? 0} format={formatCurrency} />}
              sub={`اليوم: ${formatCurrency(overview?.revenue.today ?? 0)}`}
              delay={0}
            />
            <StatCard
              icon={<ShoppingBag className="w-5 h-5 text-success" />}
              color="bg-success-light"
              label="إجمالي الطلبات"
              value={<AnimatedNumber value={overview?.orders.total ?? 0} />}
              sub={`اليوم: ${overview?.orders.today ?? 0}`}
              delay={60}
            />
            <StatCard
              icon={<Wallet className="w-5 h-5 text-info" />}
              color="bg-info-light"
              label="متوسط قيمة الطلب"
              value={<AnimatedNumber value={overview?.revenue.avgOrderValue ?? 0} format={formatCurrency} />}
              sub={`${overview?.revenue.paidOrders ?? 0} طلب مدفوع`}
              delay={120}
            />
            <StatCard
              icon={<Star className="w-5 h-5 text-amber-500" />}
              color="bg-amber-50"
              label="متوسط تقييم الطعام"
              value={<><AnimatedNumber value={overview?.ratings.avgFoodRating ?? 0} decimals={1} /> / 5</>}
              sub={`${overview?.ratings.totalRatings ?? 0} تقييم`}
              delay={180}
            />
          </div>
        )}

        {/* Secondary KPI row */}
        {overview && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              icon={<CheckCircle2 className="w-5 h-5 text-success" />}
              color="bg-success-light"
              label="نسبة إتمام الطلبات"
              value={<><AnimatedNumber value={overview.rates.completionRate} decimals={1} suffix="٪" /></>}
              sub={`${overview.orders.delivered} طلب مكتمل`}
              delay={240}
            />
            <StatCard
              icon={<XCircle className="w-5 h-5 text-error" />}
              color="bg-error-light"
              label="نسبة الإلغاء"
              value={<><AnimatedNumber value={overview.rates.cancellationRate} decimals={1} suffix="٪" /></>}
              sub={`${overview.orders.cancelled} طلب ملغي`}
              delay={300}
            />
            <StatCard
              icon={<Users className="w-5 h-5 text-info" />}
              color="bg-info-light"
              label="إجمالي العملاء"
              value={<AnimatedNumber value={overview.customers.total} />}
              sub={`${overview.customers.activeLast30Days} نشط آخر ٣٠ يوم`}
              delay={360}
            />
            <StatCard
              icon={<Repeat className="w-5 h-5 text-primary" />}
              color="bg-primary-light"
              label="معدل العملاء المتكررين"
              value={<><AnimatedNumber value={overview.customers.repeatRate} decimals={1} suffix="٪" /></>}
              sub={`${overview.customers.repeatCustomers} عميل متكرر`}
              delay={420}
            />
          </div>
        )}

        {/* Report — period KPIs + bucketed chart */}
        <SectionCard title={`تقرير ${report?.label ?? PERIODS.find((p) => p.value === period)?.label}`}>
          {reportQ.isLoading && !report ? (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
              {Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : report ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
                <div className="bg-muted/40 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground">الإيرادات</p>
                    <GrowthBadge value={report.growth.revenuePct} />
                  </div>
                  <p className="text-xl font-black text-foreground tabular-nums">
                    <AnimatedNumber value={report.kpis.revenue} format={formatCurrency} />
                  </p>
                </div>
                <div className="bg-muted/40 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground">الطلبات</p>
                    <GrowthBadge value={report.growth.ordersPct} />
                  </div>
                  <p className="text-xl font-black text-foreground tabular-nums">
                    <AnimatedNumber value={report.kpis.orders} />
                  </p>
                </div>
                <div className="bg-muted/40 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground">طلبات مكتملة</p>
                    <GrowthBadge value={report.growth.deliveredPct} />
                  </div>
                  <p className="text-xl font-black text-foreground tabular-nums">
                    <AnimatedNumber value={report.kpis.delivered} />
                  </p>
                </div>
                <div className="bg-muted/40 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground">متوسط قيمة الطلب</p>
                    <GrowthBadge value={report.growth.avgOrderValuePct} />
                  </div>
                  <p className="text-xl font-black text-foreground tabular-nums">
                    <AnimatedNumber value={report.kpis.avgOrderValue} format={formatCurrency} />
                  </p>
                </div>
                <div className="bg-muted/40 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground">عملاء فريدون</p>
                    <GrowthBadge value={report.growth.customersPct} />
                  </div>
                  <p className="text-xl font-black text-foreground tabular-nums">
                    <AnimatedNumber value={report.kpis.uniqueCustomers} />
                  </p>
                </div>
              </div>

              {reportSeries.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">
                  لا توجد بيانات لهذه الفترة.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={reportSeries} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="reportRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FF6B00" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#FF6B00" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="reportOrd" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: "#6b7280", fontFamily: "Cairo" }} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="rev" tick={{ fontSize: 11, fill: "#6b7280", fontFamily: "Cairo" }} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="ord" orientation="right" tick={{ fontSize: 11, fill: "#6b7280", fontFamily: "Cairo" }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(v: number, name) =>
                        name === "revenue"
                          ? [formatCurrency(v), "الإيرادات"]
                          : [v, "الطلبات"]
                      }
                    />
                    <Area yAxisId="rev" type="monotone" dataKey="revenue" stroke="#FF6B00" strokeWidth={2.5} fill="url(#reportRev)" dot={false} activeDot={{ r: 5 }} />
                    <Area yAxisId="ord" type="monotone" dataKey="orders" stroke="#10B981" strokeWidth={2} fill="url(#reportOrd)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">لا توجد بيانات.</p>
          )}
        </SectionCard>

        {/* Revenue area chart + Status pie */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <SectionCard title="الإيرادات والطلبات — آخر ٣٠ يوم" className="xl:col-span-2">
            {ordersQ.isLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : revenueSeries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">
                لا توجد بيانات بعد.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={revenueSeries} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF6B00" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#FF6B00" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="ordGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#6b7280", fontFamily: "Cairo" }} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="rev" tick={{ fontSize: 11, fill: "#6b7280", fontFamily: "Cairo" }} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="ord" orientation="right" tick={{ fontSize: 11, fill: "#6b7280", fontFamily: "Cairo" }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: number, name) =>
                      name === "revenue"
                        ? [formatCurrency(v), "الإيرادات"]
                        : [v, "الطلبات"]
                    }
                  />
                  <Area yAxisId="rev" type="monotone" dataKey="revenue" stroke="#FF6B00" strokeWidth={2.5} fill="url(#revGrad)" dot={false} activeDot={{ r: 5 }} />
                  <Area yAxisId="ord" type="monotone" dataKey="orders" stroke="#10B981" strokeWidth={2} fill="url(#ordGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </SectionCard>

          <SectionCard title="توزيع الطلبات حسب الحالة">
            {ordersQ.isLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : statusPie.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">لا توجد طلبات.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={statusPie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={80}>
                    {statusPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Legend formatter={(v) => <span style={{ fontFamily: "Cairo", fontSize: 12 }}>{v}</span>} />
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </SectionCard>
        </div>

        {/* Hourly bar + Payment pie */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <SectionCard title="الطلبات حسب الساعة (آخر ٣٠ يوم)" className="xl:col-span-2">
            {ordersQ.isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={hourlySeries} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "#6b7280", fontFamily: "Cairo" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#6b7280", fontFamily: "Cairo" }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: number) => [v, "طلب"]}
                    labelFormatter={(h) => `الساعة ${h}:00`}
                  />
                  <Bar dataKey="orders" fill="#FF6B00" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </SectionCard>

          <SectionCard title="طريقة الدفع">
            {ordersQ.isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : paymentPie.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">لا توجد بيانات.</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={paymentPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}>
                      {paymentPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(v: number) => [v, "طلب"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {paymentPie.map((p) => (
                    <div key={p.name} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                        <span className="font-medium">{p.name}</span>
                      </span>
                      <span className="font-bold">{formatCurrency(p.total)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </SectionCard>
        </div>

        {/* Top meals + Top customers */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <SectionCard title="أكثر الوجبات مبيعًا">
            {topMealsQ.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : topMeals.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">لا توجد مبيعات بعد.</p>
            ) : (
              <div className="space-y-3">
                {topMeals.slice(0, 10).map((m, i) => {
                  const max = topMeals[0]?.quantity || 1;
                  const pct = (m.quantity / max) * 100;
                  return (
                    <div key={m.mealId} className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-sm font-semibold truncate">{m.name}</p>
                          <span className="text-xs text-muted-foreground shrink-0 mr-2">
                            {m.quantity} قطعة · {m.orders} طلب
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs font-bold text-primary shrink-0 tabular-nums">
                            <AnimatedNumber value={m.revenue} format={formatCurrency} />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          <SectionCard title="أعلى العملاء طلبًا">
            {customersQ.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : !customers?.top.length ? (
              <p className="text-sm text-muted-foreground text-center py-8">لا يوجد عملاء بعد.</p>
            ) : (
              <div className="space-y-3">
                {customers.top.slice(0, 10).map((c, i) => (
                  <div key={c.customerId} className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">
                        \u200F{c.customerId.slice(0, 8)}…
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {c.orders} طلب
                      </p>
                    </div>
                    <span className="text-sm font-bold text-primary tabular-nums">
                      <AnimatedNumber value={c.spent} format={formatCurrency} />
                    </span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Ratings + Delivery */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <SectionCard title="التقييمات">
            {ratingsQ.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center">
                    <p className="text-2xl font-black flex items-center justify-center gap-1 tabular-nums">
                      <Award className="w-5 h-5 text-amber-500" />
                      <AnimatedNumber value={ratings?.avgFoodRating ?? 0} decimals={1} />
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">تقييم الطعام</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-black flex items-center justify-center gap-1 tabular-nums">
                      <Truck className="w-5 h-5 text-info" />
                      <AnimatedNumber value={ratings?.avgDeliveryRating ?? 0} decimals={1} />
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">تقييم التوصيل</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-black tabular-nums">
                      <AnimatedNumber value={ratings?.totalRatings ?? 0} />
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">إجمالي التقييمات</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {ratingDistribution.map((r) => {
                    const total = ratings?.totalRatings ?? 0;
                    const pct = total > 0 ? (r.count / total) * 100 : 0;
                    return (
                      <div key={r.label} className="flex items-center gap-3 text-xs">
                        <span className="w-10 font-bold text-amber-600">{r.label}</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-10 text-end text-muted-foreground">{r.count}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </SectionCard>

          <SectionCard title="التوصيل">
            {deliveryQ.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-muted/40 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">إجمالي التوصيلات</p>
                    <p className="text-xl font-black tabular-nums">
                      <AnimatedNumber value={delivery?.total ?? 0} />
                    </p>
                  </div>
                  <div className="bg-muted/40 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">متوسط المسافة</p>
                    <p className="text-xl font-black tabular-nums">
                      <AnimatedNumber value={delivery?.avgDistanceKm ?? 0} decimals={1} /> <span className="text-sm font-medium">كم</span>
                    </p>
                  </div>
                  <div className="bg-success-light/50 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-success" /> مكتمل
                    </p>
                    <p className="text-xl font-black text-success tabular-nums">
                      <AnimatedNumber value={delivery?.completed ?? 0} />
                    </p>
                  </div>
                  <div className="bg-error-light/50 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <XCircle className="w-3 h-3 text-error" /> فشل
                    </p>
                    <p className="text-xl font-black text-error tabular-nums">
                      <AnimatedNumber value={delivery?.failed ?? 0} />
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  {(delivery?.byStatus ?? []).map((s) => {
                    const total = delivery?.total ?? 0;
                    const pct = total > 0 ? (s.count / total) * 100 : 0;
                    return (
                      <div key={s.status} className="flex items-center gap-3 text-xs">
                        <span className="w-28 font-medium">{DELIVERY_LABEL[s.status] ?? s.status}</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-info rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-8 text-end text-muted-foreground">{s.count}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </SectionCard>
        </div>

        {/* Revenue breakdown */}
        {overview && (
          <SectionCard title="تفاصيل الإيرادات">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-muted/40 rounded-xl p-3">
                <p className="text-xs text-muted-foreground mb-1">المجموع الفرعي</p>
                <p className="text-base font-bold tabular-nums">
                  <AnimatedNumber value={overview.revenue.subtotal} format={formatCurrency} />
                </p>
              </div>
              <div className="bg-muted/40 rounded-xl p-3">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Truck className="w-3 h-3" /> رسوم التوصيل
                </p>
                <p className="text-base font-bold tabular-nums">
                  <AnimatedNumber value={overview.revenue.deliveryFees} format={formatCurrency} />
                </p>
              </div>
              <div className="bg-muted/40 rounded-xl p-3">
                <p className="text-xs text-muted-foreground mb-1">الخصومات</p>
                <p className="text-base font-bold text-error tabular-nums">
                  -<AnimatedNumber value={overview.revenue.discounts} format={formatCurrency} />
                </p>
              </div>
              <div className="bg-primary-light rounded-xl p-3">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <CreditCard className="w-3 h-3 text-primary" /> هذا الأسبوع
                </p>
                <p className="text-base font-black text-primary tabular-nums">
                  <AnimatedNumber value={overview.revenue.week} format={formatCurrency} />
                </p>
              </div>
              <div className="bg-muted/40 rounded-xl p-3">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> طلبات معلقة
                </p>
                <p className="text-base font-bold tabular-nums">
                  <AnimatedNumber value={overview.orders.pending} />
                </p>
              </div>
              <div className="bg-muted/40 rounded-xl p-3">
                <p className="text-xs text-muted-foreground mb-1">قيد التحضير</p>
                <p className="text-base font-bold tabular-nums">
                  <AnimatedNumber value={overview.orders.preparing} />
                </p>
              </div>
              <div className="bg-muted/40 rounded-xl p-3">
                <p className="text-xs text-muted-foreground mb-1">عدد الوجبات</p>
                <p className="text-base font-bold tabular-nums">
                  <AnimatedNumber value={overview.menu.meals} />{" "}
                  <span className="text-xs text-muted-foreground font-normal">
                    ({overview.menu.available} متاح)
                  </span>
                </p>
              </div>
              <div className="bg-muted/40 rounded-xl p-3">
                <p className="text-xs text-muted-foreground mb-1">عدد الأقسام</p>
                <p className="text-base font-bold tabular-nums">
                  <AnimatedNumber value={overview.menu.sections} />
                </p>
              </div>
            </div>
          </SectionCard>
        )}
      </div>
    </div>
  );
}
