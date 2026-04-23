"use client";

import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Users, Store, ShoppingBag, TrendingUp,
  CircleDollarSign, Bike, UserCheck, Clock,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { statsApi } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { formatCurrency, formatNumber } from "@/lib/utils";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

// ── Mock stats shape ──────────────────────────────────────
interface OverviewStats {
  totalUsers: number;
  totalRestaurants: number;
  totalOrders: number;
  totalRevenue: number;
  activeDelivery: number;
  pendingOrders: number;
  newUsersToday: number;
  ordersToday: number;
  revenueChart: { label: string; revenue: number; orders: number }[];
  recentActivity: { id: string; text: string; time: string; type: "user" | "order" | "restaurant" }[];
}

// ── Mock fallback while API is not connected ──────────────
const mockStats: OverviewStats = {
  totalUsers: 52340,
  totalRestaurants: 1283,
  totalOrders: 214780,
  totalRevenue: 4820000,
  activeDelivery: 312,
  pendingOrders: 84,
  newUsersToday: 142,
  ordersToday: 1820,
  revenueChart: [
    { label: "السبت",    revenue: 85000,  orders: 420 },
    { label: "الأحد",   revenue: 92000,  orders: 460 },
    { label: "الاثنين", revenue: 78000,  orders: 390 },
    { label: "الثلاثاء",revenue: 110000, orders: 550 },
    { label: "الأربعاء",revenue: 130000, orders: 650 },
    { label: "الخميس",  revenue: 165000, orders: 820 },
    { label: "الجمعة",  revenue: 198000, orders: 990 },
  ],
  recentActivity: [
    { id: "1", text: "مطعم الأصالة طلب الانضمام للمنصة", time: "منذ 5 دقائق",  type: "restaurant" },
    { id: "2", text: "تسجيل 28 مستخدم جديد",             time: "منذ 12 دقيقة", type: "user" },
    { id: "3", text: "تجاوز الطلبات اليومية 1800 طلب",    time: "منذ 20 دقيقة", type: "order" },
    { id: "4", text: "مستخدم جديد في منطقة الرياض",        time: "منذ 35 دقيقة", type: "user" },
    { id: "5", text: "اكتمال 50 طلب توصيل في الساعة الأخيرة", time: "منذ 1 ساعة", type: "order" },
  ],
};

const statCards = (s: OverviewStats) => [
  {
    title: "إجمالي المستخدمين",
    value: formatNumber(s.totalUsers),
    sub: `+${s.newUsersToday} اليوم`,
    icon: Users,
    color: "#3b82f6",
    bg: "#eff6ff",
  },
  {
    title: "المطاعم المسجّلة",
    value: formatNumber(s.totalRestaurants),
    sub: "مطعم نشط على المنصة",
    icon: Store,
    color: "#f55905",
    bg: "#fef0e7",
  },
  {
    title: "إجمالي الطلبات",
    value: formatNumber(s.totalOrders),
    sub: `${formatNumber(s.ordersToday)} طلب اليوم`,
    icon: ShoppingBag,
    color: "#10b981",
    bg: "#ecfdf5",
  },
  {
    title: "إجمالي الإيرادات",
    value: formatCurrency(s.totalRevenue),
    sub: "منذ بداية المنصة",
    icon: CircleDollarSign,
    color: "#8b5cf6",
    bg: "#f5f3ff",
  },
  {
    title: "سائقو التوصيل النشطون",
    value: formatNumber(s.activeDelivery),
    sub: "متاح الآن",
    icon: Bike,
    color: "#f59e0b",
    bg: "#fffbeb",
  },
  {
    title: "الطلبات المعلّقة",
    value: formatNumber(s.pendingOrders),
    sub: "بانتظار التأكيد",
    icon: Clock,
    color: "#ef4444",
    bg: "#fef2f2",
  },
];

export default function OverviewPage() {
  const { data, isLoading } = useQuery<OverviewStats>({
    queryKey: queryKeys.stats.overview,
    queryFn: async () => {
      const res = await statsApi.overview();
      return res.data;
    },
    placeholderData: mockStats,
    retry: false,
  });

  const stats = data ?? mockStats;

  const activityIcon = (type: "user" | "order" | "restaurant") => {
    if (type === "user") return <UserCheck className="w-4 h-4 text-info" />;
    if (type === "restaurant") return <Store className="w-4 h-4 text-primary" />;
    return <ShoppingBag className="w-4 h-4 text-success" />;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header title="نظرة عامة" subtitle="مرحباً، هذا ملخص المنصة اليوم" />

      <div className="p-6 space-y-6 animate-fade-in-up">

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))
            : statCards(stats).map((card) => (
                <Card key={card.title} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-5">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                      style={{ background: card.bg }}
                    >
                      <card.icon className="w-5 h-5" style={{ color: card.color }} />
                    </div>
                    <p className="text-2xl font-black text-foreground">{card.value}</p>
                    <p className="text-xs font-semibold text-foreground mt-0.5">{card.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{card.sub}</p>
                  </CardContent>
                </Card>
              ))}
        </div>

        {/* Chart + Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>الإيرادات والطلبات – آخر 7 أيام</CardTitle>
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-52 rounded-xl" />
              ) : (
                <ResponsiveContainer width="100%" height={210}>
                  <AreaChart data={stats.revenueChart} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#F55905" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#F55905" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fontFamily: "Cairo" }} />
                    <YAxis tick={{ fontSize: 11, fontFamily: "Cairo" }} width={60} />
                    <Tooltip
                      contentStyle={{ fontFamily: "Cairo", borderRadius: 8, fontSize: 12 }}
                      formatter={(v: number) => [formatCurrency(v), "الإيرادات"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#F55905"
                      strokeWidth={2}
                      fill="url(#rev)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Recent activity */}
          <Card>
            <CardHeader>
              <CardTitle>النشاط الأخير</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 rounded-lg" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {stats.recentActivity.map((item) => (
                    <div key={item.id} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-muted/50 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                        {activityIcon(item.type)}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-foreground leading-snug">{item.text}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{item.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
