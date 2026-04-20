import React, { type PropsWithChildren } from 'react';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuthStore } from '@/store/useAuthStore';

type Props = PropsWithChildren<{
    loadingFallback?: React.ReactNode;
}>;

/**
 * Wraps any tree that requires authentication.
 * - idle/loading → shows loading spinner (or custom fallback)
 * - unauthenticated → hard redirect to /auth/login
 * - authenticated → renders children
 */
export const ProtectedRoute = ({ children, loadingFallback }: Props) => {
    const status = useAuthStore((s) => s.status);

    if (status === 'idle' || status === 'loading') {
        return (
            <>
                {loadingFallback ?? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="large" />
                    </View>
                )}
            </>
        );
    }

    if (status === 'unauthenticated') {
        return <Redirect href="/auth/login" />;
    }

    return <>{children}</>;
};
