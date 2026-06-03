import { DeliveryAgent } from '../entities/DeliveryAgent';
import { ApplicationQuestion, DeliveryApplicationFormData, ActiveAssignment, PendingOrder } from '../types';
import { DeliveryTokensDTO } from '../dto/DeliveryAgent';

export interface DeliveryRepository {
    register: (phone: string) => Promise<void>;
    verifyOtp: (params: { phone: string; otp: string }) => Promise<DeliveryTokensDTO>;
    login: (params: { phone: string; password: string }) => Promise<DeliveryTokensDTO>;
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
}
