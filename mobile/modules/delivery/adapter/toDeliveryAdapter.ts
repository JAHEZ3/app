import { DeliveryAgentDTO } from '../dto/DeliveryAgent';
import { DeliveryAgent } from '../entities/DeliveryAgent';
import { DeliveryAgentStatus, PaymentType, VehicleType } from '../types';

const toNumber = (value: unknown): number => {
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n : 0;
};

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
        type: dto.paymentInfo?.type as PaymentType,
        accountHolderName: dto.paymentInfo?.accountHolderName,
        bankName: dto.paymentInfo?.bankName,
        accountNumber: dto.paymentInfo?.accountNumber,
        iban: dto.paymentInfo?.iban,
        walletType: dto.paymentInfo?.walletType,
        phone: dto.paymentInfo?.phone ?? dto.paymentInfo?.walletNumber,
    },
    status: (dto.status as string).toUpperCase() as DeliveryAgentStatus,
    rating: toNumber(dto.rating),
    totalDeliveries: toNumber(dto.totalDeliveries),
    walletBalance: toNumber(dto.walletBalance),
    profilePictureUrl: dto.profilePictureUrl,
    idPictureUrl: dto.idPictureUrl,
    applicationStatus: (dto.applicationStatus as 'pending' | 'approved' | 'rejected' | null) ?? null,
    rejectionReason: dto.rejectionReason ?? null,
});
