import { customerApi } from "@/lib/api";
import { CustomerProfile } from "../entities/Profile";
import { ProfileRepository } from "./ProfileRepository";
import { toProfileAdapter } from "../adapter/toProfileAdapter";

export const restRepository = (): ProfileRepository => {
    return {
        completeProfile: async (params: Pick<CustomerProfile, 'firstName' | 'lastName' | 'dateOfBirth' | 'locationLat' | 'locationLng'>) => {
            const res = await customerApi.post('/api/customer/profile', params)
            return res.data;
        },
        getProfile: async () => {
            const res = await customerApi.get('/api/customer/profile');
            return toProfileAdapter(res.data.data)
        }
    }
}