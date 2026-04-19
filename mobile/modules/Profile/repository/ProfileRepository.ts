import { CustomerProfile } from "../entities/Profile";

export interface ProfileRepository {
    completeProfile: (params: Pick<CustomerProfile, 'firstName' | 'lastName' | 'dateOfBirth' | 'locationLat' | 'locationLng'>) => Promise<void>;
    getProfile: () => Promise<CustomerProfile>;
}