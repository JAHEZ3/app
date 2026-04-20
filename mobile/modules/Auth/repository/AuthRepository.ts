export type VerifyParams = {
    otp: string;
    phone: string;
};

export type VerifyLoginParams = {
    otp: string;
    phone: string;
};

export interface AuthRepository {
    register: (phone: string) => Promise<void>;
    login: (phone: string) => Promise<void>;
    verify: (params: VerifyParams) => Promise<{ accessToken: string; refreshToken: string }>;
    verifyLogin: (params: VerifyLoginParams) => Promise<{ accessToken: string; refreshToken: string }>;
    resendOtp: (phone: string) => Promise<void>;
    logout: (refreshToken: string) => Promise<void>;
}
