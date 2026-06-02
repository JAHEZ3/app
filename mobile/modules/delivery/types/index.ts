export type VehicleType = 'motorcycle' | 'bicycle' | 'car' | 'on_foot';

export type DeliveryAgentStatus = 'SUSPENDED' | 'PENDING_APPROVAL' | 'ACTIVE' | 'REJECTED';

export type DeliveryAuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

export interface ApplicationQuestion {
    question: string;
    answer: string;
}

export type PaymentType = 'bank_account' | 'wallet';

/** Canonical brand keys — kept in sync with the restaurant dashboard
 * `BANK_OPTIONS`/`WALLET_OPTIONS` so the same values land in `payment_info`
 * across both flows. */
export type BankBrand =
    | 'Bank of Palestine'
    | 'Palestine Islamic Bank'
    | 'Arab Islamic Bank';

export type WalletBrand = 'PalPay' | 'Jawwal Pay';

export interface PaymentInfo {
    type: PaymentType;
    /** Set when type === 'bank_account'. Account holder's full legal name. */
    accountHolderName?: string;
    bankName?: BankBrand | string;
    accountNumber?: string;
    iban?: string;
    /** Set when type === 'wallet'. */
    walletType?: WalletBrand | string;
    /** Phone associated with the wallet account (only for wallet payouts). */
    phone?: string;
}

export interface PaymentFormData {
    type: PaymentType | '';
    accountHolderName: string;
    /** Bank brand identifier (Bank of Palestine / Palestine Islamic Bank / etc). */
    bankName: string;
    iban: string;
    /** Used both for the bank account number AND the wallet account number. */
    accountNumber: string;
    walletType: string;
    /** Wallet-bound phone number. */
    walletPhone: string;
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

/**
 * Order currently assigned to this delivery agent. The tracking screen
 * reuses the customer Order model (orderId + delivery info) so the existing
 * map / driver-info components keep working.
 */
export interface ActiveAssignment {
    orderId: string;
    orderNumber?: string;
    status: string;
    dropoff: {
        lat: number;
        lng: number;
        address?: string;
    } | null;
    pickup: {
        lat: number;
        lng: number;
        name?: string;
        address?: string;
    } | null;
    customerName?: string;
    customerPhone?: string;
    restaurantName?: string;
    restaurantPhone?: string;
    total?: number;
    itemsCount?: number;
    notes?: string;
}

/** An unassigned order available for the agent to accept. */
export interface PendingOrder {
    orderId: string;
    orderNumber?: string;
    status: string;
    dropoff: {
        lat: number;
        lng: number;
        address?: string;
    } | null;
    pickup: {
        lat: number;
        lng: number;
        name?: string;
        address?: string;
    } | null;
    customerName?: string;
    customerPhone?: string;
    restaurantName?: string;
    restaurantPhone?: string;
    total?: number;
    itemsCount?: number;
    notes?: string;
}
