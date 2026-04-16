export interface User {
    id: string;
    email: string;
    phone: string;
    fullName: string
    Password: string
    role: string;
    status: string;
    emailVerified: Date;
    phoneVerified: Date;
    lastLogin: Date;
    deviceInfo: string;
    profileCompleted: boolean;
    createdAt: Date;
}