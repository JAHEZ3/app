"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { ordersApi } from "@/lib/api";
import { queryKeys, queryClient } from "@/lib/queryClient";
import { Order, PaginatedOrders, OrderFilters } from "@/types/order.types";
import { UpdateOrderStatusDto } from "@/dto/order.dto";

export function useOrders(filters?: OrderFilters) {
  return useQuery<PaginatedOrders>({
    queryKey: queryKeys.orders.all(filters),
    queryFn: async () => {
      const res = await ordersApi.getAll(filters);
      return res.data;
    },
    refetchInterval: 30 * 1000, // live updates every 30s
  });
}

export function useOrder(id: string) {
  return useQuery<Order>({
    queryKey: queryKeys.orders.detail(id),
    queryFn: async () => {
      const res = await ordersApi.getOne(id);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useUpdateOrderStatus() {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateOrderStatusDto }) =>
      ordersApi.updateStatus(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.restaurant.stats });
    },
  });
}
