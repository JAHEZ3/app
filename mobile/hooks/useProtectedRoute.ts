import { useEffect, useMemo, useState } from "react";
import * as SecureStore from "expo-secure-store";
import axios from "axios";
import type { Href } from "expo-router";
import { customerApi } from "@/lib/api";
import {
  clearSession,
  PROFILE_COMPLETED_KEY,
  REFRESH_TOKEN_KEY,
  refreshAccessToken,
} from "@/lib/tokenManager";
import { useToken } from "@/store/useToken";

export type RouteAccess = "entry" | "guest" | "profile-setup" | "protected";

let bootstrapPromise: Promise<void> | null = null;

const getProfileCompleted = (payload: unknown) => {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const source =
    "data" in payload && payload.data && typeof payload.data === "object"
      ? payload.data
      : payload;

  if (!source || typeof source !== "object") {
    return false;
  }

  const value =
    "profileCompleted" in source
      ? source.profileCompleted
      : "profile_completed" in source
        ? source.profile_completed
        : false;

  return Boolean(value);
};

const getStoredProfileCompleted = async () => {
  const storedValue = await SecureStore.getItemAsync(PROFILE_COMPLETED_KEY);

  if (storedValue === "true") {
    return true;
  }

  if (storedValue === "false") {
    return false;
  }

  return null;
};

const persistProfileCompleted = async (value: boolean | null) => {
  if (value === null) {
    await SecureStore.deleteItemAsync(PROFILE_COMPLETED_KEY);
    return;
  }

  await SecureStore.setItemAsync(PROFILE_COMPLETED_KEY, value ? "true" : "false");
};

async function bootstrapSession() {
  const state = useToken.getState();

  if (state.authHydrated && (!state.refreshToken || state.profileCompleted !== null)) {
    return;
  }

  if (bootstrapPromise) {
    return bootstrapPromise;
  }

  bootstrapPromise = (async () => {
    const currentState = useToken.getState();
    const [storedRefreshToken, storedProfileCompleted] = await Promise.all([
      currentState.refreshToken ?? SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
      getStoredProfileCompleted(),
    ]);

    currentState.setRefreshToken(storedRefreshToken);
    currentState.setProfileCompleted(storedProfileCompleted);
    currentState.setAuthHydrated(true);

    if (!storedRefreshToken) {
      currentState.setProfileCompleted(null);
      return;
    }

    try {
      if (!useToken.getState().accessToken) {
        await refreshAccessToken();
      }

      const response = await customerApi.get("/api/customer/profile");
      const nextProfileCompleted = getProfileCompleted(response.data);
      useToken.getState().setProfileCompleted(nextProfileCompleted);
      await persistProfileCompleted(nextProfileCompleted);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        useToken.getState().setProfileCompleted(false);
        await persistProfileCompleted(false);
        return;
      }

      if (axios.isAxiosError(error) && !error.response) {
        return;
      }

      await clearSession({ redirectTo: null });
    }
  })().finally(() => {
    bootstrapPromise = null;
  });

  return bootstrapPromise;
}

const getLandingRoute = (hasToken: boolean, profileCompleted: boolean | null): Href => {
  if (!hasToken) {
    return "/onboarding";
  }

  if (profileCompleted === false) {
    return "/auth/complete-profile";
  }

  return "/home/Home";
};

export const useProtectedRoute = (access: RouteAccess) => {
  const refreshToken = useToken((state) => state.refreshToken);
  const profileCompleted = useToken((state) => state.profileCompleted);
  const authHydrated = useToken((state) => state.authHydrated);
  const [isResolving, setIsResolving] = useState(
    !authHydrated || (Boolean(refreshToken) && profileCompleted === null)
  );

  useEffect(() => {
    const needsBootstrap = !authHydrated || (Boolean(refreshToken) && profileCompleted === null);

    if (!needsBootstrap) {
      setIsResolving(false);
      return;
    }

    let isMounted = true;
    setIsResolving(true);

    bootstrapSession().finally(() => {
      if (isMounted) {
        setIsResolving(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [authHydrated, refreshToken, profileCompleted]);

  const hasToken = Boolean(refreshToken);
  const isLoading = isResolving || !authHydrated || (hasToken && profileCompleted === null);
  const landingRoute = useMemo(
    () => getLandingRoute(hasToken, profileCompleted),
    [hasToken, profileCompleted]
  );

  const redirectTo = useMemo(() => {
    if (isLoading || access === "entry") {
      return null;
    }

    if (access === "guest") {
      return hasToken ? landingRoute : null;
    }

    if (access === "profile-setup") {
      return !hasToken || profileCompleted === false ? null : "/home/Home";
    }

    if (!hasToken) {
      return "/onboarding";
    }

    if (profileCompleted === false) {
      return "/auth/complete-profile";
    }

    return null;
  }, [access, hasToken, isLoading, landingRoute, profileCompleted]);

  return {
    hasToken,
    isLoading,
    landingRoute,
    profileCompleted,
    redirectTo,
  };
};
