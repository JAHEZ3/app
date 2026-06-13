import { DeliveryAgent } from '../entities/DeliveryAgent';
import {
    ApplicationQuestion,
    DeliveryApplicationFormData,
    ActiveAssignment,
    DeliveryOrder,
    PendingOrder,
} from '../types';
import { DeliveryTokensDTO } from '../dto/DeliveryAgent';

/** Backend OrderStatus values the driver is allowed to set. */
export type DriverOrderStatusUpdate = 'out_for_delivery' | 'delivered';

/**
 * Result of a password login attempt. Either real tokens, or a signal that this
 * account has no password yet and must use the OTP-login fallback.
 */
export type DeliveryLoginResult =
    | { kind: 'tokens'; tokens: DeliveryTokensDTO }
    | { kind: 'needsOtp'; phone: string };

export interface DeliveryRepository {
    register: (phone: string) => Promise<void>;
    verifyOtp: (params: { phone: string; otp: string }) => Promise<DeliveryTokensDTO>;
    /** Phone + password login. Resolves to tokens, or a needsOtp signal. */
    login: (params: { phone: string; password: string }) => Promise<DeliveryLoginResult>;
    /** OTP-login fallback — step 1: send a login code to an existing account. */
    sendLoginOtp: (phone: string) => Promise<void>;
    /** OTP-login fallback — step 2: verify the login code and get tokens. */
    verifyLoginOtp: (params: { phone: string; otp: string }) => Promise<DeliveryTokensDTO>;
    /** Resend the registration (phone-verify) OTP. */
    resendOtp: (phone: string) => Promise<void>;
    getProfile: () => Promise<DeliveryAgent>;
    getQuestions: () => Promise<ApplicationQuestion[]>;
    submitProfile: (form: DeliveryApplicationFormData) => Promise<void>;
    logout: (refreshToken: string) => Promise<void>;
    getActiveAssignment: () => Promise<ActiveAssignment | null>;
    getPendingOrders: () => Promise<PendingOrder[]>;
    acceptOrder: (orderId: string) => Promise<ActiveAssignment>;
    /**
     * Decline a customer-self-pick assignment. Backend clears
     * `deliveryAgentId` so the customer can re-pick. `reason` is optional
     * and ships with the broadcast event for analytics.
     */
    rejectOrder: (orderId: string, reason?: string) => Promise<void>;
    /**
     * Advance the delivery lifecycle. Only the assigned + accepted driver may
     * call this (enforced server-side). Returns the refreshed active order so
     * the UI can update from the source of truth.
     */
    updateOrderStatus: (
        orderId: string,
        status: DriverOrderStatusUpdate,
    ) => Promise<ActiveAssignment | null>;
    /** Fetch a single order's full detail for the driver order-details screen. */
    getOrderDetails: (orderId: string) => Promise<DeliveryOrder | null>;
}
