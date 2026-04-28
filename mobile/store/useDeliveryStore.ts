import { create } from 'zustand';
import { DeliveryAgentStatus, DeliveryAuthStatus } from '@/modules/delivery/types';

interface DeliveryState {
    accessToken: string | null;
    authStatus: DeliveryAuthStatus;
    lastKnownStatus: DeliveryAgentStatus | null;
    setTokens: (accessToken: string) => void;
    clearTokens: () => void;
    setAuthStatus: (status: DeliveryAuthStatus) => void;
    setLastKnownStatus: (status: DeliveryAgentStatus | null) => void;
}

export const useDeliveryStore = create<DeliveryState>((set) => ({
    accessToken: null,
    authStatus: 'idle',
    lastKnownStatus: null,
    setTokens: (accessToken) => set({ accessToken, authStatus: 'authenticated' }),
    // Intentionally does NOT clear lastKnownStatus — status persists through
    // token expiry so the guard can route instantly after re-authentication
    clearTokens: () => set({ accessToken: null, authStatus: 'unauthenticated' }),
    setAuthStatus: (authStatus) => set({ authStatus }),
    setLastKnownStatus: (lastKnownStatus) => set({ lastKnownStatus }),
}));
