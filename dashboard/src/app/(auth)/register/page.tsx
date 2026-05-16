"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Phone, CheckCircle, ArrowRight, Store, Bell, BadgeCheck } from "lucide-react";
import { useRegister, useVerifyOtp, useResendOtp } from "@/hooks/useAuth";
import { getApiError } from "@/lib/api";
import { navigateTo } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/providers/ToastProvider";

const OTP_DIGITS = 6;
const RESEND_SECONDS = 60;

const STEPS_INFO = [
  { n: "١", label: "أدخل رقم جوالك",      icon: Phone },
  { n: "٢", label: "تحقق من الرمز",        icon: BadgeCheck },
  { n: "٣", label: "أكمل بيانات المطعم",  icon: Store },
];

// ── Step indicator ────────────────────────────────────────────────────────────
function StepBar({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-0 mb-7">
      {[
        { n: 1, label: "رقم الجوال" },
        { n: 2, label: "رمز التحقق" },
      ].map((s, i, arr) => {
        const done   = current > s.n;
        const active = current === s.n;
        return (
          <div key={s.n} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={[
                  "w-9 h-9 rounded-full flex items-center justify-center text-sm font-black transition-all duration-300",
                  done   ? "bg-success text-white shadow-sm"                       : "",
                  active ? "bg-primary text-white shadow-md shadow-primary/30"     : "",
                  !done && !active ? "bg-muted text-muted-foreground"              : "",
                ].join(" ")}
              >
                {done ? <CheckCircle className="w-4 h-4" /> : s.n}
              </div>
              <span className={`text-xs font-semibold whitespace-nowrap ${active ? "text-primary" : done ? "text-success" : "text-muted-foreground"}`}>
                {s.label}
              </span>
            </div>
            {i < arr.length - 1 && (
              <div className={`flex-1 h-0.5 mx-3 mb-5 rounded-full transition-all duration-700 ${current > s.n ? "bg-success" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── OTP input ─────────────────────────────────────────────────────────────────
function OtpInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const focus = (i: number) => refs.current[i]?.focus();

  const handleChange = (i: number, raw: string) => {
    const char = raw.replace(/\D/g, "").slice(-1);
    const next = [...value];
    next[i] = char;
    onChange(next);
    if (char && i < OTP_DIGITS - 1) focus(i + 1);
  };

  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !value[i] && i > 0) focus(i - 1);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_DIGITS);
    const next = [...value];
    pasted.split("").forEach((c, i) => { next[i] = c; });
    onChange(next);
    focus(Math.min(pasted.length, OTP_DIGITS - 1));
  };

  return (
    <div className="flex gap-2 justify-center" style={{ direction: "ltr" }}>
      {Array.from({ length: OTP_DIGITS }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i]}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKey(i, e)}
          onPaste={handlePaste}
          className={[
            "w-11 h-13 text-center text-xl font-black rounded-xl border-2 transition-all bg-white focus:outline-none focus:ring-2 focus:ring-primary/20",
            value[i] ? "border-primary text-primary bg-primary/5" : "border-border text-foreground",
          ].join(" ")}
        />
      ))}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function RegisterPage() {
  const [step, setStep]           = useState<1 | 2 | 3>(1);
  const [phone, setPhone]         = useState("");
  const [digits, setDigits]       = useState<string[]>(Array(OTP_DIGITS).fill(""));
  const [countdown, setCountdown] = useState(RESEND_SECONDS);

  const register  = useRegister();
  const verifyOtp = useVerifyOtp();
  const resendOtp = useResendOtp();
  const { error, success } = useToast();

  useEffect(() => {
    if (step !== 2 || countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [step, countdown]);

  const handlePhoneSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!phone.trim()) { error("خطأ", "يرجى إدخال رقم الجوال"); return; }
    register.mutate(phone.trim(), {
      onSuccess: () => {
        success("تم الإرسال", "تم إرسال رمز التحقق إلى جوالك");
        setStep(2);
        setCountdown(RESEND_SECONDS);
      },
      onError: (err) => error("فشل التسجيل", getApiError(err)),
    });
  };

  const handleOtpSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const otp = digits.join("");
    if (otp.length < OTP_DIGITS) { error("خطأ", "يرجى إدخال رمز التحقق كاملاً"); return; }
    verifyOtp.mutate(
      { phone: phone.trim(), otp },
      {
        onSuccess: () => {
          success("تم التحقق", "جارِ الانتقال لإكمال بيانات المطعم...");
          setStep(3);
          navigateTo("/complete-profile");
        },
        onError: (err) => error("رمز خاطئ", getApiError(err)),
      },
    );
  };

  const handleResend = () => {
    resendOtp.mutate(phone.trim(), {
      onSuccess: () => {
        success("تم الإرسال", "تم إرسال رمز جديد إلى جوالك");
        setCountdown(RESEND_SECONDS);
        setDigits(Array(OTP_DIGITS).fill(""));
      },
      onError: () => error("خطأ", "تعذر إعادة الإرسال، حاول مرة أخرى"),
    });
  };

  return (
    <div className="min-h-screen flex" dir="rtl">

      {/* ── Left dark panel ── */}
      <div className="hidden lg:flex flex-col w-[46%] bg-[#0f172a] p-12 text-white relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center font-black text-xl shadow-lg shadow-primary/30">
            ج
          </div>
          <span className="text-2xl font-black tracking-tight">جاهز</span>
        </div>

        <div className="relative z-10 flex-1 flex flex-col justify-center">
          <div className="inline-flex items-center gap-2 bg-primary/15 border border-primary/25 text-primary px-3 py-1.5 rounded-full text-xs font-bold mb-5 w-fit">
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
            انضم لآلاف أصحاب المطاعم
          </div>

          <h1 className="text-[2.6rem] font-black leading-[1.2] mb-4">
            سجّل مطعمك<br />
            <span className="text-primary">وابدأ بالربح اليوم</span>
          </h1>
          <p className="text-white/55 text-[15px] leading-relaxed mb-10">
            انضم إلى منصة جاهز واستقبل طلبات من آلاف العملاء
            في منطقتك مباشرةً.
          </p>

          {/* Steps */}
          <div className="space-y-3">
            {STEPS_INFO.map((s, i) => {
              const done = (step === 1 && i < 1) || (step === 2 && i < 2);
              return (
                <div
                  key={s.n}
                  className={[
                    "flex items-center gap-3 p-3.5 rounded-xl border transition-all",
                    done
                      ? "bg-primary/15 border-primary/30"
                      : "bg-white/4 border-white/8",
                  ].join(" ")}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-black text-sm ${done ? "bg-primary text-white" : "bg-white/10 text-white/50"}`}>
                    {done ? <CheckCircle className="w-4 h-4" /> : s.n}
                  </div>
                  <div className="flex items-center gap-2">
                    <s.icon className={`w-4 h-4 ${done ? "text-primary" : "text-white/30"}`} />
                    <p className={`text-sm font-semibold ${done ? "text-white" : "text-white/45"}`}>{s.label}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Notification hint */}
          <div className="mt-8 flex items-start gap-3 p-4 bg-white/5 border border-white/10 rounded-xl">
            <Bell className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-white/50 leading-relaxed">
              بعد التسجيل، سيراجع فريقنا بياناتك خلال 24-48 ساعة ويُعلمك بالنتيجة.
            </p>
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

          <div className="bg-white rounded-2xl border border-border shadow-sm p-7">
            <StepBar current={step} />

            {/* Step 1 */}
            {step === 1 && (
              <>
                <div className="mb-6">
                  <h2 className="text-[1.6rem] font-black text-foreground">إنشاء حساب جديد</h2>
                  <p className="text-muted-foreground text-sm mt-1">أدخل رقم جوالك لاستقبال رمز التحقق</p>
                </div>

                <form onSubmit={handlePhoneSubmit} className="space-y-4">
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
                  <Button type="submit" className="w-full h-11" loading={register.isPending}>
                    إرسال رمز التحقق
                  </Button>
                </form>

                <p className="text-center text-sm text-muted-foreground mt-5">
                  لديك حساب بالفعل؟{" "}
                  <a href="/login" className="text-primary font-bold hover:underline">تسجيل الدخول</a>
                </p>
              </>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <>
                <div className="mb-6 text-center">
                  <h2 className="text-[1.6rem] font-black text-foreground">أدخل رمز التحقق</h2>
                  <p className="text-muted-foreground text-sm mt-1">أُرسل رمز مكوّن من 6 أرقام إلى</p>
                  <p className="font-black text-foreground text-base mt-1" style={{ direction: "ltr" }}>{phone}</p>
                </div>

                <form onSubmit={handleOtpSubmit} className="space-y-5">
                  <OtpInput value={digits} onChange={setDigits} />

                  <Button type="submit" className="w-full h-11" loading={verifyOtp.isPending}>
                    تحقق وأكمل التسجيل
                  </Button>
                </form>

                <div className="mt-5 text-center">
                  {countdown > 0 ? (
                    <p className="text-sm text-muted-foreground">
                      إعادة الإرسال بعد{" "}
                      <span className="font-black text-foreground tabular-nums">
                        {String(Math.floor(countdown / 60)).padStart(2, "0")}:{String(countdown % 60).padStart(2, "0")}
                      </span>
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={resendOtp.isPending}
                      className="text-sm text-primary font-bold hover:underline disabled:opacity-50"
                    >
                      {resendOtp.isPending ? "جاري الإرسال..." : "إعادة إرسال الرمز"}
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => { setStep(1); setDigits(Array(OTP_DIGITS).fill("")); }}
                  className="mt-4 w-full flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  تغيير رقم الجوال
                </button>
              </>
            )}

            {/* Step 3 — OTP verified, navigating to complete-profile */}
            {step === 3 && (
              <div className="py-8 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-success/15 flex items-center justify-center mb-4">
                  <CheckCircle className="w-9 h-9 text-success" />
                </div>
                <h2 className="text-[1.5rem] font-black text-foreground mb-1">تم التحقق بنجاح</h2>
                <p className="text-sm text-muted-foreground mb-5">جارِ الانتقال لإكمال بيانات المطعم...</p>
                <div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
