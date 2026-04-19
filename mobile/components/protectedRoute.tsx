import React, { PropsWithChildren } from "react";
import { Redirect } from "expo-router";
import { RouteAccess, useProtectedRoute } from "@/hooks/useProtectedRoute";

type ProtectedRouteAccess = Exclude<RouteAccess, "entry">;

type ProtectedRouteProps = PropsWithChildren<{
    access: ProtectedRouteAccess;
}>;

export const ProtectedRoute = ({
    children,
    access,
}: ProtectedRouteProps) => {
    const { isLoading, redirectTo } = useProtectedRoute(access);

    if (isLoading) {
        return null;
    }

    if (redirectTo) {
        return <Redirect href={redirectTo} />;
    }

    return <>{children}</>;
};
