"use client";

import { useState, useRef } from "react";
import {
  User,
  Phone,
  Lock,
  MapPin,
  Building2,
  FileText,
  Upload,
  CheckSquare,
  Eye,
  EyeOff,
  ImagePlus,
} from "lucide-react";
import { useCompleteProfile } from "@/hooks/useAuth";
import { useCategories } from "@/hooks/useCategories";
import { getApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectItem } from "@/components/ui/select";
import { LocationPicker, type PickedLocation } from "@/components/ui/location-picker";
import { useToast } from "@/providers/ToastProvider";

const ACCOUNT_TYPE_OPTIONS = [
  { value: "bank_account", label: "حساب بنكي" },
  { value: "wallet", label: "محفظة إلكترونية" },
];

interface PaymentBrand {
  value: string;
  label: string;
  /** Single Arabic letter shown when no logoUrl is provided. */
  mark: string;
  /** Solid brand background (e.g. "bg-emerald-600"). */
  bg: string;
  /** Optional path to a real logo asset, e.g. "/payments/bop.svg". */
  logoUrl?: string;
}

const BANK_OPTIONS: PaymentBrand[] = [
  {
    value: "Bank of Palestine",
    label: "بنك فلسطين",
    mark: "ف",
    bg: "bg-emerald-600",
    logoUrl: "/payments/bank-of-palestine.svg",
  },
  {
    value: "Palestine Islamic Bank",
    label: "بنك فلسطين الإسلامي",
    mark: "إ",
    bg: "bg-teal-600",
    logoUrl: "/payments/palestine-islamic-bank.svg",
  },
  {
    value: "Arab Islamic Bank",
    label: "البنك الإسلامي العربي",
    mark: "ع",
    bg: "bg-amber-600",
    logoUrl: "/payments/arab-islamic-bank.svg",
  },
];

const WALLET_OPTIONS: PaymentBrand[] = [
  {
    value: "PalPay",
    label: "PalPay",
    mark: "P",
    bg: "bg-sky-600",
    logoUrl: "/payments/palpay.svg",
  },
  {
    value: "Jawwal Pay",
    label: "Jawwal Pay",
    mark: "J",
    bg: "bg-fuchsia-600",
    logoUrl: "/payments/jawwal-pay.svg",
  },
];

