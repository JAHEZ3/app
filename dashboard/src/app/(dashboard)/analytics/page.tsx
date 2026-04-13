"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { useDashboardStats, useSalesData, useTopMeals } from "@/hooks/useRestaurant";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, ShoppingBag, Star, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const periods = [
  { value: "daily",   label: "يومي"   },
  { value: "weekly",  label: "أسبوعي" },
  { value: "monthly", label: "شهري"   },
] as const;

const mockSales = [
  { date: "السبت",    revenue: 1200, orders: 18 },
  { date: "الأحد",    revenue: 980,  orders: 14 },
  { date: "الإثنين",  revenue: 1450, orders: 22 },
  { date: "الثلاثاء", revenue: 1100, orders: 16 },
  { date: "الأربعاء", revenue: 1800, orders: 27 },
  { date: "الخميس",   revenue: 2200, orders: 33 },
  { date: "الجمعة",   revenue: 1950, orders: 28 },
];

const mockTopMeals = [
  { mealId: "1", mealName: "واجو سيجنيتشر برجر", imageUrl: null, totalOrders: 56, revenue: 8960, percentageOfTotal: 72 },
  { mealId: "2", mealName: "كلاسيك ماك باربيكيو", imageUrl: null, totalOrders: 34, revenue: 4760, percentageOfTotal: 54 },
  { mealId: "3", mealName: "جاردن كينوا بول",     imageUrl: null, totalOrders: 22, revenue: 3300, percentageOfTotal: 35 },
  { mealId: "4", mealName: "سيزر سالاد دجاج",     imageUrl: null, totalOrders: 18, revenue: 2700, percentageOfTotal: 29 },
  { mealId: "5", mealName: "شيك توت العود",        imageUrl: null, totalOrders: 14, revenue: 1960, percentageOfTotal: 22 },
];

const mockOrdersByStatus = [
  { name: "تم التوصيل",  value: 142, color: "#10B981" },
  { name: "ملغي",        value: 12,  color: "#EF4444" },
  { name: "قيد التنفيذ", value: 24,  color: "#3B82F6" },
  { name: "معلق",        value: 6,   color: "#F59E0B" },
];

const mockHourlyOrders = [
  { hour: "12ص", orders: 2 },
  { hour: "3ص",  orders: 1 },
  { hour: "6ص",  orders: 3 },
  { hour: "9ص",  orders: 8 },
  { hour: "12م", orders: 22 },
  { hour: "3م",  orders: 18 },
  { hour: "6م",  orders: 31 },
  { hour: "9م",  orders: 24 },
];

function StatCard({ icon, label, value, sub, trend, color }: {
  icon: React.ReactNode; label: string; value: string; sub?: string;
  trend?: string; color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-border p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          {icon}
        </div>
        {trend && (
          <span className="text-xs font-bold text-success bg-success-light px-2 py-0.5 rounded-full">
            ▲ {trend}
          </span>
        )}
      </div>
      <p className="text-2xl font-black text-foreground">{value}</p>
      <p className="text-xs font-medium text-muted-foreground mt-1">{label}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("daily");
  const { data: stats } = useDashboardStats();
  const { data: salesData } = useSalesData(period);
  const { data: topMeals } = useTopMeals();

  const chartData = salesData?.length ? salesData : mockSales;
  const topItems = topMeals?.length ? topMeals : mockTopMeals;
  const s = stats ?? { totalOrders: 184, totalRevenue: 12450, rating: 4.8, totalRatings: 48 };

  return (
    <div className="flex flex-col h-full">
      <Header />
      <div className="flex-1 p-5 space-y-5">
        {/* Title */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-black text-foreground">الإحصائيات والتقارير</h1>
            <p className="text-sm text-muted-foreground mt-0.5">تحليل أداء مطعمك</p>
          </div>
          <div className="flex gap-1 bg-muted rounded-xl p-1">
            {periods.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-semibold transition-all",
                  period === p.value ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={<TrendingUp className="w-5 h-5 text-primary" />}
            color="bg-primary-light"
            label="إجمالي الإيرادات"
            value={`SR ${s.totalRevenue.toLocaleString("ar-SA")}`}
            trend="8٪"
          />
          <StatCard
            icon={<ShoppingBag className="w-5 h-5 text-success" />}
            color="bg-success-light"
            label="إجمالي الطلبات"
            value={s.totalOrders.toString()}
            trend="13٪"
          />
          <StatCard
            icon={<Star className="w-5 h-5 text-amber-500" />}
            color="bg-amber-50"
            label="متوسط التقييم"
            value={`${s.rating}/5`}
            sub={`${s.totalRatings} تقييم`}
          />
          <StatCard
            icon={<Users className="w-5 h-5 text-info" />}
            color="bg-info-light"
            label="متوسط قيمة الطلب"
            value={formatCurrency(s.totalRevenue / (s.totalOrders || 1))}
          />
        </div>

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Revenue area chart */}
          <div className="xl:col-span-2 bg-white rounded-xl border border-border p-5">
            <h3 className="text-base font-bold text-foreground mb-4">الإيرادات عبر الزمن</h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#FF6B00" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#FF6B00" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6b7280", fontFamily: "Cairo" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#6b7280", fontFamily: "Cairo" }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ fontFamily: "Cairo", fontSize: 12, borderRadius: 12, border: "1px solid #e5e7eb" }}
                  formatter={(v: number) => [`SR ${v.toLocaleString()}`, "الإيرادات"]}
                />
                <Area type="monotone" dataKey="revenue" stroke="#FF6B00" strokeWidth={2.5} fill="url(#grad)" dot={false} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Orders by status pie */}
          <div className="bg-white rounded-xl border border-border p-5">
            <h3 className="text-base font-bold text-foreground mb-4">توزيع الطلبات</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={mockOrdersByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={false}>
                  {mockOrdersByStatus.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Legend
                  formatter={(value) => <span style={{ fontFamily: "Cairo", fontSize: 12 }}>{value}</span>}
                />
                <Tooltip
                  contentStyle={{ fontFamily: "Cairo", fontSize: 12, borderRadius: 12, border: "1px solid #e5e7eb" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts row 2 */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Hourly orders */}
          <div className="bg-white rounded-xl border border-border p-5">
            <h3 className="text-base font-bold text-foreground mb-4">الطلبات حسب الساعة</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={mockHourlyOrders} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "#6b7280", fontFamily: "Cairo" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#6b7280", fontFamily: "Cairo" }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ fontFamily: "Cairo", fontSize: 12, borderRadius: 12, border: "1px solid #e5e7eb" }}
                  formatter={(v: number) => [v, "طلب"]}
                />
                <Bar dataKey="orders" fill="#FF6B00" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top meals */}
          <div className="bg-white rounded-xl border border-border p-5">
            <h3 className="text-base font-bold text-foreground mb-4">أكثر الوجبات مبيعاً</h3>
            <div className="space-y-3">
              {topItems.slice(0, 5).map((item, idx) => (
                <div key={item.mealId} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-sm font-semibold truncate">{item.mealName}</p>
                      <span className="text-xs text-muted-foreground shrink-0 mr-2">{item.totalOrders} طلب</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${item.percentageOfTotal}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-primary shrink-0">
                        {formatCurrency(item.revenue)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
