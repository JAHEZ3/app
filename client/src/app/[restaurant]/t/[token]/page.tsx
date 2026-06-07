"use client";

import { use, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { Loader2, Plus, Minus, ShoppingCart, Check, AlertCircle, AlertTriangle } from "lucide-react";

// Pulls the localized message the server returns ({ message, statusCode, ... }).
// Falls back to a generic Arabic string. Used for the busy-table 409 plus any
// other server-side validation failure.
function extractApiError(e: unknown): { message: string; status?: number } {
  if (axios.isAxiosError(e)) {
    const err = e as AxiosError<{ message?: string | string[] }>;
    const raw = err.response?.data?.message;
    const msg = Array.isArray(raw) ? raw[0] : raw;
    return { message: msg ?? "تعذر إرسال الطلب", status: err.response?.status };
  }
  if (e instanceof Error) return { message: e.message };
  return { message: "تعذر إرسال الطلب" };
}

// Same-origin axios so requests hit the Next.js dev-server rewrites
// (see next.config.ts). Lets a phone scanning the QR talk to the laptop's
// services through one origin — no LAN-IP-per-service config, no CORS.
const scanClient = axios.create({
  baseURL: "",
  headers: { "Content-Type": "application/json", "Accept-Language": "ar" },
  timeout: 10_000,
});

interface ScanMeal {
  id: string;
  name: string;
  basePrice: number | string;
  isAvailable?: boolean;
}
interface ScanSection {
  id: string;
  name: string;
  meals?: ScanMeal[];
}
interface ScanMenu {
  id: string;
  name: string;
  sections?: ScanSection[];
}
interface TableLookup {
  table: { id: string; number: string; section: string | null; capacity: number };
  restaurant: { id: string; name: string; logoUrl: string | null };
}
interface PublicMenuResponse {
  restaurant?: { id: string; name: string; logoUrl?: string | null };
  menus?: ScanMenu[];
}

function unwrap<T>(payload: unknown): T {
  const root = payload as { data?: T } | T;
  if (root && typeof root === "object" && "data" in root) {
    return (root as { data?: T }).data as T;
  }
  return root as T;
}

const formatPrice = (n: number) =>
  new Intl.NumberFormat("ar", { style: "currency", currency: "ILS", maximumFractionDigits: 2 }).format(n);

// `restaurant` is a vanity slug in the URL — purely cosmetic so the customer
// sees the restaurant name in their browser bar. All real lookups go through
// the QR token, so a stale or mismatched slug doesn't break the flow.
export default function ScanOrderPage({
  params,
}: {
  params: Promise<{ restaurant: string; token: string }>;
}) {
  const { token } = use(params);

  // Resolve the table (and the restaurant it belongs to) from the QR token.
  const tableQuery = useQuery<TableLookup>({
    queryKey: ["scan-table", token],
    queryFn: async () => {
      const res = await scanClient.get(`/api/restaurant/public/tables/by-qr/${token}`);
      return unwrap<TableLookup>(res.data);
    },
    retry: false,
  });

  // Pull the menu for that restaurant.
  const menuQuery = useQuery<PublicMenuResponse>({
    queryKey: ["scan-menu", tableQuery.data?.restaurant.id],
    queryFn: async () => {
      const res = await scanClient.get(`/api/restaurant/${tableQuery.data!.restaurant.id}`);
      return unwrap<PublicMenuResponse>(res.data);
    },
    enabled: !!tableQuery.data?.restaurant.id,
    retry: false,
  });

  const [cart, setCart] = useState<Record<string, { meal: ScanMeal; qty: number }>>({});
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [submittedOrder, setSubmittedOrder] = useState<{ orderNumber: string } | null>(null);
  const [logoFailed, setLogoFailed] = useState(false);

  const subtotal = useMemo(
    () => Object.values(cart).reduce((s, e) => s + Number(e.meal.basePrice) * e.qty, 0),
    [cart],
  );
  const totalItems = useMemo(
    () => Object.values(cart).reduce((s, e) => s + e.qty, 0),
    [cart],
  );

  const add = (meal: ScanMeal) =>
    setCart((c) => ({
      ...c,
      [meal.id]: { meal, qty: (c[meal.id]?.qty ?? 0) + 1 },
    }));
  const remove = (mealId: string) =>
    setCart((c) => {
      const e = c[mealId];
      if (!e) return c;
      if (e.qty <= 1) {
        const { [mealId]: _, ...rest } = c;
        return rest;
      }
      return { ...c, [mealId]: { ...e, qty: e.qty - 1 } };
    });

  const submit = useMutation({
    mutationFn: async () => {
      const res = await scanClient.post("/api/order/pos/scan-order", {
        qrToken: token,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        items: Object.values(cart).map(({ meal, qty }) => ({
          mealId: meal.id,
          mealName: meal.name,
          basePrice: Number(meal.basePrice),
          quantity: qty,
        })),
      });
      return unwrap<{ orderNumber: string }>(res.data);
    },
    onSuccess: (order) => setSubmittedOrder({ orderNumber: order.orderNumber }),
  });

  // 409 from the server means this table already has an active POS bill —
  // render the full page as a "table busy" state so the customer can't keep
  // hitting submit. Other statuses fall back to the inline error string.
  const submitError = submit.isError ? extractApiError(submit.error) : null;
  const tableIsBusy = submitError?.status === 409;

  if (tableQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  if (tableQuery.isError || !tableQuery.data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-12 h-12 text-danger mb-3" />
        <h1 className="text-lg font-bold mb-1">رمز الطاولة غير صالح</h1>
        <p className="text-sm text-muted-foreground">
          الرجاء مسح الرمز مرة أخرى أو التواصل مع طاقم المطعم.
        </p>
      </div>
    );
  }

  if (tableIsBusy) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-warning/5">
        <div className="w-16 h-16 rounded-full bg-warning/15 flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8 text-warning" />
        </div>
        <h1 className="text-xl font-black mb-2">الطاولة مشغولة حالياً</h1>
        <p className="text-sm text-muted-foreground max-w-sm mb-4">
          {submitError?.message}
        </p>
        <button
          onClick={() => submit.reset()}
          className="px-4 py-2 rounded-xl border border-border bg-white text-sm font-semibold"
        >
          المحاولة مرة أخرى
        </button>
      </div>
    );
  }

  if (submittedOrder) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-muted/30">
        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
          <Check className="w-8 h-8 text-success" />
        </div>
        <h1 className="text-xl font-black mb-2">تم إرسال طلبك</h1>
        <p className="text-sm text-muted-foreground mb-1">
          رقم الطلب: <span className="font-mono font-bold">{submittedOrder.orderNumber}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          طاقم المطعم سيؤكد الطلب ويقوم بإعداده. الدفع عند الكاشير.
        </p>
      </div>
    );
  }

  const { table, restaurant } = tableQuery.data;
  const menus = menuQuery.data?.menus ?? [];
  const showLogo = restaurant.logoUrl && !logoFailed;
  const initial = (restaurant.name ?? "?").trim().charAt(0) || "?";

  return (
    <div className="min-h-screen bg-muted/20 pb-32">
      <div className="bg-gradient-to-l from-primary to-primary/85 text-white px-4 pt-5 pb-6 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="relative w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm ring-2 ring-white/25 overflow-hidden flex items-center justify-center shrink-0">
            {showLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={restaurant.logoUrl!}
                alt={restaurant.name}
                className="w-full h-full object-cover"
                onError={() => setLogoFailed(true)}
              />
            ) : (
              <span className="text-xl font-black text-white">{initial}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black truncate">{restaurant.name}</h1>
            <p className="text-xs text-white/85 mt-0.5">
              طاولة {table.number}
              {table.section ? ` · ${table.section}` : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {menuQuery.isLoading ? (
          <div className="text-center py-10">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : menus.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-10">القائمة غير متاحة حالياً</p>
        ) : (
          menus.map((menu) => (
            <div key={menu.id} className="space-y-4">
              {(menu.sections ?? []).map((section) => (
                <div key={section.id} className="bg-white rounded-2xl border border-border overflow-hidden">
                  <h2 className="px-4 py-3 font-bold border-b border-border bg-muted/30">{section.name}</h2>
                  <ul className="divide-y divide-border">
                    {(section.meals ?? []).map((meal) => {
                      const inCart = cart[meal.id]?.qty ?? 0;
                      return (
                        <li key={meal.id} className="px-4 py-3 flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{meal.name}</p>
                            <p className="text-xs text-primary font-bold">
                              {formatPrice(Number(meal.basePrice))}
                            </p>
                          </div>
                          {inCart > 0 ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => remove(meal.id)}
                                className="w-7 h-7 rounded-full bg-muted flex items-center justify-center"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-sm font-bold w-5 text-center">{inCart}</span>
                              <button
                                onClick={() => add(meal)}
                                className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => add(meal)}
                              className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center"
                              aria-label="إضافة"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {totalItems > 0 && (
        <div className="fixed bottom-0 inset-x-0 bg-white border-t border-border p-4 space-y-3 shadow-lg">
          <div className="grid grid-cols-2 gap-2">
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="اسمك (اختياري)"
              className="px-3 py-2 border border-border rounded-lg text-sm"
            />
            <input
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="رقم الجوال (اختياري)"
              dir="ltr"
              className="px-3 py-2 border border-border rounded-lg text-sm"
            />
          </div>
          <button
            onClick={() => submit.mutate()}
            disabled={submit.isPending}
            className="w-full py-3 rounded-xl bg-primary text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submit.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ShoppingCart className="w-4 h-4" />
            )}
            إرسال الطلب · {totalItems} عنصر · {formatPrice(subtotal)}
          </button>
          {submitError && !tableIsBusy && (
            <p className="text-xs text-danger text-center">{submitError.message}</p>
          )}
        </div>
      )}
    </div>
  );
}
