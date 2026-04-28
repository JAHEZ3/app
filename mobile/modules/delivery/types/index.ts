export type VehicleType = 'motorcycle' | 'bicycle' | 'car' | 'on_foot';

export type DeliveryAgentStatus = 'SUSPENDED' | 'PENDING_APPROVAL' | 'ACTIVE' | 'REJECTED';

export type DeliveryAuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

export interface ApplicationQuestion {
    question: string;
    answer: string;
}

export type PaymentType = 'bank_account' | 'wallet';

export interface PaymentInfo {
    type: PaymentType;
    bankName?: string;
    accountNumber?: string;
    iban?: string;
    walletNumber?: string;
}

export interface PaymentFormData {
    type: PaymentType | '';
    bankName: string;
    iban: string;
    accountNumber: string;
    walletNumber: string;
}

export interface ImageAsset {
    uri: string;
    type: string;
    name: string;
}

export interface DeliveryApplicationFormData {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    nationalIdNumber: string;
    city: string;
    vehicleType: VehicleType;
    vehicleLicenseNumber?: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
    payment: PaymentFormData;
    password: string;
    termsAccepted: boolean;
    answers: ApplicationQuestion[];
    profilePicture: ImageAsset | null;
    idPicture: ImageAsset | null;
}
