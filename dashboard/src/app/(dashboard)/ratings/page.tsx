"use client";

import { useState } from "react";
import { Star, MessageSquare, Truck, UtensilsCrossed, Users } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { CardSkeleton, Skeleton } from "@/components/ui/skeleton";
import { useAnalyticsReviews } from "@/hooks/useAnalytics";
import type { Review } from "@/types/analytics.types";

const PAGE_SIZE = 10;

function formatDate(d: string) {
  const date = new Date(d);
  return new Intl.DateTimeFormat("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function Stars({ value, size = "sm" }: { value: number; size?: "sm" | "lg" }) {
  const filled = Math.round(value);
  const px = size === "lg" ? "w-6 h-6" : "w-4 h-4";
  return (
    <div className="flex items-center gap-0.5" dir="ltr">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${px} ${
            i <= filled ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200"
          }`}
        />
      ))}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-border p-5">
      <div className="flex items-start justify-between mb-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}
        >
          {icon}
        </div>
      </div>
      <p className="text-2xl font-black text-foreground tabular-nums">{value}</p>
      <p className="text-xs font-medium text-muted-foreground mt-1">{label}</p>
      {sub && <div className="mt-1.5">{sub}</div>}
    </div>
  );
}

function DistributionRow({
  stars,
  count,
  total,
}: {
  stars: number;
  count: number;
  total: number;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-6 text-muted-foreground tabular-nums">{stars}</span>
      <Star className="w-4 h-4 fill-amber-400 text-amber-400 shrink-0" />
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-amber-400 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-12 text-left text-xs font-medium text-muted-foreground tabular-nums">
        {count}
      </span>
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const customerLabel = `عميل #${review.customerId.slice(0, 6).toUpperCase()}`;
  return (
    <article className="bg-white rounded-xl border border-border p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
            {customerLabel[5] ?? "ع"}
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">{customerLabel}</p>
            <p className="text-xs text-muted-foreground">
              {formatDate(review.createdAt)}
            </p>
          </div>
        </div>
        <Stars value={review.foodRating} />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="flex items-center gap-2 text-xs bg-muted/50 rounded-lg px-3 py-2">
          <UtensilsCrossed className="w-4 h-4 text-orange-500" />
          <span className="text-muted-foreground">الطعام</span>
          <span className="font-bold text-foreground tabular-nums mr-auto">
            {review.foodRating.toFixed(1)}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs bg-muted/50 rounded-lg px-3 py-2">
          <Truck className="w-4 h-4 text-indigo-500" />
          <span className="text-muted-foreground">التوصيل</span>
          <span className="font-bold text-foreground tabular-nums mr-auto">
            {review.deliveryRating.toFixed(1)}
          </span>
        </div>
      </div>

      {review.comment && (
        <div className="flex gap-2 text-sm text-foreground bg-amber-50/50 border border-amber-100 rounded-lg p-3">
          <MessageSquare className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="leading-relaxed whitespace-pre-wrap">{review.comment}</p>
        </div>
      )}
    </article>
  );
}

export default function RatingsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAnalyticsReviews(page, PAGE_SIZE);

  const summary = data?.summary;
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // The distribution returns rows for stars that exist; pad to 5..1
  const distributionMap = new Map<number, number>();
  summary?.distribution.forEach((d) => distributionMap.set(d.stars, d.count));

  return (
    <>
      <Header />
      <div className="flex-1 p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-black text-foreground">التقييمات</h1>
          <p className="text-sm text-muted-foreground mt-1">
            ملخّص تقييمات العملاء وآراؤهم على طلبات مطعمك
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {isLoading ? (
            <>
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </>
          ) : (
            <>
              <StatCard
                icon={<Star className="w-5 h-5 text-amber-600" />}
                color="bg-amber-50"
                label="متوسط تقييم الطعام"
                value={(summary?.avgFoodRating ?? 0).toFixed(2)}
                sub={<Stars value={summary?.avgFoodRating ?? 0} size="lg" />}
              />
              <StatCard
                icon={<Truck className="w-5 h-5 text-indigo-600" />}
                color="bg-indigo-50"
                label="متوسط تقييم التوصيل"
                value={(summary?.avgDeliveryRating ?? 0).toFixed(2)}
                sub={<Stars value={summary?.avgDeliveryRating ?? 0} size="lg" />}
              />
              <StatCard
                icon={<Users className="w-5 h-5 text-emerald-600" />}
                color="bg-emerald-50"
                label="إجمالي التقييمات"
                value={summary?.totalRatings ?? 0}
              />
            </>
          )}
        </div>

        {/* Distribution + Reviews */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-border p-5 lg:col-span-1 h-fit">
            <h3 className="text-base font-bold text-foreground mb-4">
              توزيع التقييمات
            </h3>
            {isLoading ? (
              <div className="space-y-3">
                {[5, 4, 3, 2, 1].map((s) => (
                  <Skeleton key={s} className="h-6" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {[5, 4, 3, 2, 1].map((s) => (
                  <DistributionRow
                    key={s}
                    stars={s}
                    count={distributionMap.get(s) ?? 0}
                    total={summary?.totalRatings ?? 0}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">
                آراء العملاء
              </h3>
              {!isLoading && total > 0 && (
                <span className="text-xs text-muted-foreground">
                  {total} تقييم
                </span>
              )}
            </div>

            {isLoading ? (
              <div className="space-y-3">
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
              </div>
            ) : items.length === 0 ? (
              <div className="bg-white rounded-xl border border-border p-10 text-center">
                <Star className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground">
                  لا توجد تقييمات بعد
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  ستظهر هنا بمجرد أن يقيّم العملاء طلباتهم
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((r) => (
                  <ReviewCard key={r.id} review={r} />
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-4 py-2 text-sm font-semibold rounded-xl border border-border bg-white text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition-colors"
                >
                  السابق
                </button>
                <span className="text-xs font-medium text-muted-foreground tabular-nums">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-4 py-2 text-sm font-semibold rounded-xl border border-border bg-white text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition-colors"
                >
                  التالي
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
