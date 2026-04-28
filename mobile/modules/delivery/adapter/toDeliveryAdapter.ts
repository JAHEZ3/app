import { DeliveryAgentDTO } from '../dto/DeliveryAgent';
import { DeliveryAgent } from '../entities/DeliveryAgent';
import { DeliveryAgentStatus, PaymentType, VehicleType } from '../types';

export const toDeliveryAdapter = (dto: DeliveryAgentDTO): DeliveryAgent => ({
    id: dto.id,
    userId: dto.userId,
    fullName: dto.fullName,
    firstName: dto.firstName,
    lastName: dto.lastName,
    phone: dto.phone,
    dateOfBirth: dto.dateOfBirth,
    idNumber: dto.idNumber,
    city: dto.city,
    vehicleType: dto.vehicleType as VehicleType,
    vehicleLicenseNumber: dto.vehicleLicenseNumber,
    emergencyContactName: dto.emergencyContactName,
    emergencyContactPhone: dto.emergencyContactPhone,
    paymentInfo: {
        type: dto.paymentInfo.type as PaymentType,
        bankName: dto.paymentInfo.bankName,
        accountNumber: dto.paymentInfo.accountNumber,
        iban: dto.paymentInfo.iban,
        walletNumber: dto.paymentInfo.walletNumber,
    },
    status: (dto.status as string).toUpperCase() as DeliveryAgentStatus,
    rating: dto.rating ?? 0,
    totalDeliveries: dto.totalDeliveries ?? 0,
    walletBalance: dto.walletBalance ?? 0,
    profilePictureUrl: dto.profilePictureUrl,
    idPictureUrl: dto.idPictureUrl,
    applicationStatus: (dto.applicationStatus as 'pending' | 'approved' | 'rejected' | null) ?? null,
    rejectionReason: dto.rejectionReason ?? null,
});
