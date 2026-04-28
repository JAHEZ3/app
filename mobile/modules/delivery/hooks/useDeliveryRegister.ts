import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useDelivery } from '..';
import { useDeliveryPhoneStore } from '@/store/useDeliveryPhoneStore';

export const useDeliveryRegister = () => {
    const { register } = useDelivery();
    const { setPhoneNumber } = useDeliveryPhoneStore();

    return useMutation({
        mutationKey: ['delivery/register'],
        mutationFn: register,
        onSuccess: (_, phone) => {
            setPhoneNumber(phone);
            router.push('/delivery/otp' as never);
        },
    });
};
