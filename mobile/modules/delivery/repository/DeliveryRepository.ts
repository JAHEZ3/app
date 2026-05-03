import { DeliveryAgent } from '../entities/DeliveryAgent';
import { ApplicationQuestion, DeliveryApplicationFormData } from '../types';
import { DeliveryTokensDTO } from '../dto/DeliveryAgent';

export interface DeliveryRepository {
    register: (phone: string) => Promise<void>;
    verifyOtp: (params: { phone: string; otp: string }) => Promise<DeliveryTokensDTO>;
    login: (params: { phone: string; password: string }) => Promise<DeliveryTokensDTO>;
    getProfile: () => Promise<DeliveryAgent>;
    getQuestions: () => Promise<ApplicationQuestion[]>;
    submitProfile: (form: DeliveryApplicationFormData) => Promise<void>;
    logout: (refreshToken: string) => Promise<void>;
}
