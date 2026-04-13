"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { useRestaurant, useUpdateRestaurant, useRestaurantHours, useUpdateHour } from "@/hooks/useRestaurant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/providers/ToastProvider";
import { Building2, Clock, Bell, Shield, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "restaurant", label: "بيانات المطعم",  icon: Building2 },
  { id: "hours",      label: "أوقات العمل",     icon: Clock     },
  { id: "notifications", label: "الإشعارات",   icon: Bell      },
  { id: "security",   label: "الأمان",           icon: Shield    },
] as const;

type Tab = typeof tabs[number]["id"];

const dayNames = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

const defaultHours = dayNames.map((_, i) => ({
  id: String(i),
  restaurantId: "r1",
  dayOfWeek: i,
  openTime: "09:00",
  closeTime: "23:00",
  isClosed: i === 0, // Sunday closed by default
}));

function RestaurantSettingsTab() {
  const { data: restaurant, isLoading } = useRestaurant();
  const update = useUpdateRestaurant();
  const { success, error } = useToast();

  const [form, setForm] = useState({
    name: "",
    description: "",
    phone: "",
    street: "",
    city: "",
    minOrderAmount: "",
    avgDeliveryMinutes: "",
    deliveryRadiusKm: "",
  });

  useEffect(() => {
    if (restaurant) {
      setForm({
        name: restaurant.name ?? "",
        description: restaurant.description ?? "",
        phone: restaurant.phone ?? "",
        street: restaurant.street ?? "",
        city: restaurant.city ?? "",
        minOrderAmount: restaurant.minOrderAmount?.toString() ?? "",
        avgDeliveryMinutes: restaurant.avgDeliveryMinutes?.toString() ?? "",
        deliveryRadiusKm: restaurant.deliveryRadiusKm?.toString() ?? "",
      });
    }
  }, [restaurant]);

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    update.mutate(
      {
        name: form.name,
        description: form.description,
        phone: form.phone,
        street: form.street,
        city: form.city,
        minOrderAmount: parseFloat(form.minOrderAmount) || 0,
        avgDeliveryMinutes: parseInt(form.avgDeliveryMinutes) || undefined,
        deliveryRadiusKm: parseFloat(form.deliveryRadiusKm) || undefined,
      },
      {
        onSuccess: () => success("تم حفظ البيانات"),
        onError: () => error("خطأ", "فشل حفظ البيانات"),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => <div key={i} className="h-10 bg-muted rounded-lg" />)}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-xl border border-border p-6 space-y-4">
        <h3 className="text-sm font-bold text-foreground">المعلومات الأساسية</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="اسم المطعم *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="مثال: مطعم الأصالة"
            required
          />
          <Input
            label="رقم الهاتف"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+966XXXXXXXXX"
            dir="ltr"
          />
        </div>
        <Textarea
          label="وصف المطعم"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="أكتب وصفاً مختصراً عن مطعمك..."
          rows={3}
        />
      </div>

      <div className="bg-white rounded-xl border border-border p-6 space-y-4">
        <h3 className="text-sm font-bold text-foreground">العنوان والتوصيل</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="المدينة"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            placeholder="مثال: الرياض"
          />
          <Input
            label="العنوان التفصيلي"
            value={form.street}
            onChange={(e) => setForm({ ...form, street: e.target.value })}
            placeholder="الشارع، الحي"
          />
          <Input
            label="الحد الأدنى للطلب (SR)"
            type="number"
            step="0.01"
            value={form.minOrderAmount}
            onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })}
            placeholder="0.00"
          />
          <Input
            label="متوسط وقت التوصيل (دقيقة)"
            type="number"
            value={form.avgDeliveryMinutes}
            onChange={(e) => setForm({ ...form, avgDeliveryMinutes: e.target.value })}
            placeholder="30"
          />
          <Input
            label="نطاق التوصيل (كم)"
            type="number"
            step="0.1"
            value={form.deliveryRadiusKm}
            onChange={(e) => setForm({ ...form, deliveryRadiusKm: e.target.value })}
            placeholder="5"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" loading={update.isPending} className="px-8">
          حفظ التغييرات
        </Button>
      </div>
    </form>
  );
}

