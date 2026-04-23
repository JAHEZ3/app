"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useVerifyOtp, useResendOtp } from "@/hooks/useAuth";
import { getApiError } from "@/lib/api";
import { navigateTo } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/providers/ToastProvider";
import { useSearchParams, useRouter } from "next/navigation";

const DIGITS = 6;
const RESEND_SECONDS = 60;

function OtpForm() {
  const [digits, setDigits] = useState<string[]>(Array(DIGITS).fill(""));
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const searchParams = useSearchParams();
  const router = useRouter();
  const phone = searchParams.get("phone") ?? "";
  const verifyOtp = useVerifyOtp();
  const resendOtp = useResendOtp();
  const { error, success } = useToast();

  useEffect(() => {
    if (!phone) router.replace("/register");
  }, [phone, router]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const focusAt = (i: number) => inputs.current[i]?.focus();

  const handleChange = (i: number, val: string) => {
    const char = val.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = char;
    setDigits(next);
    if (char && i < DIGITS - 1) focusAt(i + 1);
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) focusAt(i - 1);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, DIGITS);
    const next = [...digits];
    pasted.split("").forEach((c, i) => { next[i] = c; });
    setDigits(next);
    focusAt(Math.min(pasted.length, DIGITS - 1));
  };

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const otp = digits.join("");
    if (otp.length < DIGITS) {
      error("خطأ", "يرجى إدخال رمز التحقق كاملاً");
      return;
    }
    verifyOtp.mutate(
      { phone, otp },
      {
        onSuccess: () => {
          success("تم التحقق", "جارِ الانتقال لإكمال بيانات المطعم...");
          setTimeout(() => navigateTo("/complete-profile"), 600);
        },
        onError: (err) => error("رمز خاطئ", getApiError(err)),
      }
    );
  };

  const handleResend = () => {
    resendOtp.mutate(phone, {
      onSuccess: () => {
        success("تم الإرسال", "تم إرسال رمز جديد إلى جوالك");
        setCountdown(RESEND_SECONDS);
        setDigits(Array(DIGITS).fill(""));
        focusAt(0);
      },
      onError: () => error("خطأ", "تعذر إعادة الإرسال، حاول مرة أخرى"),
    });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6" dir="rtl">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-lg"
            style={{ background: "linear-gradient(135deg,#F55905,#F57334)" }}
          >
            ج
          </div>
          <span className="text-xl font-black">جاهز</span>
        </div>

        <div className="bg-white rounded-2xl border border-border shadow-md p-8">
          <div className="mb-8 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl"
              style={{ background: "linear-gradient(135deg,#FFF0E8,#FFE0CC)" }}
            >
              📱
            </div>
            <h2 className="text-2xl font-black text-foreground">رمز التحقق</h2>
            <p className="text-muted-foreground text-sm mt-2">
              أدخل الرمز المرسل إلى
            </p>
            <p className="font-bold text-foreground mt-1 dir-ltr text-center" style={{ direction: "ltr" }}>
              {phone}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex gap-2 justify-center" style={{ direction: "ltr" }}>
              {Array.from({ length: DIGITS }).map((_, i) => (
                <input
                  key={i}
                  ref={(el) => { inputs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digits[i]}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  onPaste={handlePaste}
                  className="w-11 h-12 text-center text-xl font-bold rounded-xl border-2 border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors bg-white"
                />
              ))}
            </div>

            <Button type="submit" className="w-full h-11" loading={verifyOtp.isPending}>
              تحقق من الرمز
            </Button>
          </form>

          <div className="mt-6 text-center">
            {countdown > 0 ? (
              <p className="text-sm text-muted-foreground">
                إعادة الإرسال بعد{" "}
                <span className="font-bold text-foreground">{countdown}</span> ثانية
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={resendOtp.isPending}
                className="text-sm text-primary font-semibold hover:underline disabled:opacity-50"
              >
                {resendOtp.isPending ? "جاري الإرسال..." : "إعادة إرسال الرمز"}
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => router.back()}
            className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
          >
            ← تغيير رقم الجوال
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OtpPage() {
  return (
    <Suspense>
      <OtpForm />
    </Suspense>
  );
}
