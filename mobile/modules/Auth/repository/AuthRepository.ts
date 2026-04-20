import { User } from "../entities/User";

export type VerifyParams = {
    otp: string;
    phone: string;
};

export type CompleteProfileParams = {
    firstName: string;
    lastName: string;
    birthday: string;
};

export interface AuthRepository {
    register: (phone: string) => Promise<void>;
    verify: (params: VerifyParams) => Promise<{ accessToken: string, refreshToken: string }>;
    resendOtp: (phone: string) => Promise<void>;
    logout: (refreshToken: string) => Promise<void>;
}