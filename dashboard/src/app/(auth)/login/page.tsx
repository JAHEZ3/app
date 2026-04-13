"use client";

import { useState } from "react";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import { useLogin } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/providers/ToastProvider";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const login = useLogin();
  const { error } = useToast();

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email || !password) {
      error("خطأ", "يرجى إدخال البريد الإلكتروني وكلمة المرور");
      return;
    }
    login.mutate(
      { email, password },
      {
        onError: () => error("فشل تسجيل الدخول", "تأكد من بيانات الدخول وحاول مرة أخرى"),
      }
    );
  };

  return (
    <div className="min-h-screen bg-background flex" dir="rtl">
      {/* Left: branding panel */}
      <div
        className="hidden lg:flex flex-col justify-between w-1/2 p-12 text-white"
        style={{ background: "linear-gradient(135deg,#F55905 0%,#D94E04 100%)" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center font-black text-xl">
            ج
          </div>
          <span className="text-2xl font-black">جاهز</span>
        </div>

        <div>
          <h1 className="text-4xl font-black leading-tight mb-4">
            أدر مطعمك
            <br />
            بكل سهولة
          </h1>
          <p className="text-white/80 text-lg leading-relaxed">
            لوحة تحكم شاملة لإدارة الطلبات، القوائم، والإحصائيات في مكان واحد
          </p>

          <div className="mt-10 grid grid-cols-3 gap-4">
            {[
              { value: "+1200", label: "مطعم موثوق" },
              { value: "98%",   label: "رضا العملاء" },
              { value: "24/7",  label: "دعم فني" },
            ].map((s) => (
              <div key={s.label} className="bg-white/15 rounded-xl p-4 text-center">
                <p className="text-2xl font-black">{s.value}</p>
                <p className="text-sm text-white/80 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/50 text-sm">© 2025 جاهز. جميع الحقوق محفوظة.</p>
      </div>

      {/* Right: login form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md animate-fade-in-up">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-lg"
              style={{ background: "linear-gradient(135deg,#F55905,#F57334)" }}
            >
              ج
            </div>
            <span className="text-xl font-black">جاهز</span>
          </div>

          <div className="bg-white rounded-2xl border border-border shadow-md p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-black text-foreground">مرحباً بك</h2>
              <p className="text-muted-foreground text-sm mt-1">
                سجّل دخولك للوصول إلى لوحة التحكم
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="البريد الإلكتروني"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@restaurant.com"
                startIcon={<Mail className="w-4 h-4" />}
                autoComplete="email"
                required
              />

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
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                autoComplete="current-password"
                required
              />

              <div className="flex justify-end">
                <button type="button" className="text-sm text-primary hover:underline font-medium">
                  نسيت كلمة المرور؟
                </button>
              </div>

              <Button type="submit" className="w-full h-11" loading={login.isPending}>
                تسجيل الدخول
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              ليس لديك حساب؟{" "}
              <a href="#" className="text-primary font-semibold hover:underline">
                تواصل مع الدعم الفني
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
