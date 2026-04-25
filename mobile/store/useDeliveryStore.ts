import { create } from 'zustand';
import { DeliveryAuthStatus } from '@/modules/delivery/types';

interface DeliveryState {
    accessToken: string | null;
    authStatus: DeliveryAuthStatus;
    setTokens: (accessToken: string) => void;
    clearTokens: () => void;
    setAuthStatus: (status: DeliveryAuthStatus) => void;
}

export const useDeliveryStore = create<DeliveryState>((set) => ({
    accessToken: null,
    authStatus: 'idle',
    setTokens: (accessToken) => set({ accessToken, authStatus: 'authenticated' }),
    clearTokens: () => set({ accessToken: null, authStatus: 'unauthenticated' }),
    setAuthStatus: (authStatus) => set({ authStatus }),
}));
