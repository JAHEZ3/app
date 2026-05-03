import { authApi, deliveryApi } from '@/lib/api';
import { DeliveryAgent } from '../entities/DeliveryAgent';
import { ApplicationQuestion, DeliveryApplicationFormData } from '../types';
import { DeliveryTokensDTO } from '../dto/DeliveryAgent';
import { toDeliveryAdapter } from '../adapter/toDeliveryAdapter';
import { DeliveryRepository } from './DeliveryRepository';

export const restRepository = (): DeliveryRepository => ({
    register: async (phone) => {
        await authApi.post('/api/auth/delivery/register', { phone });
    },

    verifyOtp: async ({ phone, otp }) => {
        const res = await authApi.post('/api/auth/verify-otp', { phone, otp });
        return res.data.data as DeliveryTokensDTO;
    },

    login: async ({ phone, password }) => {
        const res = await deliveryApi.post('/api/delivery/login', { phone, password });
        return res.data.data as DeliveryTokensDTO;
    },

    getProfile: async (): Promise<DeliveryAgent> => {
        const res = await deliveryApi.get('/api/delivery/profile');
        return toDeliveryAdapter(res.data.data);
    },

    getQuestions: async (): Promise<ApplicationQuestion[]> => {
        const res = await deliveryApi.get('/api/delivery/profile/questions');
        const raw: Array<{ question: string }> = res.data.data ?? res.data;
        return raw.map((q) => ({ question: q.question, answer: '' }));
    },

    submitProfile: async (form: DeliveryApplicationFormData): Promise<void> => {
        const data = new FormData();

        data.append('firstName', form.firstName);
        data.append('lastName', form.lastName);
        data.append('dateOfBirth', form.dateOfBirth);
        data.append('nationalIdNumber', form.nationalIdNumber);
        data.append('city', form.city);
        data.append('vehicleType', form.vehicleType);
        if (form.vehicleLicenseNumber) {
            data.append('vehicleLicenseNumber', form.vehicleLicenseNumber);
        }
        data.append('emergencyContactName', form.emergencyContactName);
        data.append('emergencyContactPhone', form.emergencyContactPhone);
        const { type: payType, bankName, iban, accountNumber, walletNumber } = form.payment;
        const paymentPayload = payType === 'bank_account'
            ? { type: payType, bankName, iban, accountNumber }
            : { type: payType, walletNumber };
        data.append('paymentInfo', JSON.stringify(paymentPayload));
        data.append('password', form.password);
        data.append('termsAccepted', 'true');
        data.append('answers', JSON.stringify(form.answers));

        if (form.profilePicture) {
            data.append('profilePicture', {
                uri: form.profilePicture.uri,
                type: form.profilePicture.type,
                name: form.profilePicture.name,
            } as unknown as Blob);
        }

        if (form.idPicture) {
            data.append('idPicture', {
                uri: form.idPicture.uri,
                type: form.idPicture.type,
                name: form.idPicture.name,
            } as unknown as Blob);
        }

        await deliveryApi.post('/api/delivery/profile', data, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },

    logout: async (refreshToken) => {
        await authApi.delete('/api/auth/logout', { data: { refreshToken } });
    },
});
