"use client";

import { useState } from "react";
import Image from "next/image";
import { Eye, EyeOff, Phone, Lock, TrendingUp, ShieldCheck, Zap } from "lucide-react";
import { useLogin } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/providers/ToastProvider";

const FEATURES = [
  { icon: Zap,          title: "إدارة فورية",      desc: "تتبع طلباتك وقائمتك في الوقت الفعلي" },
  { icon: TrendingUp,   title: "تقارير مفصّلة",    desc: "إحصائيات يومية وأسبوعية لإيراداتك" },
  { icon: ShieldCheck,  title: "آمن وموثوق",        desc: "بياناتك محمية بأعلى معايير التشفير" },
];

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const login = useLogin();
  const { error } = useToast();

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!phone || !password) {
      error("خطأ", "يرجى إدخال رقم الجوال وكلمة المرور");
      return;
    }
    login.mutate(
      { phone, password },
      { onError: () => error("فشل تسجيل الدخول", "تأكد من بيانات الدخول وحاول مرة أخرى") },
    );
  };

  return (
    <div className="min-h-screen flex" dir="rtl">

      {/* ── Left dark panel ── */}
      <div className="hidden lg:flex flex-col w-[46%] bg-[#0f172a] p-12 text-white relative overflow-hidden">
        {/* decorative circles */}
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

        {/* Logo */}
        <div className="relative flex items-center gap-3 z-10">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center font-black text-xl shadow-lg shadow-primary/30">
            ج
          </div>
          <span className="text-2xl font-black tracking-tight">جاهز</span>
        </div>

        {/* Hero text */}
        <div className="relative z-10 flex-1 flex flex-col justify-center">
          <div className="inline-flex items-center gap-2 bg-primary/15 border border-primary/25 text-primary px-3 py-1.5 rounded-full text-xs font-bold mb-5 w-fit">
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
            منصة إدارة المطاعم الذكية
          </div>

          <h1 className="text-[2.6rem] font-black leading-[1.2] mb-4">
            أدر مطعمك<br />
            <span className="text-primary">بذكاء وكفاءة</span>
          </h1>
          <p className="text-white/55 text-[15px] leading-relaxed mb-10">
            لوحة تحكم متكاملة تمنحك رؤية شاملة على طلباتك،
            قوائمك، وإيراداتك من مكان واحد.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-10">
            {[
              { v: "+1200", l: "مطعم موثوق" },
              { v: "98%",   l: "رضا العملاء" },
              { v: "24/7",  l: "دعم فني" },
            ].map((s) => (
              <div key={s.l} className="bg-white/5 border border-white/8 rounded-xl p-3.5 text-center">
                <p className="text-xl font-black text-primary">{s.v}</p>
                <p className="text-[11px] text-white/45 mt-1">{s.l}</p>
              </div>
            ))}
          </div>

          {/* Feature list */}
          <div className="space-y-2.5">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex items-center gap-3 p-3 rounded-xl bg-white/4 border border-white/8">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                  <f.icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold leading-none mb-0.5">{f.title}</p>
                  <p className="text-xs text-white/45">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-white/25 text-xs">© 2025 جاهز. جميع الحقوق محفوظة.</p>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#f8fafc]">
        <div className="w-full max-w-100">

          {/* Mobile logo */}
          <div className="flex items-center mb-8 lg:hidden p-1 group cursor-pointer">
            <Image
              src="/jahez-mark.png"
              alt="جاهز"
              width={48}
              height={48}
              priority
              unoptimized
              className="object-contain transition-all duration-700 ease-out group-hover:scale-125 group-hover:-rotate-6 group-hover:drop-shadow-[0_8px_20px_rgba(245,89,5,0.55)]"
            />
            <div className="overflow-hidden max-w-0 group-hover:max-w-xs transition-[max-width] duration-700 ease-out">
              <span className="block whitespace-nowrap ps-3 text-2xl font-black text-[#F55905] opacity-0 group-hover:opacity-100 transition-opacity duration-700 ease-out delay-200">جاهز</span>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-[1.75rem] font-black text-foreground leading-tight">مرحباً بعودتك</h2>
            <p className="text-muted-foreground text-sm mt-1.5">سجّل دخولك للوصول إلى لوحة التحكم</p>
          </div>

          <div className="bg-white rounded-2xl border border-border shadow-sm p-7 space-y-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="رقم الجوال"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="05xxxxxxxx"
                startIcon={<Phone className="w-4 h-4" />}
                autoComplete="tel"
                required
              />
              <div className="space-y-1.5">
                <Input
                  label="كلمة المرور"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  startIcon={<Lock className="w-4 h-4" />}
                  endIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                  autoComplete="current-password"
                  required
                />
                <div className="flex justify-end">
                  <a href="/forgot-password" className="text-xs text-primary hover:underline font-semibold">
                    نسيت كلمة المرور؟
                  </a>
                </div>
              </div>

              <Button type="submit" className="w-full h-11 text-[15px]" loading={login.isPending}>
                تسجيل الدخول
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-xs text-muted-foreground">أو</span>
              </div>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              ليس لديك حساب؟{" "}
              <a href="/register" className="text-primary font-bold hover:underline">
                إنشاء حساب جديد
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
