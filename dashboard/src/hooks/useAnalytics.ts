"use client";

import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import type {
  AnalyticsOverview,
  OrdersAnalytics,
  RevenueAnalytics,
  TopMeal,
  CustomersAnalytics,
  RatingsAnalytics,
  DeliveryAnalytics,
  PaymentsAnalytics,
  PerformanceReport,
  ReportPeriod,
} from "@/types/analytics.types";

function unwrap<T>(payload: unknown): T {
  const root = payload as { data?: T } | T;
  if (root && typeof root === "object" && "data" in (root as object)) {
    return (root as { data: T }).data;
  }
  return root as T;
}

export function useAnalyticsOverview() {
  return useQuery<AnalyticsOverview>({
    queryKey: queryKeys.analytics.overview,
    queryFn: async () => unwrap<AnalyticsOverview>((await analyticsApi.overview()).data),
    refetchInterval: 60 * 1000,
  });
}

export function useAnalyticsOrders() {
  return useQuery<OrdersAnalytics>({
    queryKey: queryKeys.analytics.orders,
    queryFn: async () => unwrap<OrdersAnalytics>((await analyticsApi.orders()).data),
  });
}

export function useAnalyticsRevenue() {
  return useQuery<RevenueAnalytics>({
    queryKey: queryKeys.analytics.revenue,
    queryFn: async () => unwrap<RevenueAnalytics>((await analyticsApi.revenue()).data),
  });
}

export function useAnalyticsTopMeals() {
  return useQuery<{ top: TopMeal[] }>({
    queryKey: queryKeys.analytics.topMeals,
    queryFn: async () => unwrap<{ top: TopMeal[] }>((await analyticsApi.topMeals()).data),
  });
}

export function useAnalyticsCustomers() {
  return useQuery<CustomersAnalytics>({
    queryKey: queryKeys.analytics.customers,
    queryFn: async () => unwrap<CustomersAnalytics>((await analyticsApi.customers()).data),
  });
}

export function useAnalyticsRatings() {
  return useQuery<RatingsAnalytics>({
    queryKey: queryKeys.analytics.ratings,
    queryFn: async () => unwrap<RatingsAnalytics>((await analyticsApi.ratings()).data),
  });
}

export function useAnalyticsDelivery() {
  return useQuery<DeliveryAnalytics>({
    queryKey: queryKeys.analytics.delivery,
    queryFn: async () => unwrap<DeliveryAnalytics>((await analyticsApi.delivery()).data),
  });
}

export function useAnalyticsPayments() {
  return useQuery<PaymentsAnalytics>({
    queryKey: queryKeys.analytics.payments,
    queryFn: async () => unwrap<PaymentsAnalytics>((await analyticsApi.payments()).data),
  });
}

export function useAnalyticsReport(period: ReportPeriod) {
  return useQuery<PerformanceReport>({
    queryKey: queryKeys.analytics.report(period),
    queryFn: async () => unwrap<PerformanceReport>((await analyticsApi.report(period)).data),
    placeholderData: (prev) => prev,
  });
}
