import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useDeliveryT } from '@/hooks/useAppTranslation';
import { useDeliveryStore } from '@/store/useDeliveryStore';
import { useDeliveryProfile } from '../hooks/useDeliveryProfile';
import { DeliveryAgentStatus } from '../types';

const ROUTE_MAP: Record<DeliveryAgentStatus, string> = {
    SUSPENDED: '/delivery/application',
    PENDING_APPROVAL: '/delivery/pending',
    ACTIVE: '/delivery/tabs/home',
    REJECTED: '/delivery/rejected',
};

// If auth+profile haven't resolved after this long, something is truly stuck.
const GUARD_TIMEOUT_MS = 12_000;

// Normalize any status string to the uppercase form expected by ROUTE_MAP.
function resolveRoute(status: string | null | undefined): string | null {
    if (!status) return null;
    return ROUTE_MAP[status.toUpperCase() as DeliveryAgentStatus] ?? null;
}

/**
 * Single source of navigation truth for the delivery section.
 *
 * It waits for `useDeliveryInit` (in the root layout) to settle the auth state
 * — it does NOT read SecureStore itself, which previously raced with init and
 * could bounce a valid returning agent to the register screen. Once auth is
 * ready it routes by the live profile status, falling back to a cached status
 * only when the profile fetch is genuinely failing.
 */
export function DeliveryGuard() {
    const { t } = useDeliveryT();
    const { accessToken, authStatus, lastKnownStatus, clearTokens } = useDeliveryStore();

    const { data: profile, isLoading, isError, error, refetch } = useDeliveryProfile();

    const [timedOut, setTimedOut] = useState(false);
    const hasNavigated = useRef(false);

    const isAuthReady = authStatus !== 'idle' && authStatus !== 'loading';

    // ── Safety timeout — resets whenever authStatus changes ────────────────────
    useEffect(() => {
        if (timedOut) return;
        const id = setTimeout(() => {
            if (!hasNavigated.current) {
                console.warn('[DeliveryGuard] Timed out — auth/profile never resolved');
                setTimedOut(true);
            }
        }, GUARD_TIMEOUT_MS);
        return () => clearTimeout(id);
    }, [authStatus]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Navigation logic ───────────────────────────────────────────────────────
    useEffect(() => {
        // Wait until init has decided whether we have a session. This is the key
        // ordering guarantee that prevents the register-screen bounce.
        if (!isAuthReady) return;

        // No valid session → sign-in / register screen.
        if (!accessToken || authStatus === 'unauthenticated') {
            navigate('/delivery/register');
            return;
        }

        // Live profile loaded → most accurate routing.
        if (profile?.status) {
            const route = resolveRoute(profile.status);
            if (route) navigate(route);
            return;
        }

        // Profile fetch failed.
        if (isError) {
            const httpStatus = (error as any)?.response?.status;
            if (httpStatus === 401 || httpStatus === 403) {
                // Token isn't valid for delivery — wipe it so the next open goes
                // straight to login without a doomed refresh attempt.
                clearTokens();
                SecureStore.deleteItemAsync('deliveryRefreshToken');
                SecureStore.deleteItemAsync('deliveryAgentStatus');
                navigate('/delivery/register');
                return;
            }
            if (httpStatus === 404) {
                // Phone verified but application not submitted yet → no profile row.
                navigate('/delivery/application');
                return;
            }
            // Network/server error — fall back to a cached status if we have one
            // so the agent isn't stranded; the destination re-fetches.
            if (lastKnownStatus) {
                const route = resolveRoute(lastKnownStatus);
                if (route) {
                    navigate(route);
                    return;
                }
            }
            setTimedOut(true);
            return;
        }

        // Cached status → route immediately; the destination corrects itself.
        if (lastKnownStatus) {
            const route = resolveRoute(lastKnownStatus);
            navigate(route ?? '/delivery/application');
            return;
        }

        // No cache, no data, not actively fetching → application form.
        if (!isLoading) {
            navigate('/delivery/application');
        }
    }, [isAuthReady, accessToken, authStatus, profile?.status, isError, isLoading, lastKnownStatus, error]); // eslint-disable-line react-hooks/exhaustive-deps

    function navigate(route: string) {
        if (hasNavigated.current) return;
        hasNavigated.current = true;
        router.replace(route as never);
    }

    if (timedOut) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 32 }}>
                <Text style={{ fontSize: 16, color: '#1E1E1E', textAlign: 'center', marginBottom: 8, fontFamily: 'Cairo_700Bold' }}>
                    {t('guard.connectionProblemTitle')}
                </Text>
                <Text style={{ fontSize: 14, color: '#767777', textAlign: 'center', lineHeight: 22, marginBottom: 28, fontFamily: 'Tajawal_400Regular' }}>
                    {t('guard.connectionProblemSubtitle')}
                </Text>
                <TouchableOpacity
                    onPress={() => {
                        hasNavigated.current = false;
                        setTimedOut(false);
                        refetch();
                    }}
                    style={{ backgroundColor: '#F55905', paddingHorizontal: 32, paddingVertical: 13, borderRadius: 24, marginBottom: 12 }}
                >
                    <Text style={{ color: '#fff', fontSize: 15, fontFamily: 'Cairo_600SemiBold' }}>
                        {t('guard.tryAgain')}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigate('/delivery/register')} style={{ padding: 8 }}>
                    <Text style={{ color: '#767777', fontSize: 13, fontFamily: 'Tajawal_400Regular', textDecorationLine: 'underline' }}>
                        {t('guard.goToLogin')}
                    </Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
            <ActivityIndicator size="large" color="#F55905" />
        </View>
    );
}
