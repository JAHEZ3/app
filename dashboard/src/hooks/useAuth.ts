"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { authApi } from "@/lib/api";
import { queryKeys, queryClient } from "@/lib/queryClient";
import { LoginCredentials, AuthUser } from "@/types/auth.types";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";

export function useMe() {
  return useQuery<AuthUser>({
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
      Cookies.set("access_token", data.tokens.accessToken, { expires: 7 });
      Cookies.set("refresh_token", data.tokens.refreshToken, { expires: 30 });
      queryClient.setQueryData(queryKeys.auth.me, data.user);
      router.push("/dashboard");
    },
  });
}

export function useLogout() {
  const router = useRouter();

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      Cookies.remove("access_token");
      Cookies.remove("refresh_token");
      queryClient.clear();
      router.push("/login");
    },
  });
}
