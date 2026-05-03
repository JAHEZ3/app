import { DeliveryAgentStatus, VehicleType, PaymentInfo } from '../types';

export interface DeliveryAgent {
    id: string;
    userId: string;
    fullName: string;
    firstName: string;
    lastName: string;
    phone: string;
    dateOfBirth: string;
    idNumber: string;
    city: string;
    vehicleType: VehicleType;
    vehicleLicenseNumber?: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
    paymentInfo: PaymentInfo;
    status: DeliveryAgentStatus;
    rating: number;
    totalDeliveries: number;
    walletBalance: number;
    profilePictureUrl?: string;
    idPictureUrl?: string;
    applicationStatus: 'pending' | 'approved' | 'rejected' | null;
    rejectionReason?: string | null;
}
