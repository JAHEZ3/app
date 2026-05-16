"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Bike,
  Building2,
  CheckCircle,
  Clock,
  CreditCard,
  MapPin,
  Package,
  Phone,
  ShoppingBag,
  User,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { adminOrdersApi, type AdminOrderDetails } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { formatCurrency, formatDateTime } from "@/lib/utils";

interface OrderDetailsDialogProps {
  orderId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusLabel: Record<AdminOrderDetails["order"]["status"], string> = {
  pending: "بانتظار التأكيد",
  confirmed: "مؤكّد",
  preparing: "قيد التحضير",
  ready_for_pickup: "جاهز للاستلام",
  out_for_delivery: "في الطريق",
  delivered: "مكتمل",
  cancelled: "ملغي",
  refunded: "مُسترد",
};

const statusVariant: Record<
  AdminOrderDetails["order"]["status"],
  "success" | "warning" | "info" | "error" | "muted" | "default"
> = {
  pending: "warning",
  confirmed: "info",
  preparing: "default",
  ready_for_pickup: "info",
  out_for_delivery: "info",
  delivered: "success",
  cancelled: "error",
  refunded: "muted",
};

const statusIcon: Record<AdminOrderDetails["order"]["status"], React.ReactNode> =
  {
    pending: <Clock className="w-3.5 h-3.5" />,
    confirmed: <CheckCircle className="w-3.5 h-3.5" />,
    preparing: <Package className="w-3.5 h-3.5" />,
    ready_for_pickup: <Package className="w-3.5 h-3.5" />,
    out_for_delivery: <Bike className="w-3.5 h-3.5" />,
    delivered: <CheckCircle className="w-3.5 h-3.5" />,
    cancelled: <XCircle className="w-3.5 h-3.5" />,
    refunded: <XCircle className="w-3.5 h-3.5" />,
  };

const paymentMethodLabel: Record<
  AdminOrderDetails["payment"]["method"],
  string
> = {
  cash_on_delivery: "الدفع عند الاستلام",
  card: "بطاقة",
  online: "دفع إلكتروني",
};

const paymentStatusLabel: Record<
  AdminOrderDetails["payment"]["status"],
  string
> = {
  unpaid: "غير مدفوع",
  paid: "مدفوع",
  refunded: "مُسترد",
};

const paymentStatusVariant: Record<
  AdminOrderDetails["payment"]["status"],
  "success" | "warning" | "muted"
> = {
  paid: "success",
  unpaid: "warning",
  refunded: "muted",
};

const deliveryStatusLabel: Record<string, string> = {
  assigned: "تم التعيين",
  heading_to_restaurant: "متوجّه للمطعم",
  picked_up: "تم الاستلام",
  heading_to_customer: "متوجّه للعميل",
  delivered: "تم التوصيل",
  failed: "فشل",
};

function Row({
  label,
  value,
  emphasize,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <span
        className={
          emphasize
            ? "text-sm font-bold text-foreground"
            : "text-xs text-muted-foreground"
        }
      >
        {label}
      </span>
      <span className="text-sm font-medium text-foreground text-left max-w-[60%] break-words">
        {value}
      </span>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4">
      <div className="flex items-center gap-2 mb-2 text-foreground">
        <span className="w-7 h-7 rounded-lg bg-white border border-border flex items-center justify-center text-primary">
          {icon}
        </span>
        <h3 className="text-sm font-bold">{title}</h3>
      </div>
      <div className="divide-y divide-border/60">{children}</div>
    </div>
  );
}

export function OrderDetailsDialog({
  orderId,
  open,
  onOpenChange,
}: OrderDetailsDialogProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.orders.one(orderId ?? ""),
    queryFn: async () => {
      const res = await adminOrdersApi.getOne(orderId as string);
      return res.data.data;
    },
    enabled: open && !!orderId,
    retry: false,
  });

  const orderNumber = data?.order.orderNumber ?? "—";
  const status = data?.order.status;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <DialogTitle>
              تفاصيل الطلب{" "}
              <span className="font-mono text-primary">{orderNumber}</span>
            </DialogTitle>
            {status && (
              <Badge
                variant={statusVariant[status]}
                className="flex items-center gap-1"
              >
                {statusIcon[status]}
                {statusLabel[status]}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <DialogBody className="space-y-3">
          {isLoading && (
            <div className="space-y-3">
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
            </div>
          )}

          {isError && !isLoading && (
            <div className="text-center py-10 text-muted-foreground text-sm">
              تعذّر تحميل تفاصيل الطلب.
            </div>
          )}

          {data && !isLoading && (
            <>
              <Section title="الطلب" icon={<ShoppingBag className="w-4 h-4" />}>
                <Row label="رقم الطلب" value={data.order.orderNumber} />
                <Row
                  label="تاريخ الإنشاء"
                  value={formatDateTime(data.order.createdAt)}
                />
                {data.order.estimatedDeliveryAt && (
                  <Row
                    label="موعد التسليم المتوقع"
                    value={formatDateTime(data.order.estimatedDeliveryAt)}
                  />
                )}
                {data.order.deliveredAt && (
                  <Row
                    label="تاريخ التسليم"
                    value={formatDateTime(data.order.deliveredAt)}
                  />
                )}
                {data.order.customerNotes && (
                  <Row label="ملاحظات العميل" value={data.order.customerNotes} />
                )}
              </Section>

              <Section title="العميل" icon={<User className="w-4 h-4" />}>
                <Row label="الاسم" value={data.customer.name || "—"} />
                <Row
                  label="الهاتف"
                  value={
                    data.customer.phone ? (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                        <span dir="ltr">{data.customer.phone}</span>
                      </span>
                    ) : (
                      "—"
                    )
                  }
                />
                {data.customer.address && (
                  <Row
                    label="العنوان"
                    value={
                      <span className="inline-flex items-start gap-1">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
                        <span>
                          {[
                            data.customer.address.label,
                            data.customer.address.street,
                            data.customer.address.city,
                          ]
                            .filter(Boolean)
                            .join("، ") || "—"}
                        </span>
                      </span>
                    }
                  />
                )}
              </Section>

              <Section
                title="المطعم"
                icon={<Building2 className="w-4 h-4" />}
              >
                <Row label="الاسم" value={data.restaurant.name || "—"} />
                {data.restaurant.city && (
                  <Row label="المدينة" value={data.restaurant.city} />
                )}
              </Section>

              <Section title="التوصيل" icon={<Bike className="w-4 h-4" />}>
                {data.delivery ? (
                  <>
                    <Row
                      label="السائق"
                      value={data.delivery.agent?.name ?? "—"}
                    />
                    <Row
                      label="الحالة"
                      value={
                        deliveryStatusLabel[data.delivery.status] ??
                        data.delivery.status
                      }
                    />
                    {data.delivery.distanceKm != null && (
                      <Row
                        label="المسافة"
                        value={`${data.delivery.distanceKm.toFixed(2)} كم`}
                      />
                    )}
                    {data.delivery.agentEarnings != null && (
                      <Row
                        label="عائد السائق"
                        value={formatCurrency(data.delivery.agentEarnings)}
                      />
                    )}
                    {data.delivery.deliveredAt && (
                      <Row
                        label="وقت التسليم"
                        value={formatDateTime(data.delivery.deliveredAt)}
                      />
                    )}
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground py-2">
                    لم يتم تعيين سائق بعد.
                  </p>
                )}
              </Section>

              <Section
                title="الدفع"
                icon={<CreditCard className="w-4 h-4" />}
              >
                <Row
                  label="الطريقة"
                  value={paymentMethodLabel[data.payment.method]}
                />
                <Row
                  label="حالة الدفع"
                  value={
                    <Badge variant={paymentStatusVariant[data.payment.status]}>
                      {paymentStatusLabel[data.payment.status]}
                    </Badge>
                  }
                />
                <Row
                  label="المجموع الفرعي"
                  value={formatCurrency(data.payment.subtotal)}
                />
                <Row
                  label="رسوم التوصيل"
                  value={formatCurrency(data.payment.deliveryFee)}
                />
                {data.payment.discountAmount > 0 && (
                  <Row
                    label="الخصم"
                    value={`- ${formatCurrency(data.payment.discountAmount)}`}
                  />
                )}
                <Row
                  emphasize
                  label="الإجمالي"
                  value={
                    <span className="font-black text-primary text-base">
                      {formatCurrency(data.payment.totalAmount)}
                    </span>
                  }
                />
              </Section>

              <Section
                title={`الأصناف (${data.items.length})`}
                icon={<Package className="w-4 h-4" />}
              >
                {data.items.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">
                    لا توجد أصناف.
                  </p>
                ) : (
                  <ul className="divide-y divide-border/60">
                    {data.items.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-start justify-between gap-3 py-2"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-foreground">
                            {item.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.quantity} ×{" "}
                            {formatCurrency(item.unitPrice)}
                          </p>
                          {item.specialInstructions && (
                            <p className="text-xs text-muted-foreground mt-1 italic">
                              {item.specialInstructions}
                            </p>
                          )}
                        </div>
                        <span className="text-sm font-bold text-foreground whitespace-nowrap">
                          {formatCurrency(item.totalPrice)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            </>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
