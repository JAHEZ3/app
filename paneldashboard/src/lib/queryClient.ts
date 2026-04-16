import { QueryClient } from "@tanstack/react-query";

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
    all: (params?: object) => ["users", params] as const,
    one: (id: string) => ["users", id] as const,
  },
  restaurants: {
    all: (params?: object) => ["restaurants", params] as const,
    one: (id: string) => ["restaurants", id] as const,
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
