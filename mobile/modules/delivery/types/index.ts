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
 * Canonical delivery order status as surfaced to the driver. Mapped from the
 * backend OrderStatus + deliveryAcceptance:
 *   ASSIGNED   = assigned, acceptance pending
 *   ACCEPTED   = accepted, not yet en route (confirmed/preparing/ready)
 *   ON_THE_WAY = out_for_delivery
 *   DELIVERED  = delivered
 *   CANCELLED  = cancelled
 */
export type DeliveryOrderStatus =
    | 'ASSIGNED'
    | 'ACCEPTED'
    | 'ON_THE_WAY'
    | 'DELIVERED'
    | 'CANCELLED';

export type DeliveryPaymentMethod = 'cash_on_delivery' | 'card' | 'online' | string;
export type DeliveryPaymentStatus = 'unpaid' | 'paid' | 'refunded' | string;

/** A single line item on the order, with chosen options. */
export interface DeliveryOrderItem {
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    specialInstructions?: string;
    options: { name: string; price?: number }[];
}

export interface GeoPoint {
    lat: number;
    lng: number;
    address?: string;
    name?: string;
}

/**
 * Full order as the driver dashboard / order-details screen need it. Carries
 * every field required to render the premium card + details page without a
 * second round-trip. Both the pending feed and the active assignment use this
 * same shape so a single mapper + UI handles both.
 */
export interface DeliveryOrder {
    orderId: string;
    orderNumber?: string;
    /** Canonical driver-facing status (see DeliveryOrderStatus). */
    status: DeliveryOrderStatus;
    /** Raw backend order status, kept for transition logic. */
    rawStatus: string;

    pickup: GeoPoint | null;
    dropoff: GeoPoint | null;

    customerName?: string;
    customerPhone?: string;
    restaurantName?: string;
    restaurantPhone?: string;

    // Money
    subtotal?: number;
    deliveryFee?: number;
    discountAmount?: number;
    total?: number;

    paymentMethod?: DeliveryPaymentMethod;
    paymentStatus?: DeliveryPaymentStatus;

    // Items
    items: DeliveryOrderItem[];
    itemsCount?: number;

    // Notes
    customerNotes?: string;
    /** Alias kept for the existing dashboard card. */
    notes?: string;

    // Lifecycle timestamps (ISO strings)
    createdAt?: string;
    assignedAt?: string;
    acceptedAt?: string;
    estimatedDeliveryAt?: string;
    deliveredAt?: string;
}

/**
 * Order currently assigned to this delivery agent. Alias of DeliveryOrder so
 * the tracking + details screens share one model.
 */
export type ActiveAssignment = DeliveryOrder;

/** An order assigned to the agent awaiting their accept/reject. */
export type PendingOrder = DeliveryOrder;
