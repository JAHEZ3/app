import { create } from 'zustand';

interface DeliveryPhoneState {
    phoneNumber: string;
    setPhoneNumber: (phoneNumber: string) => void;
}

export const useDeliveryPhoneStore = create<DeliveryPhoneState>((set) => ({
    phoneNumber: '',
    setPhoneNumber: (phoneNumber) => set({ phoneNumber }),
}));
