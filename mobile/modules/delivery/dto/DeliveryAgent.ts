export interface DeliveryAgentDTO {
    id: string;
    userId: string;
    fullName: string;
    firstName: string;
    lastName: string;
    phone: string;
    dateOfBirth: string;
    idNumber: string;
    city: string;
    vehicleType: string;
    vehicleLicenseNumber?: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
    paymentInfo: Record<string, string>;
    status: string;
    rating: number;
    totalDeliveries: number;
    walletBalance: number;
    profilePictureUrl?: string;
    idPictureUrl?: string;
    applicationStatus: string | null;
    rejectionReason?: string | null;
}

export interface ApplicationQuestionDTO {
    question: string;
}

export interface DeliveryTokensDTO {
    accessToken: string;
    refreshToken: string;
}