function PaymentLogo({
  brand,
  size = "md",
}: {
  brand: PaymentBrand;
  size?: "sm" | "md";
}) {
  const [failed, setFailed] = useState(false);
  const dim = size === "sm" ? "w-5 h-5 text-[10px]" : "w-7 h-7 text-xs";

  if (brand.logoUrl && !failed) {
    return (
      <span
        className={`${dim} rounded-md bg-white border border-border flex items-center justify-center overflow-hidden shrink-0`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={brand.logoUrl}
          alt={brand.label}
          className="w-full h-full object-contain"
          onError={() => setFailed(true)}
        />
      </span>
    );
  }
  return (
    <span
      className={`${dim} rounded-md ${brand.bg} text-white font-black flex items-center justify-center shrink-0`}
    >
      {brand.mark}
    </span>
  );
}

function PaymentOption({ brand }: { brand: PaymentBrand }) {
  return (
    <span className="flex items-center gap-2.5">
      <PaymentLogo brand={brand} size="sm" />
      <span>{brand.label}</span>
    </span>
  );
}

const SECTIONS = [
  { id: "password", icon: Lock, label: "كلمة المرور" },
  { id: "restaurant", icon: Building2, label: "بيانات المطعم" },
  { id: "owner", icon: User, label: "بيانات المالك" },
  { id: "files", icon: ImagePlus, label: "المستندات" },
  { id: "payment", icon: FileText, label: "معلومات الدفع" },
];

interface FilePreview {
  file: File;
  url: string;
}

function SectionCard({
  id,
  icon: Icon,
  label,
  children,
}: {
  id: string;
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden"
    >
      <div className="flex items-center gap-2.5 px-6 py-4 border-b border-border bg-muted/30">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-3.5 h-3.5 text-primary" />
        </div>
        <h2 className="font-black text-sm text-foreground">{label}</h2>
      </div>
      <div className="p-6 space-y-4">{children}</div>
    </section>
  );
}

function FileUploadButton({
  label,
  preview,
  onFile,
  inputRef,
}: {
  label: string;
  preview: FilePreview | null;
  onFile: (f: FilePreview | null) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile({ file, url: URL.createObjectURL(file) });
  };
  return (
    <div>
      <p className="text-sm font-medium text-foreground mb-2">{label}</p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={[
          "w-full h-28 rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2 overflow-hidden",
          preview
            ? "border-primary/40 bg-primary/5"
            : "border-border hover:border-primary hover:bg-primary/3 text-muted-foreground",
        ].join(" ")}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview.url}
            alt={label}
            className="h-full w-full object-cover"
          />
        ) : (
          <>
            <Upload className="w-5 h-5" />
            <span className="text-xs font-medium">اضغط لرفع الصورة</span>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}

export default function CompleteProfilePage() {
  const [form, setForm] = useState({
    password: "",
    confirmPassword: "",
    restaurantName: "",
    ownerName: "",
    ownerNationalIdNumber: "",
    commercialRegNumber: "",
    restaurantPhone: "",
    street: "",
    city: "",
    lat: "",
    lng: "",
    cuisineType: "",
    accountType: "bank_account",
    accountHolderName: "",
    bankName: "",
    iban: "",
    accountNumber: "",
    walletType: "",
    walletPhone: "",
    termsAccepted: false,
  });
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [logo, setLogo] = useState<FilePreview | null>(null);
  const [ownerIdPicture, setOwnerIdPicture] = useState<FilePreview | null>(
    null,
  );
  const logoRef = useRef<HTMLInputElement>(null);
  const idPicRef = useRef<HTMLInputElement>(null);
  const completeProfile = useCompleteProfile();
  const { data: categories = [], isLoading: categoriesLoading } =
    useCategories();
  const { error } = useToast();

  const set = (key: keyof typeof form, val: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      error("خطأ", "كلمة المرور وتأكيدها غير متطابقتين");
      return;
    }
    if (!form.cuisineType) {
      error("خطأ", "يرجى اختيار نوع المطبخ");
      return;
    }
    if (!form.accountHolderName.trim()) {
      error("خطأ", "يرجى إدخال اسم صاحب الحساب");
      return;
    }
    if (form.accountType === "bank_account") {
      if (!form.bankName) {
        error("خطأ", "يرجى اختيار البنك");
        return;
      }
      if (!form.iban.trim()) {
        error("خطأ", "يرجى إدخال رقم الآيبان");
        return;
      }
      if (!form.accountNumber.trim()) {
        error("خطأ", "يرجى إدخال رقم الحساب");
        return;
      }
    } else {
      if (!form.walletType) {
        error("خطأ", "يرجى اختيار نوع المحفظة");
        return;
      }
      if (!form.accountNumber.trim()) {
        error("خطأ", "يرجى إدخال رقم الحساب");
        return;
      }
      if (!form.walletPhone.trim()) {
        error("خطأ", "يرجى إدخال رقم الجوال للمحفظة");
        return;
      }
    }
    if (!form.termsAccepted) {
      error("خطأ", "يجب الموافقة على الشروط والأحكام");
      return;
    }

    const paymentInfo =
      form.accountType === "bank_account"
        ? {
            type: "bank_account",
            accountHolderName: form.accountHolderName.trim(),
            bankName: form.bankName,
            accountNumber: form.accountNumber.trim(),
            iban: form.iban.trim(),
          }
        : {
            type: "wallet",
            accountHolderName: form.accountHolderName.trim(),
            walletType: form.walletType,
            accountNumber: form.accountNumber.trim(),
            phone: form.walletPhone.trim(),
          };

    const SKIP = new Set([
      "confirmPassword",
      "accountType",
      "accountHolderName",
      "bankName",
      "iban",
      "accountNumber",
      "walletType",
      "walletPhone",
    ]);
    const fd = new FormData();
    (Object.entries(form) as [string, string | boolean][]).forEach(([k, v]) => {
      if (SKIP.has(k)) return;
      fd.append(k, String(v));
    });
    fd.append("paymentInfo", JSON.stringify(paymentInfo));
    if (logo?.file) fd.append("logo", logo.file);
    if (ownerIdPicture?.file) fd.append("ownerIdPicture", ownerIdPicture.file);

    completeProfile.mutate(fd, {
      onError: (err) => error("فشل الحفظ", getApiError(err)),
    });
  };

  const progress = (() => {
    const fields = [
      form.password,
      form.restaurantName,
      form.ownerName,
      form.ownerNationalIdNumber,
      form.commercialRegNumber,
      form.restaurantPhone,
      form.street,
      form.city,
      form.cuisineType,
      form.accountHolderName,
      form.accountNumber,
    ];
    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  })();

  return (
    <div className="min-h-screen bg-[#f8fafc]" dir="rtl">
      {/* ── Sticky top bar ── */}
      <div className="bg-white border-b border-border sticky top-0 z-20 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center font-black text-white text-sm shadow-sm shadow-primary/30">
              ج
            </div>
            <div>
              <p className="text-sm font-black text-foreground leading-none">
                إكمال بيانات المطعم
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                أكمل بياناتك للبدء في استقبال الطلبات
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground">
              {progress}%
            </span>
            <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Section nav ── */}
      <div className="max-w-2xl mx-auto px-4 pt-5 pb-1 hidden sm:flex items-center gap-2 overflow-x-auto">
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-white text-xs font-semibold text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors whitespace-nowrap"
          >
            <s.icon className="w-3 h-3" />
            {s.label}
          </a>
        ))}
      </div>

      {/* ── Form ── */}
      <form
        onSubmit={handleSubmit}
        className="max-w-2xl mx-auto px-4 py-4 pb-12 space-y-4"
      >
        <SectionCard id="password" icon={Lock} label="كلمة المرور">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="كلمة المرور"
              type={showPwd ? "text" : "password"}
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              placeholder="••••••••"
              endIcon={
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPwd ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              }
              autoComplete="new-password"
              required
            />
            <Input
              label="تأكيد كلمة المرور"
              type={showConfirm ? "text" : "password"}
              value={form.confirmPassword}
              onChange={(e) => set("confirmPassword", e.target.value)}
              placeholder="••••••••"
              endIcon={
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirm ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              }
              error={
                form.confirmPassword && form.password !== form.confirmPassword
                  ? "كلمة المرور غير متطابقة"
                  : undefined
              }
              autoComplete="new-password"
              required
            />
          </div>
        </SectionCard>

        <SectionCard id="restaurant" icon={Building2} label="بيانات المطعم">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="اسم المطعم"
              value={form.restaurantName}
              onChange={(e) => set("restaurantName", e.target.value)}
              placeholder="مطعم الذوق الرفيع"
              startIcon={<Building2 className="w-4 h-4" />}
              required
            />
            <Input
              label="رقم جوال المطعم"
              type="tel"
              value={form.restaurantPhone}
              onChange={(e) => set("restaurantPhone", e.target.value)}
              placeholder="05xxxxxxxx"
              startIcon={<Phone className="w-4 h-4" />}
              required
            />
          </div>
          <Select
            label="نوع المطبخ"
            value={form.cuisineType}
            onValueChange={(v) => set("cuisineType", v)}
            placeholder={
              categoriesLoading ? "جارٍ تحميل التصنيفات..." : "اختر نوع المطبخ"
            }
          >
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.name}>
                <span className="flex items-center gap-2">
                  {c.iconUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.iconUrl}
                      alt=""
                      className="w-4 h-4 object-contain shrink-0"
                    />
                  )}
                  <span>{c.name}</span>
                </span>
              </SelectItem>
            ))}
          </Select>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="المدينة"
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
              placeholder="الرياض"
              startIcon={<MapPin className="w-4 h-4" />}
              required
            />
            <Input
              label="الشارع"
              value={form.street}
              onChange={(e) => set("street", e.target.value)}
              placeholder="شارع الملك فهد"
              startIcon={<MapPin className="w-4 h-4" />}
              required
            />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              موقع المطعم على الخريطة
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              اضغط «استخدم موقعي الحالي» إذا كنت داخل المطعم الآن، أو اسحب الدبوس
              لتحديد المكان بدقة. سيتم تعبئة المدينة والشارع تلقائياً.
            </p>
            <LocationPicker
              value={
                form.lat && form.lng
                  ? { lat: parseFloat(form.lat), lng: parseFloat(form.lng) }
                  : null
              }
              onChange={(loc: PickedLocation) => {
                setForm((prev) => ({
                  ...prev,
                  lat: String(loc.lat),
                  lng: String(loc.lng),
                  // Only auto-fill when the user hasn't typed something themselves.
                  city: prev.city || loc.city || prev.city,
                  street: prev.street || loc.street || prev.street,
                }));
              }}
            />
          </div>
        </SectionCard>

        <SectionCard id="owner" icon={User} label="بيانات المالك">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="اسم المالك"
              value={form.ownerName}
              onChange={(e) => set("ownerName", e.target.value)}
              placeholder="محمد أحمد"
              startIcon={<User className="w-4 h-4" />}
              required
            />
            <Input
              label="رقم الهوية الوطنية"
              value={form.ownerNationalIdNumber}
              onChange={(e) => set("ownerNationalIdNumber", e.target.value)}
              placeholder="1xxxxxxxxx"
              startIcon={<FileText className="w-4 h-4" />}
              required
            />
          </div>
          <Input
            label="رقم السجل التجاري"
            value={form.commercialRegNumber}
            onChange={(e) => set("commercialRegNumber", e.target.value)}
            placeholder="10xxxxxxxx"
            startIcon={<FileText className="w-4 h-4" />}
            required
          />
        </SectionCard>

        <SectionCard
          id="files"
          icon={ImagePlus}
          label="المستندات والصور (اختيارية)"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FileUploadButton
              label="شعار المطعم"
              preview={logo}
              onFile={setLogo}
              inputRef={logoRef}
            />
            <FileUploadButton
              label="صورة الهوية"
              preview={ownerIdPicture}
              onFile={setOwnerIdPicture}
              inputRef={idPicRef}
            />
          </div>
        </SectionCard>

        <SectionCard id="payment" icon={FileText} label="معلومات الدفع">
          <Select
            label="نوع الحساب"
            value={form.accountType}
            onValueChange={(v) => set("accountType", v)}
            placeholder="اختر نوع الحساب"
          >
            {ACCOUNT_TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </Select>

          <Input
            label="اسم صاحب الحساب"
            value={form.accountHolderName}
            onChange={(e) => set("accountHolderName", e.target.value)}
            placeholder="الاسم كما هو مسجّل في الحساب"
            startIcon={<User className="w-4 h-4" />}
            required
          />

          {form.accountType === "bank_account" ? (
            <>
              <Select
                label="البنك"
                value={form.bankName}
                onValueChange={(v) => set("bankName", v)}
                placeholder="اختر البنك"
              >
                {BANK_OPTIONS.map((b) => (
                  <SelectItem key={b.value} value={b.value}>
                    <PaymentOption brand={b} />
                  </SelectItem>
                ))}
              </Select>
              {(() => {
                const picked = BANK_OPTIONS.find(
                  (b) => b.value === form.bankName,
                );
                return picked ? (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border">
                    <PaymentLogo brand={picked} />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-foreground">
                        {picked.label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {picked.value}
                      </span>
                    </div>
                  </div>
                ) : null;
              })()}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="رقم الآيبان (IBAN)"
                  value={form.iban}
                  onChange={(e) => set("iban", e.target.value)}
                  placeholder="PS00 0000 0000 0000 0000 0000"
                  startIcon={<FileText className="w-4 h-4" />}
                  required
                />
                <Input
                  label="رقم الحساب"
                  value={form.accountNumber}
                  onChange={(e) => set("accountNumber", e.target.value)}
                  placeholder="1234567890"
                  startIcon={<FileText className="w-4 h-4" />}
                  required
                />
              </div>
            </>
          ) : (
            <>
              <Select
                label="نوع المحفظة"
                value={form.walletType}
                onValueChange={(v) => set("walletType", v)}
                placeholder="اختر نوع المحفظة"
              >
                {WALLET_OPTIONS.map((w) => (
                  <SelectItem key={w.value} value={w.value}>
                    <PaymentOption brand={w} />
                  </SelectItem>
                ))}
              </Select>
              {(() => {
                const picked = WALLET_OPTIONS.find(
                  (w) => w.value === form.walletType,
                );
                return picked ? (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border">
                    <PaymentLogo brand={picked} />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-foreground">
                        {picked.label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {picked.value}
                      </span>
                    </div>
                  </div>
                ) : null;
              })()}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="رقم الحساب"
                  value={form.accountNumber}
                  onChange={(e) => set("accountNumber", e.target.value)}
                  placeholder="1234567890"
                  startIcon={<FileText className="w-4 h-4" />}
                  required
                />
                <Input
                  label="رقم الجوال للمحفظة"
                  type="tel"
                  value={form.walletPhone}
                  onChange={(e) => set("walletPhone", e.target.value)}
                  placeholder="05xxxxxxxx"
                  startIcon={<Phone className="w-4 h-4" />}
                  required
                />
              </div>
            </>
          )}
        </SectionCard>

        {/* Terms + Submit */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-5">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <div className="relative mt-0.5 shrink-0">
              <input
                type="checkbox"
                className="sr-only"
                checked={form.termsAccepted}
                onChange={(e) => set("termsAccepted", e.target.checked)}
              />
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center border-2 transition-colors ${form.termsAccepted ? "bg-primary border-primary" : "bg-white border-border"}`}
              >
                {form.termsAccepted && (
                  <CheckSquare className="w-3 h-3 text-white" />
                )}
              </div>
            </div>
            <span className="text-sm text-muted-foreground leading-relaxed">
              أوافق على{" "}
              <span className="text-primary font-bold">الشروط والأحكام</span>{" "}
              وسياسة الخصوصية لمنصة جاهز
            </span>
          </label>

          <Button
            type="submit"
            className="w-full h-12 text-[15px]"
            loading={completeProfile.isPending}
          >
            إكمال التسجيل والمتابعة
          </Button>
        </div>
      </form>
    </div>
  );
}