function WorkingHoursTab() {
  const { data: hours } = useRestaurantHours();
  const updateHour = useUpdateHour();
  const { success } = useToast();

  const workingHours = hours?.length ? hours : defaultHours;
  const [localHours, setLocalHours] = useState(workingHours);

  useEffect(() => { setLocalHours(workingHours); }, [hours]);

  const handleSave = () => {
    localHours.forEach((h) => updateHour.mutate(h));
    success("تم حفظ أوقات العمل");
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-bold text-foreground">أوقات العمل الأسبوعية</h3>
          <p className="text-xs text-muted-foreground mt-0.5">حدد أوقات الفتح والإغلاق لكل يوم</p>
        </div>
        <div className="divide-y divide-border">
          {localHours.map((h, idx) => (
            <div key={h.dayOfWeek} className="flex items-center gap-4 px-5 py-4">
              <div className="w-20 shrink-0">
                <p className="text-sm font-semibold text-foreground">{dayNames[h.dayOfWeek]}</p>
              </div>
              <Switch
                checked={!h.isClosed}
                onCheckedChange={(v) => {
                  const updated = [...localHours];
                  updated[idx] = { ...h, isClosed: !v };
                  setLocalHours(updated);
                }}
              />
              <div className={cn("flex items-center gap-2 flex-1", h.isClosed && "opacity-40 pointer-events-none")}>
                <Input
                  type="time"
                  value={h.openTime}
                  onChange={(e) => {
                    const updated = [...localHours];
                    updated[idx] = { ...h, openTime: e.target.value };
                    setLocalHours(updated);
                  }}
                  className="w-32"
                />
                <span className="text-muted-foreground text-sm">إلى</span>
                <Input
                  type="time"
                  value={h.closeTime}
                  onChange={(e) => {
                    const updated = [...localHours];
                    updated[idx] = { ...h, closeTime: e.target.value };
                    setLocalHours(updated);
                  }}
                  className="w-32"
                />
              </div>
              {h.isClosed && (
                <span className="text-xs font-semibold text-error bg-error-light px-2 py-1 rounded-lg">
                  مغلق
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={handleSave} loading={updateHour.isPending} className="px-8">
          حفظ أوقات العمل
        </Button>
      </div>
    </div>
  );
}

function NotificationsTab() {
  const [settings, setSettings] = useState({
    newOrders: true,
    orderStatus: true,
    lowStock: false,
    dailyReport: true,
    customerReviews: true,
    promotions: false,
  });

  const items = [
    { key: "newOrders",       label: "طلبات جديدة",    desc: "إشعار فوري عند ورود طلب جديد" },
    { key: "orderStatus",     label: "تحديث حالة الطلب", desc: "إشعار عند تغيير حالة الطلب" },
    { key: "lowStock",        label: "نفاد المخزون",    desc: "تنبيه عند نفاد وجبة معينة" },
    { key: "dailyReport",     label: "تقرير يومي",      desc: "ملخص يومي بالمبيعات والطلبات" },
    { key: "customerReviews", label: "تقييمات العملاء", desc: "إشعار عند وصول تقييم جديد" },
    { key: "promotions",      label: "العروض والتسويق", desc: "نصائح تسويقية ومقترحات" },
  ];

  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-sm font-bold text-foreground">إعدادات الإشعارات</h3>
        <p className="text-xs text-muted-foreground mt-0.5">تحكم بالإشعارات التي تريد استقبالها</p>
      </div>
      <div className="divide-y divide-border">
        {items.map((item) => (
          <div key={item.key} className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
            </div>
            <Switch
              checked={settings[item.key as keyof typeof settings]}
              onCheckedChange={(v) => setSettings({ ...settings, [item.key]: v })}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function SecurityTab() {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const { success, error } = useToast();

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      error("خطأ", "كلمتا المرور غير متطابقتين");
      return;
    }
    if (form.newPassword.length < 8) {
      error("خطأ", "كلمة المرور يجب أن تكون 8 أحرف على الأقل");
      return;
    }
    success("تم تغيير كلمة المرور بنجاح");
    setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-border p-6 space-y-4">
        <h3 className="text-sm font-bold text-foreground">تغيير كلمة المرور</h3>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
          <Input
            label="كلمة المرور الحالية"
            type="password"
            value={form.currentPassword}
            onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
            required
          />
          <Input
            label="كلمة المرور الجديدة"
            type="password"
            value={form.newPassword}
            onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
            required
          />
          <Input
            label="تأكيد كلمة المرور"
            type="password"
            value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            required
          />
          <Button type="submit">تغيير كلمة المرور</Button>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-border p-6">
        <h3 className="text-sm font-bold text-foreground mb-3">جلسات الدخول</h3>
        <div className="space-y-3">
          {[
            { device: "Chrome — Windows 11", location: "الرياض، المملكة العربية السعودية", current: true, time: "الآن" },
            { device: "Safari — iPhone 15",  location: "الرياض، المملكة العربية السعودية", current: false, time: "منذ 2 يوم" },
          ].map((session, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-muted/40 rounded-xl">
              <div>
                <p className="text-sm font-semibold text-foreground">{session.device}</p>
                <p className="text-xs text-muted-foreground">{session.location} · {session.time}</p>
              </div>
              {session.current ? (
                <span className="text-xs font-bold text-success bg-success-light px-2.5 py-1 rounded-full">
                  الجلسة الحالية
                </span>
              ) : (
                <Button variant="danger" size="sm">إنهاء</Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("restaurant");

  const tabContent: Record<Tab, React.ReactNode> = {
    restaurant:    <RestaurantSettingsTab />,
    hours:         <WorkingHoursTab />,
    notifications: <NotificationsTab />,
    security:      <SecurityTab />,
  };

  return (
    <div className="flex flex-col h-full">
      <Header />
      <div className="flex-1 p-6 space-y-5">
        <div>
          <h1 className="text-xl font-black text-foreground">الإعدادات</h1>
          <p className="text-sm text-muted-foreground mt-0.5">إدارة إعدادات حسابك ومطعمك</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar tabs */}
          <aside className="lg:w-52 shrink-0">
            <div className="bg-white rounded-xl border border-border p-2 space-y-1 lg:sticky lg:top-24">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all",
                    activeTab === id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1 text-right">{label}</span>
                  {activeTab === id && <ChevronLeft className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </aside>

          {/* Tab content */}
          <div className="flex-1 min-w-0 animate-fade-in-up">
            {tabContent[activeTab]}
          </div>
        </div>
      </div>
    </div>
  );
}
