import React, { PropsWithChildren } from "react";
import { Redirect, type Href } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuthStore } from "@/store/useAuthStore";

type ProtectedRouteProps = PropsWithChildren<{
  redirectTo: Href;
  requireAuth?: boolean;
}>;

export const ProtectedRoute = ({
  children,
  redirectTo,
  requireAuth = true,
}: ProtectedRouteProps) => {
  const { accessToken, status } = useAuthStore();

  if (status === "idle" || status === "loading") {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (requireAuth && !accessToken) {
    return <Redirect href={redirectTo} />;
  }

  if (!requireAuth && accessToken) {
    return <Redirect href={redirectTo} />;
  }

  return <>{children}</>;
};
