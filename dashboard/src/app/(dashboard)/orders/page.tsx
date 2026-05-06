"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { useOrders, useUpdateOrderStatus } from "@/hooks/useOrders";
import { useRestaurant } from "@/hooks/useRestaurant";
import { OrderStatus, Order, PaymentMethod, PaginatedOrders } from "@/types/order.types";
import { OrderStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { formatCurrency, formatTime, formatRelativeTime } from "@/lib/utils";
import { Check, X, Eye, ChevronRight, ChevronLeft, Search, RefreshCw, MessageSquare, Send } from "lucide-react";
import { useToast } from "@/providers/ToastProvider";
import { useSocket } from "@/hooks/useSocket";
import { useQueryClient } from "@tanstack/react-query";
import { ordersApi } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMsg {
  id: string;
  orderId: string;
  senderId: string;
  senderRole: string;
  senderName: string;
  content: string;
  createdAt: string;
}

// ─── Status config ────────────────────────────────────────────────────────────

const statusFilters = [
  { value: "all",                        label: "جميع الطلبات" },
  { value: OrderStatus.PENDING,          label: "قيد الانتظار" },
  { value: OrderStatus.CONFIRMED,        label: "مؤكد"          },
  { value: OrderStatus.PREPARING,        label: "يتم التحضير"   },
  { value: OrderStatus.READY_FOR_PICKUP, label: "جاهز للاستلام" },
  { value: OrderStatus.DELIVERED,        label: "تم التوصيل"    },
  { value: OrderStatus.CANCELLED,        label: "ملغي"          },
];

const paymentMethodLabel: Record<PaymentMethod, string> = {
  cash_on_delivery: "الدفع عند الاستلام",
  card:             "بطاقة",
  online:           "أونلاين",
};

// ─── Sound helper ─────────────────────────────────────────────────────────────

function playNotificationSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch { /* AudioContext not available */ }
}

// ─── Chat panel ───────────────────────────────────────────────────────────────

