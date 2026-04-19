import type { UserDTO } from "../dto/User";
import type {  User } from "../entities/User";


export const toAdapter = (data: UserDTO): User => {
    return {
        id: data.id,
        email: data.email,
        phone: data.phone,
        fullName: data.full_name,
        passwordHash: data.password_hash,
        role: data.role,
        status: data.status,
        emailVerified: data.email_verified_at,
        phoneVerified: data.phone_verified_at,
        lastLogin: data.last_login_at,
        deviceInfo: data.device_info,
        profileCompleted: data.profile_completed,
        createdAt: data.created_at,
    }
}