import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,        // 30s
      gcTime: 5 * 60 * 1000,       // 5m
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

// Query keys
export const queryKeys = {
  auth: {
    me: ["auth", "me"] as const,
  },
  restaurant: {
    me: ["restaurant", "me"] as const,
    stats: ["restaurant", "stats"] as const,
    sales: (period: string) => ["restaurant", "sales", period] as const,
    topMeals: ["restaurant", "top-meals"] as const,
    hours: ["restaurant", "hours"] as const,
  },
  orders: {
    all: (filters?: object) => ["orders", filters] as const,
    detail: (id: string) => ["orders", id] as const,
  },
  menu: {
    all: ["menu"] as const,
  },
};
