import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";
import type { ApiResponse, PlatformStatsDTO } from "@/types/dto";

const STATS_KEYS = {
  all: ["stats"] as const,
  platform: () => [...STATS_KEYS.all, "platform"] as const,
};

async function fetchPlatformStats(): Promise<PlatformStatsDTO> {
  const { data } = await apiClient.get<ApiResponse<PlatformStatsDTO>>(
    "/public/stats"
  );
  return data.data;
}

export function usePlatformStats() {
  return useQuery({
    queryKey: STATS_KEYS.platform(),
    queryFn: fetchPlatformStats,
    placeholderData: {
      restaurantCount: 1200,
      avgDeliveryMinutes: 30,
      appRating: 4.6,
      cityCount: 12,
      orderCount: 500000,
      deliveryPartnerCount: 800,
    },
  });
}