function ChatPanel({ orderId }: { orderId: string }) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { on, joinOrder, leaveOrder } = useSocket();

  useEffect(() => {
    joinOrder(orderId);
    ordersApi.getChat(orderId)
      .then((res) => setMessages(res.data?.data ?? []))
      .catch(() => {});

    const off = on("chat:message", (msg: ChatMsg) => {
      if (msg.orderId === orderId) {
        setMessages((prev) => [...prev, msg]);
      }
    });

    return () => {
      off();
      leaveOrder(orderId);
    };
  }, [orderId, joinOrder, leaveOrder, on]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await ordersApi.sendChat(orderId, text.trim());
      setText("");
    } catch { /* error shown by interceptor */ }
    finally { setSending(false); }
  };

  return (
    <div className="flex flex-col h-72 border border-border rounded-xl overflow-hidden mt-4">
      <div className="bg-muted/40 px-4 py-2 text-xs font-bold text-muted-foreground border-b border-border flex items-center gap-2">
        <MessageSquare className="w-3.5 h-3.5" /> محادثة الطلب
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-muted/10">
        {messages.length === 0 && (
          <p className="text-center text-xs text-muted-foreground mt-6">لا توجد رسائل بعد</p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col max-w-[80%] ${
              m.senderRole === "restaurant" ? "ml-auto items-end" : "items-start"
            }`}
          >
            <span className="text-[10px] text-muted-foreground mb-0.5">{m.senderName}</span>
            <div
              className={`px-3 py-2 rounded-xl text-sm ${
                m.senderRole === "restaurant"
                  ? "bg-primary text-white rounded-tr-none"
                  : "bg-white border border-border rounded-tl-none"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border p-2 flex gap-2 bg-white">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="اكتب رسالة..."
          className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-border bg-muted/30 focus:outline-none focus:ring-1 focus:ring-primary/40"
        />
        <Button size="icon" onClick={send} loading={sending} className="w-8 h-8 rounded-lg">
          <Send className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── Order detail dialog ──────────────────────────────────────────────────────

function OrderDetailDialog({ order }: { order: Order }) {
  const updateStatus = useUpdateOrderStatus();
  const { success } = useToast();
  const [showChat, setShowChat] = useState(false);

  const nextStatusMap: Partial<Record<OrderStatus, OrderStatus>> = {
    [OrderStatus.PENDING]:          OrderStatus.CONFIRMED,
    [OrderStatus.CONFIRMED]:        OrderStatus.PREPARING,
    [OrderStatus.PREPARING]:        OrderStatus.READY_FOR_PICKUP,
    [OrderStatus.READY_FOR_PICKUP]: OrderStatus.OUT_FOR_DELIVERY,
    [OrderStatus.OUT_FOR_DELIVERY]: OrderStatus.DELIVERED,
  };
  const nextStatusLabel: Partial<Record<OrderStatus, string>> = {
    [OrderStatus.PENDING]:          "قبول الطلب",
    [OrderStatus.CONFIRMED]:        "بدء التحضير",
    [OrderStatus.PREPARING]:        "جاهز للاستلام",
    [OrderStatus.READY_FOR_PICKUP]: "خرج للتوصيل",
    [OrderStatus.OUT_FOR_DELIVERY]: "تم التوصيل",
  };

  const next = nextStatusMap[order.status];
  const nextLabel = nextStatusLabel[order.status];

  return (
    <DialogContent title={`تفاصيل الطلب ${order.orderNumber}`}>
      <div className="space-y-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">الحالة</span>
          <OrderStatusBadge status={order.status} />
        </div>

        <div className="bg-muted/50 rounded-xl p-4 space-y-2">
          <h4 className="text-sm font-bold">بيانات العميل</h4>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">الاسم</span>
            <span className="font-medium">{order.customerName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">الهاتف</span>
            <span className="font-medium" dir="ltr">{order.customerPhone}</span>
          </div>
          {order.customerNotes && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">ملاحظات</span>
              <span className="font-medium text-yellow-600">{order.customerNotes}</span>
            </div>
          )}
        </div>

        <div>
          <h4 className="text-sm font-bold mb-2">الوجبات</h4>
          <div className="space-y-2">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm bg-muted/30 rounded-lg px-3 py-2">
                <span>{item.mealName}</span>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">× {item.quantity}</span>
                  <span className="font-bold">{formatCurrency(item.totalPrice)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-border pt-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">المجموع الفرعي</span>
            <span>{formatCurrency(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">رسوم التوصيل</span>
            <span>{formatCurrency(order.deliveryFee)}</span>
          </div>
          {order.discountAmount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>خصم</span>
              <span>- {formatCurrency(order.discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base border-t border-border pt-2">
            <span>الإجمالي</span>
            <span className="text-primary">{formatCurrency(order.totalAmount)}</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>طريقة الدفع</span>
            <span>{paymentMethodLabel[order.paymentMethod]}</span>
          </div>
        </div>

        {next && nextLabel && (
          <div className="flex gap-2 pt-2">
            <Button
              className="flex-1"
              onClick={() =>
                updateStatus.mutate(
                  { id: order.id, data: { status: next } },
                  { onSuccess: () => success("تم تحديث الطلب") },
                )
              }
              loading={updateStatus.isPending}
            >
              <Check className="w-4 h-4" /> {nextLabel}
            </Button>
            {order.status === OrderStatus.PENDING && (
              <Button
                variant="danger"
                onClick={() =>
                  updateStatus.mutate(
                    { id: order.id, data: { status: OrderStatus.CANCELLED } },
                    { onSuccess: () => success("تم رفض الطلب") },
                  )
                }
                loading={updateStatus.isPending}
              >
                <X className="w-4 h-4" /> رفض
              </Button>
            )}
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setShowChat((v) => !v)}
        >
          <MessageSquare className="w-4 h-4" />
          {showChat ? "إخفاء المحادثة" : "فتح المحادثة"}
        </Button>

        {showChat && <ChatPanel orderId={order.id} />}
      </div>
    </DialogContent>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [newOrderBanner, setNewOrderBanner] = useState<string | null>(null);
  const { success } = useToast();
  const queryClient = useQueryClient();
  const { on } = useSocket();

  // Real-time: new order + status change
  useEffect(() => {
    const offNew = on("order:new", (data: any) => {
      playNotificationSound();
      setNewOrderBanner(`طلب جديد #${data.orderNumber} — ${data.totalAmount} شيكل`);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setTimeout(() => setNewOrderBanner(null), 6000);
    });

    const offStatus = on("order:status", () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    });

    return () => { offNew(); offStatus(); };
  }, [on, queryClient]);

  const { data: restaurant } = useRestaurant();
  const { data, isLoading, refetch, isFetching } = useOrders({
    restaurantId: restaurant?.id,
    status: statusFilter !== "all" ? (statusFilter as OrderStatus) : undefined,
    page,
    limit: 10,
  });

  const updateStatus = useUpdateOrderStatus();

  const raw = data as unknown;
  const orders: Order[] = Array.isArray(raw)
    ? (raw as Order[])
    : Array.isArray((raw as PaginatedOrders | undefined)?.data)
      ? ((raw as PaginatedOrders).data)
      : [];
  const total = (raw as PaginatedOrders | undefined)?.total ?? orders.length;

  const filtered = search
    ? orders.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
          o.customerName?.toLowerCase().includes(search.toLowerCase()),
      )
    : orders;

  return (
    <div className="flex flex-col h-full">
      <Header />
      <div className="flex-1 p-5 space-y-4">

        {/* New order banner */}
        {newOrderBanner && (
          <div className="bg-primary text-white rounded-xl px-5 py-3 flex items-center justify-between animate-pulse">
            <span className="font-bold text-sm">🔔 {newOrderBanner}</span>
            <button onClick={() => setNewOrderBanner(null)} className="text-white/70 hover:text-white text-lg leading-none">×</button>
          </div>
        )}

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-black text-foreground">إدارة الطلبات</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{total} طلب</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} loading={isFetching}>
            <RefreshCw className="w-4 h-4" /> تحديث
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-border p-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث برقم الطلب أو اسم العميل..."
              className="w-full h-9 pr-9 pl-3 rounded-lg border border-border bg-muted/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {statusFilters.map((f) => (
              <button
                key={f.value}
                onClick={() => { setStatusFilter(f.value); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === f.value ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <p className="text-lg font-semibold">لا توجد طلبات</p>
              <p className="text-sm mt-1">جرّب تغيير الفلاتر</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-right px-5 py-3 text-xs font-bold text-muted-foreground">رقم الطلب</th>
                    <th className="text-right px-5 py-3 text-xs font-bold text-muted-foreground">العميل</th>
                    <th className="text-right px-5 py-3 text-xs font-bold text-muted-foreground">الوجبات</th>
                    <th className="text-right px-5 py-3 text-xs font-bold text-muted-foreground">الإجمالي</th>
                    <th className="text-right px-5 py-3 text-xs font-bold text-muted-foreground">الحالة</th>
                    <th className="text-right px-5 py-3 text-xs font-bold text-muted-foreground">الوقت</th>
                    <th className="text-right px-5 py-3 text-xs font-bold text-muted-foreground">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((order) => (
                    <tr key={order.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-4">
                        <span className="font-bold text-sm">{order.orderNumber}</span>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold">{order.customerName}</p>
                        <p className="text-xs text-muted-foreground" dir="ltr">{order.customerPhone}</p>
                      </td>
                      <td className="px-5 py-4 text-sm">
                        {order.items[0]?.mealName}
                        {order.items.length > 1 && <span className="text-muted-foreground"> +{order.items.length - 1}</span>}
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-bold text-primary">{formatCurrency(order.totalAmount)}</span>
                      </td>
                      <td className="px-5 py-4"><OrderStatusBadge status={order.status} /></td>
                      <td className="px-5 py-4">
                        <p className="text-xs text-muted-foreground">{formatRelativeTime(order.createdAt)}</p>
                        <p className="text-xs text-muted-foreground">{formatTime(order.createdAt)}</p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {order.status === OrderStatus.PENDING && (
                            <>
                              <Button size="icon" variant="success" className="w-8 h-8 rounded-lg"
                                onClick={() => updateStatus.mutate({ id: order.id, data: { status: OrderStatus.CONFIRMED } }, { onSuccess: () => success("تم قبول الطلب") })}>
                                <Check className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="icon" variant="danger" className="w-8 h-8 rounded-lg"
                                onClick={() => updateStatus.mutate({ id: order.id, data: { status: OrderStatus.CANCELLED } }, { onSuccess: () => success("تم رفض الطلب") })}>
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="icon" variant="outline" className="w-8 h-8 rounded-lg">
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                            </DialogTrigger>
                            <OrderDetailDialog order={order} />
                          </Dialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {total > 10 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              عرض {(page - 1) * 10 + 1}–{Math.min(page * 10, total)} من {total}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                <ChevronRight className="w-4 h-4" /> السابق
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page * 10 >= total}>
                التالي <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
