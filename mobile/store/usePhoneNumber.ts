import { create } from 'zustand';


interface PhoneNumberState {
    phoneNumber: string;
    setPhoneNumber: (phoneNumber: string) => void;
}

export const usePhoneNumber = create<PhoneNumberState>((set) => ({
    phoneNumber: '',
    setPhoneNumber: (phoneNumber: string) => set({ phoneNumber }),
}));