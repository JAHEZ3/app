import { create } from 'zustand';

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  accessToken: string | null;
  status: AuthStatus;
  setTokens: (accessToken: string) => void;
  clearTokens: () => void;
  setStatus: (status: AuthStatus) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  status: 'idle',
  setTokens: (accessToken) => set({ accessToken, status: 'authenticated' }),
  clearTokens: () => set({ accessToken: null, status: 'unauthenticated' }),
  setStatus: (status) => set({ status }),
}));