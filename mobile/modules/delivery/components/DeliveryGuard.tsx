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

// If auth+profile haven't resolved after this long something is truly stuck.
const GUARD_TIMEOUT_MS = 12_000;

// Normalize any status string to the uppercase form expected by ROUTE_MAP.
// Guards against old SecureStore cache entries written before the adapter fix.
function resolveRoute(status: string | null | undefined): string | null {
    if (!status) return null;
    return ROUTE_MAP[status.toUpperCase() as DeliveryAgentStatus] ?? null;
}

export function DeliveryGuard() {
    const { t } = useDeliveryT();
    const { accessToken, authStatus, lastKnownStatus, clearTokens } = useDeliveryStore();

    // isLoading = isPending && isFetching — false when query is disabled (no token)
    // or when a result has arrived. Using this (not isPending) avoids waiting on a
    // query that is intentionally disabled and will never fire.
    const { data: profile, isLoading, isError, error, refetch } = useDeliveryProfile();

    const [timedOut, setTimedOut] = useState(false);
    const hasNavigated = useRef(false);

    const isAuthReady = authStatus !== 'idle' && authStatus !== 'loading';

    // ── Fast-path: instant redirect when SecureStore clearly has no token ─────
    // This runs in parallel with useDeliveryInit (which lives in _layout.tsx).
    // When the refresh token is absent we skip the 8 s init timeout entirely and
    // send the user to the login screen right away.
    useEffect(() => {
        SecureStore.getItemAsync('deliveryRefreshToken').then((stored) => {
            if (!stored) {
                console.log('[DeliveryGuard] Fast-path: no refresh token — going to login');
                navigate('/delivery/register');
            }
        });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Safety timeout ────────────────────────────────────────────────────────
    // Resets whenever authStatus changes so a legitimately slow network gets the
    // full window from the moment auth state settles.
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

    // ── Navigation logic ──────────────────────────────────────────────────────
    useEffect(() => {
        console.log('[DeliveryGuard]', {
            authStatus,
            isAuthReady,
            hasToken: !!accessToken,
            profileStatus: profile?.status ?? null,
            isLoading,
            isError,
            lastKnownStatus,
        });

        if (!isAuthReady) return;

        // ── No valid session → go to login ──
        if (!accessToken) {
            navigate('/delivery/register');
            return;
        }

        // ── Live profile loaded → most accurate routing ──
        if (profile?.status) {
            const route = resolveRoute(profile.status);
            if (route) navigate(route);
            return;
        }

        // ── Profile fetch failed ──
        if (isError) {
            const httpStatus = (error as any)?.response?.status;
            if (httpStatus === 401 || httpStatus === 403) {
                // Token is not valid for delivery. Wipe it so the next app open
                // skips the refresh attempt entirely and goes straight to login.
                console.log('[DeliveryGuard] Auth error on profile fetch — clearing delivery session');
                clearTokens();
                SecureStore.deleteItemAsync('deliveryRefreshToken');
                SecureStore.deleteItemAsync('deliveryAgentStatus');
                navigate('/delivery/register');
                return;
            }
            if (httpStatus === 404) {
                // Agent registered via OTP but hasn't submitted their application
                // form yet — the profile record doesn't exist on the backend.
                console.log('[DeliveryGuard] Profile 404 — agent has no profile yet, going to application');
                navigate('/delivery/application');
                return;
            }
            // If we have a cached status, use it — the profile can be corrected
            // once the network recovers and the destination screen's own
            // useDeliveryProfile re-fetches.
            if (lastKnownStatus) {
                const route = resolveRoute(lastKnownStatus);
                if (route) {
                    console.log('[DeliveryGuard] Profile error — routing via cached status:', lastKnownStatus);
                    navigate(route);
                    return;
                }
            }
            // Genuine network / server error with no cached status → show the
            // connection-problem UI so the agent can retry, rather than being
            // silently dropped into the application form.
            console.log('[DeliveryGuard] Profile error with no cached status — showing connection error UI');
            setTimedOut(true);
            return;
        }

        // ── Cached status → route immediately ──
        // The destination screen runs its own useDeliveryProfile and will correct
        // the route if the live status has changed.
        if (lastKnownStatus) {
            const route = resolveRoute(lastKnownStatus);
            if (route) {
                console.log('[DeliveryGuard] Routing via cached status:', lastKnownStatus);
                navigate(route);
            } else {
                // Unrecognised status value — go to application form as safe default.
                console.warn('[DeliveryGuard] Unknown cached status:', lastKnownStatus);
                navigate('/delivery/application');
            }
            return;
        }

        // ── No cache, no data, and not actively fetching → go to form ──
        // (isLoading is false when the query is disabled OR when it has already
        //  settled; using isPending here would block forever on a disabled query.)
        if (!isLoading) {
            console.log('[DeliveryGuard] No data and not loading — defaulting to application form');
            navigate('/delivery/application');
        }
    }, [isAuthReady, accessToken, profile?.status, isError, isLoading, lastKnownStatus, error]);

    function navigate(route: string) {
        if (hasNavigated.current) return;
        hasNavigated.current = true;
        router.replace(route as never);
    }

    // ── Timeout fallback UI ───────────────────────────────────────────────────
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
                <TouchableOpacity
                    onPress={() => navigate('/delivery/register')}
                    style={{ padding: 8 }}
                >
                    <Text style={{ color: '#767777', fontSize: 13, fontFamily: 'Tajawal_400Regular', textDecorationLine: 'underline' }}>
                        {t('guard.goToLogin')}
                    </Text>
                </TouchableOpacity>
            </View>
        );
    }

    // ── Default: spinner while resolving ─────────────────────────────────────
    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
            <ActivityIndicator size="large" color="#F55905" />
        </View>
    );
}
