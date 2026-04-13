"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { useOrders } from "@/hooks/useOrders";
import { useUpdateOrderStatus } from "@/hooks/useOrders";
import { OrderStatus, Order, PaymentMethod } from "@/types/order.types";
import { OrderStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { formatCurrency, formatDate, formatTime, formatRelativeTime } from "@/lib/utils";
import { Check, X, Eye, ChevronRight, ChevronLeft, Search, RefreshCw } from "lucide-react";
import { useToast } from "@/providers/ToastProvider";

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

// Mock orders for display
const mockOrders: Order[] = [
  {
    id: "1", orderNumber: "#KHz2", customerId: "c1", customerName: "Ahmed Khalil",
    customerPhone: "+966501234567", restaurantId: "r1",
    status: OrderStatus.PENDING, subtotal: 150, deliveryFee: 14,
    discountAmount: 0, totalAmount: 164,
    paymentMethod: PaymentMethod.CASH_ON_DELIVERY, paymentStatus: "unpaid" as never,
    customerNotes: null, estimatedDeliveryAt: null, deliveredAt: null,
    createdAt: new Date(Date.now() - 2 * 60000).toISOString(),
    items: [{ id: "i1", mealId: "m1", mealName: "واجو برجر مميز", quantity: 2, unitPrice: 75, totalPrice: 150, notes: null }],
  },
  {
    id: "2", orderNumber: "#Khs1", customerId: "c2", customerName: "Sarah Al-Dosari",
    customerPhone: "+966507654321", restaurantId: "r1",
    status: OrderStatus.PREPARING, subtotal: 60, deliveryFee: 8,
    discountAmount: 0, totalAmount: 68,
    paymentMethod: PaymentMethod.CARD, paymentStatus: "paid" as never,
    customerNotes: "بدون بصل من فضلك", estimatedDeliveryAt: null, deliveredAt: null,
    createdAt: new Date(Date.now() - 8 * 60000).toISOString(),
    items: [{ id: "i2", mealId: "m2", mealName: "كلاسيك ماك باربيكيو", quantity: 2, unitPrice: 30, totalPrice: 60, notes: "بدون بصل" }],
  },
  {
    id: "3", orderNumber: "#333", customerId: "c3", customerName: "Omar Falak",
    customerPhone: "+966509876543", restaurantId: "r1",
    status: OrderStatus.DELIVERED, subtotal: 195, deliveryFee: 15,
    discountAmount: 0, totalAmount: 210,
    paymentMethod: PaymentMethod.ONLINE, paymentStatus: "paid" as never,
    customerNotes: null, estimatedDeliveryAt: null, deliveredAt: new Date().toISOString(),
    createdAt: new Date(Date.now() - 90 * 60000).toISOString(),
    items: [
      { id: "i3", mealId: "m3", mealName: "جاردن كينوا بول", quantity: 3, unitPrice: 65, totalPrice: 195, notes: null },
    ],
  },
  {
    id: "4", orderNumber: "#444", customerId: "c4", customerName: "Nour Hassan",
    customerPhone: "+966502468135", restaurantId: "r1",
    status: OrderStatus.CONFIRMED, subtotal: 120, deliveryFee: 10,
    discountAmount: 10, totalAmount: 120,
    paymentMethod: PaymentMethod.CASH_ON_DELIVERY, paymentStatus: "unpaid" as never,
    customerNotes: null, estimatedDeliveryAt: null, deliveredAt: null,
    createdAt: new Date(Date.now() - 25 * 60000).toISOString(),
    items: [{ id: "i4", mealId: "m4", mealName: "سيزر سالاد دجاج", quantity: 2, unitPrice: 60, totalPrice: 120, notes: null }],
  },
];

function OrderDetailDialog({ order }: { order: Order }) {
  const updateStatus = useUpdateOrderStatus();
  const { success, error } = useToast();

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
      <div className="space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">الحالة الحالية</span>
          <OrderStatusBadge status={order.status} />
        </div>

        {/* Customer */}
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
              <span className="font-medium text-warning">{order.customerNotes}</span>
            </div>
          )}
        </div>

        {/* Items */}
        <div>
          <h4 className="text-sm font-bold mb-2">الوجبات المطلوبة</h4>
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

        {/* Totals */}
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
            <div className="flex justify-between text-success">
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

        {/* Action buttons */}
        {next && nextLabel && (
          <div className="flex gap-2 pt-2">
            <Button
              className="flex-1"
              onClick={() =>
                updateStatus.mutate(
                  { id: order.id, data: { status: next } },
                  { onSuccess: () => success("تم تحديث الطلب") }
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
                    { onSuccess: () => success("تم رفض الطلب") }
                  )
                }
                loading={updateStatus.isPending}
              >
                <X className="w-4 h-4" /> رفض
              </Button>
            )}
          </div>
        )}
      </div>
    </DialogContent>
  );
}

export default function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const { success, error: toastError } = useToast();

  const { data, isLoading, refetch, isFetching } = useOrders({
    status: statusFilter !== "all" ? (statusFilter as OrderStatus) : undefined,
    page,
    limit: 10,
  });

  const updateStatus = useUpdateOrderStatus();

  const orders: Order[] = data?.data?.length ? data.data : mockOrders;
  const total = data?.total ?? mockOrders.length;

  const filtered = search
    ? orders.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
          o.customerName.toLowerCase().includes(search.toLowerCase())
      )
    : orders;

  return (
    <div className="flex flex-col h-full">
      <Header />
      <div className="flex-1 p-5 space-y-4">
        {/* Page title */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-black text-foreground">إدارة الطلبات</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {total} طلب إجمالاً
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            loading={isFetching}
          >
            <RefreshCw className="w-4 h-4" /> تحديث
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-border p-4 flex flex-wrap gap-3 items-center">
          {/* Search */}
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

          {/* Status filter tabs */}
          <div className="flex flex-wrap gap-1.5">
            {statusFilters.map((f) => (
              <button
                key={f.value}
                onClick={() => { setStatusFilter(f.value); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === f.value
                    ? "bg-primary text-white"
                    : "bg-muted text-muted-foreground hover:text-foreground"
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
                        <span className="font-bold text-sm text-foreground">{order.orderNumber}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{order.customerName}</p>
                          <p className="text-xs text-muted-foreground" dir="ltr">{order.customerPhone}</p>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm text-foreground">
                          {order.items[0]?.mealName}
                          {order.items.length > 1 && (
                            <span className="text-muted-foreground"> +{order.items.length - 1}</span>
                          )}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-bold text-primary">
                          {formatCurrency(order.totalAmount)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <OrderStatusBadge status={order.status} />
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-xs text-muted-foreground">{formatRelativeTime(order.createdAt)}</p>
                        <p className="text-xs text-muted-foreground">{formatTime(order.createdAt)}</p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {order.status === OrderStatus.PENDING && (
                            <>
                              <Button
                                size="icon"
                                variant="success"
                                className="w-8 h-8 rounded-lg"
                                onClick={() =>
                                  updateStatus.mutate(
                                    { id: order.id, data: { status: OrderStatus.CONFIRMED } },
                                    { onSuccess: () => success("تم قبول الطلب") }
                                  )
                                }
                              >
                                <Check className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="danger"
                                className="w-8 h-8 rounded-lg"
                                onClick={() =>
                                  updateStatus.mutate(
                                    { id: order.id, data: { status: OrderStatus.CANCELLED } },
                                    { onSuccess: () => success("تم رفض الطلب") }
                                  )
                                }
                              >
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronRight className="w-4 h-4" /> السابق
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page * 10 >= total}
              >
                التالي <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
