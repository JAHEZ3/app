export interface User {
    id: string;
    email: string;
    phone: string;
    fullName: string
    passwordHash: string
    role: string;
    status: string;
    emailVerified: Date;
    phoneVerified: Date;
    lastLogin: Date;
    deviceInfo: string;
    profileCompleted: boolean;
    createdAt: Date;
}