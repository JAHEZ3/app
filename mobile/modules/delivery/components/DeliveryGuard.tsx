import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useDeliveryStore } from '@/store/useDeliveryStore';
import { useGetDeliveryProfile } from '../hooks/useGetDeliveryProfile';
import { DeliveryAgentStatus } from '../types';

const ROUTE_MAP: Record<DeliveryAgentStatus, string> = {
    SUSPENDED: '/delivery/application',
    PENDING_APPROVAL: '/delivery/pending',
    ACTIVE: '/delivery/dashboard',
    REJECTED: '/delivery/rejected',
};

export function DeliveryGuard() {
    const { accessToken, authStatus } = useDeliveryStore();
    const { data: profile, isLoading, isError } = useGetDeliveryProfile();

    const isResolving = authStatus === 'idle' || authStatus === 'loading' || isLoading;

    useEffect(() => {
        if (isResolving) return;

        // No token → go to register/login
        if (!accessToken) {
            router.replace('/delivery/register' as never);
            return;
        }

        // Profile fetch failed (e.g. 404 for freshly-verified SUSPENDED agent
        // who has no profile record yet) → send to application form
        if (isError) {
            router.replace('/delivery/application' as never);
            return;
        }

        // Profile loaded with a valid status → route accordingly
        if (profile?.status) {
            const route = ROUTE_MAP[profile.status];
            if (route) router.replace(route as never);
            return;
        }

        // Profile loaded but status missing → assume SUSPENDED (just verified)
        if (profile !== undefined) {
            router.replace('/delivery/application' as never);
        }
    }, [isResolving, accessToken, profile?.status, isError]);

    // Always show a spinner — never render blank children on this entry screen
    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
            <ActivityIndicator size="large" color="#F55905" />
        </View>
    );
}
