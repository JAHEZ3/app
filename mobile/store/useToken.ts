import { create } from "zustand";

interface TokenState {
    accessToken: string;
    setAccessToken: (token: string) => void;
}

export const useToken = create<TokenState>((set) => ({
    accessToken: '',
    setAccessToken: (token: string) => set({ accessToken: token }),
}));