"use client";

import { useState } from "react";
import { Eye, EyeOff, Mail, Lock, Shield } from "lucide-react";
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
      { onError: () => error("فشل تسجيل الدخول", "تأكد من بيانات الدخول وحاول مرة أخرى") }
    );
  };

  return (
    <div className="min-h-screen bg-background flex" dir="rtl">
      {/* Left branding panel */}
      <div
        className="hidden lg:flex flex-col justify-between w-1/2 p-12 text-white"
        style={{ background: "linear-gradient(135deg,#1e1e1e 0%,#2d2d2d 60%,#3a2a1a 100%)" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-xl"
            style={{ background: "linear-gradient(135deg,#F55905,#FF8C38)" }}
          >
            ج
          </div>
          <div>
            <span className="text-2xl font-black block leading-none">جاهز</span>
            <span className="text-xs text-white/50 flex items-center gap-1 mt-0.5">
              <Shield className="w-3 h-3" /> لوحة الإدارة
            </span>
          </div>
        </div>

        <div>
          <h1 className="text-4xl font-black leading-tight mb-4">
            إدارة كاملة
            <br />
            <span style={{ color: "#F55905" }}>لكل المنصة</span>
          </h1>
          <p className="text-white/70 text-lg leading-relaxed">
            تحكم في المطاعم، المستخدمين، الطلبات، والإعدادات من مكان واحد
          </p>

          <div className="mt-10 grid grid-cols-2 gap-4">
            {[
              { value: "+1200", label: "مطعم مسجّل" },
              { value: "+50K",  label: "مستخدم نشط" },
              { value: "+200K", label: "طلب مكتمل" },
              { value: "99.9%", label: "وقت التشغيل" },
            ].map((s) => (
              <div key={s.label} className="bg-white/10 rounded-xl p-4 text-center">
                <p className="text-2xl font-black" style={{ color: "#F55905" }}>{s.value}</p>
                <p className="text-sm text-white/60 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/30 text-sm">© 2025 جاهز. جميع الحقوق محفوظة.</p>
      </div>

      {/* Right login form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md animate-fade-in-up">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-lg"
              style={{ background: "linear-gradient(135deg,#F55905,#FF8C38)" }}
            >
              ج
            </div>
            <span className="text-xl font-black">جاهز – لوحة الإدارة</span>
          </div>

          <div className="bg-white rounded-2xl border border-border shadow-md p-8">
            {/* Admin badge */}
            <div className="flex justify-center mb-6">
              <div
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white"
                style={{ background: "linear-gradient(135deg,#1e1e1e,#2d2d2d)" }}
              >
                <Shield className="w-4 h-4" style={{ color: "#F55905" }} />
                وصول المدير فقط
              </div>
            </div>

            <div className="mb-8 text-center">
              <h2 className="text-2xl font-black text-foreground">تسجيل دخول المدير</h2>
              <p className="text-muted-foreground text-sm mt-1">
                أدخل بيانات حسابك للوصول إلى لوحة الإدارة
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="البريد الإلكتروني"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@jahaz.app"
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

              <Button type="submit" className="w-full h-11" loading={login.isPending}>
                <Shield className="w-4 h-4" />
                تسجيل الدخول
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
