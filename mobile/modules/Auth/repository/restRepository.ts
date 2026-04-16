import axios from "axios";
import { AuthRepository, VerifyParams } from "./AuthRepository";
import type { User } from "../entities/User";
import { toAdapter } from "../adapter/toAdapter";

export const restRepository = (): AuthRepository => {
    return {
        register: async (phone: string): Promise<User> => {
            try {
                const res = await axios.post('http://1.1.1.14:3004/api/auth/customer/register', { phone });
                return res.data;
            } catch (error) {
                console.log(error, "Error in register api");
                throw error;
            }
        },
        verify: async (params): Promise<User> => {
            try {
                const res = await axios.post('http://1.1.1.14:3004/api/auth/verify-otp', params);
                return res.data;
            } catch (error) {
                console.log(error, "Error in verify api");
                throw error;
            }
        },
    };
};