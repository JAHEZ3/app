import { QueryClient } from "@tanstack/react-query";
import type { ListAgentsParams } from "@/types/delivery.types";
import type { ListRestaurantsParams } from "@/types/restaurant.types";
import type { ListUsersParams } from "@/types/user.types";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 min
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const queryKeys = {
  auth: {
    me: ["auth", "me"] as const,
  },
  users: {
    root: ["users"] as const,
    list: (params?: ListUsersParams) => ["users", "list", params ?? {}] as const,
    detail: (id: string) => ["users", "detail", id] as const,
    /** @deprecated use `list` with typed params */
    all: (params?: object) => ["users", "list", params ?? {}] as const,
    /** @deprecated use `detail` */
    one: (id: string) => ["users", "detail", id] as const,
  },
  restaurants: {
    root: ["restaurants"] as const,
    list: (params?: ListRestaurantsParams) =>
      ["restaurants", "list", params ?? {}] as const,
    detail: (id: string) => ["restaurants", "detail", id] as const,
    applications: ["restaurants", "applications"] as const,
    /** @deprecated use `list` with typed params */
    all: (params?: object) => ["restaurants", "list", params ?? {}] as const,
    /** @deprecated use `detail` */
    one: (id: string) => ["restaurants", "detail", id] as const,
  },
  deliveryAgents: {
    root: ["delivery-agents"] as const,
    list: (params?: ListAgentsParams) =>
      ["delivery-agents", "list", params ?? {}] as const,
    detail: (id: string) => ["delivery-agents", "detail", id] as const,
    applications: ["delivery-agents", "applications"] as const,
  },
  orders: {
    all: (params?: object) => ["orders", params] as const,
    one: (id: string) => ["orders", id] as const,
  },
  settings: ["settings"] as const,
  stats: {
    overview: ["stats", "overview"] as const,
  },
};
