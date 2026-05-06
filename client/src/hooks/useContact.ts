import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";
import type {
  ApiResponse,
  ContactInfoDTO,
  ContactSubmitDTO,
  ContactSubmitResponseDTO,
} from "@/types/dto";

const CONTACT_KEYS = {
  all: ["contact"] as const,
  info: () => [...CONTACT_KEYS.all, "info"] as const,
};

async function fetchContactInfo(): Promise<ContactInfoDTO> {
  const { data } = await apiClient.get<ApiResponse<ContactInfoDTO>>(
    "/public/contact/info"
  );
  return data.data;
}

export function useContactInfo() {
  return useQuery({
    queryKey: CONTACT_KEYS.info(),
    queryFn: fetchContactInfo,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSubmitContact() {
  return useMutation({
    mutationFn: async (
      payload: ContactSubmitDTO
    ): Promise<ContactSubmitResponseDTO> => {
      const { data } = await apiClient.post<
        ApiResponse<ContactSubmitResponseDTO>
      >("/public/contact", payload);
      return data.data;
    },
  });
}
