import { User } from "../entities/User";

export type VerifyParams = {
    otp: string;
    phone: string;
};

export interface AuthRepository {
    register: (phone: string) => Promise<User>;
    verify: (params: VerifyParams) => Promise<User>;
}