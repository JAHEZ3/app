import { DeliveryAgentDTO } from '../dto/DeliveryAgent';
import { DeliveryAgent } from '../entities/DeliveryAgent';
import { DeliveryAgentStatus, PaymentType, VehicleType } from '../types';

<<<<<<< HEAD
/**
 * Postgres `numeric` columns are serialized as JSON strings (e.g. "4.50") by
 * the backend, so `?? 0` leaves the string intact and `.toFixed()` blows up at
 * render time. Coerce defensively here so the rest of the app sees real numbers.
 */
const toNumber = (value: unknown, fallback = 0): number => {
    if (value === null || value === undefined || value === '') return fallback;
    const n = typeof value === 'number' ? value : parseFloat(String(value));
    return Number.isFinite(n) ? n : fallback;
=======
const toNumber = (value: unknown): number => {
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n : 0;
>>>>>>> origin/Dashbords
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
<<<<<<< HEAD
    rating: toNumber(dto.rating, 0),
    totalDeliveries: toNumber(dto.totalDeliveries, 0),
    walletBalance: toNumber(dto.walletBalance, 0),
=======
    rating: toNumber(dto.rating),
    totalDeliveries: toNumber(dto.totalDeliveries),
    walletBalance: toNumber(dto.walletBalance),
>>>>>>> origin/Dashbords
    profilePictureUrl: dto.profilePictureUrl,
    idPictureUrl: dto.idPictureUrl,
    applicationStatus: (dto.applicationStatus as 'pending' | 'approved' | 'rejected' | null) ?? null,
    rejectionReason: dto.rejectionReason ?? null,
});
