"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { restaurantApi } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { navigateTo } from "@/lib/navigation";
import { RestaurantStatus } from "@/types/auth.types";

// Routes a status-less user (freshly-verified OTP) is allowed on
const PROFILE_COMPLETION_PATHS = ["/complete-profile"];

function routeForStatus(status: RestaurantStatus | null | undefined): string {
  switch (status) {
    case "active":           return "/dashboard";
    case "pending_approval": return "/pending-approval";
    case "suspended":        return "/suspended";
    case "closed":           return "/closed";
    default:                 return "/complete-profile";
  }
}

function pathAllowedForStatus(path: string, status: RestaurantStatus | null): boolean {
  if (!status) return PROFILE_COMPLETION_PATHS.some((p) => path.startsWith(p));
  if (status === "active") return !["/complete-profile", "/pending-approval", "/suspended", "/closed"].some((p) => path.startsWith(p));
  if (status === "pending_approval") return path.startsWith("/pending-approval");
  if (status === "suspended")        return path.startsWith("/suspended");
  if (status === "closed")           return path.startsWith("/closed");
  return false;
}

export function StatusGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { setUser, logout } = useAuthStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await restaurantApi.getProfile();
        if (cancelled) return;
        const payload = (res.data?.data ?? res.data) as { status?: RestaurantStatus; name?: string | null } | undefined;
        const name = payload?.name ?? null;
        const status = payload?.status ?? null;

        // Profile exists but name is missing → profile not completed yet.
        if (!name) {
          if (!pathname.startsWith("/complete-profile")) {
            navigateTo("/complete-profile");
            return;
          }
          setReady(true);
          return;
        }

        if (status) setUser({ status });

        if (!pathAllowedForStatus(pathname, status)) {
          navigateTo(routeForStatus(status));
          return;
        }
        setReady(true);
      } catch (err: unknown) {
        if (cancelled) return;
        const status = (err as { response?: { status?: number } })?.response?.status;
        // 404 → no restaurant yet (profile not created). Only /complete-profile is allowed.
        if (status === 404) {
          if (!pathname.startsWith("/complete-profile")) {
            navigateTo("/complete-profile");
            return;
          }
          setReady(true);
          return;
        }
        // 401 is handled by the axios refresh interceptor; if it reaches here the session is dead
        if (status === 401) {
          logout();
          navigateTo("/login");
          return;
        }
        // Other errors — allow render; individual pages can show their own error states
        setReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, [pathname, setUser, logout]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
