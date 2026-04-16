"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { authApi } from "@/lib/api";
import { queryKeys, queryClient } from "@/lib/queryClient";
import { LoginCredentials, AdminUser } from "@/types/auth.types";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";

export function useMe() {
  return useQuery<AdminUser>({
    queryKey: queryKeys.auth.me,
    queryFn: async () => {
      const res = await authApi.me();
      return res.data;
    },
    retry: false,
  });
}

export function useLogin() {
  const router = useRouter();
  return useMutation({
    mutationFn: async (creds: LoginCredentials) => {
      const res = await authApi.login(creds.email, creds.password);
      return res.data;
    },
    onSuccess: (data) => {
      // Support both { tokens: { accessToken } } and { accessToken } response shapes
      const accessToken = data.tokens?.accessToken ?? data.accessToken;
      const refreshToken = data.tokens?.refreshToken ?? data.refreshToken;
      Cookies.set("panel_access_token", accessToken, { expires: 7 });
      if (refreshToken) Cookies.set("panel_refresh_token", refreshToken, { expires: 30 });
      const user = data.user ?? data.manager ?? data;
      queryClient.setQueryData(queryKeys.auth.me, user);
      router.push("/panel/overview");
    },
  });
}

export function useLogout() {
  const router = useRouter();
  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      Cookies.remove("panel_access_token");
      Cookies.remove("panel_refresh_token");
      queryClient.clear();
      router.push("/login");
    },
  });
}
