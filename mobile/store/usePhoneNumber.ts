import { create } from 'zustand';

export type AuthMode = 'register' | 'login';

interface PhoneNumberState {
    phoneNumber: string;
    authMode: AuthMode;
    setPhoneNumber: (phoneNumber: string) => void;
    setAuthMode: (mode: AuthMode) => void;
    setFlow: (phoneNumber: string, mode: AuthMode) => void;
}

export const usePhoneNumber = create<PhoneNumberState>((set) => ({
    phoneNumber: '',
    authMode: 'login',
    setPhoneNumber: (phoneNumber) => set({ phoneNumber }),
    setAuthMode: (authMode) => set({ authMode }),
    setFlow: (phoneNumber, authMode) => set({ phoneNumber, authMode }),
}));
