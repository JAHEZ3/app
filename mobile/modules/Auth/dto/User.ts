export interface UserDTO {
    id: string;
    email: string;
    phone: string;
    full_name: string
    password_hash: string
    role: string;
    status: string;
    email_verified_at: Date;
    phone_verified_at: Date;
    last_login_at: Date;
    device_info: string;
    profile_completed: boolean;
    created_at: Date;
}