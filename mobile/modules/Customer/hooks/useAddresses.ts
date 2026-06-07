import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useAuthStore } from '@/store/useAuthStore';
import { useCustomerRepository } from '..';
import type { CustomerAddress, CustomerAddressInput } from '../types';

export const ADDRESSES_QUERY_KEY = ['customer', 'addresses'] as const;

interface ApiErrorPayload {
    message?: string | string[];
}

export const getAddressErrorMessage = (err: unknown): string | null => {
    if (!(err instanceof AxiosError)) return null;
    const payload = err.response?.data as ApiErrorPayload | undefined;
    const raw = payload?.message;
    if (Array.isArray(raw)) return raw[0] ?? null;
    if (typeof raw === 'string') return raw;
    return null;
};

export const useAddresses = (enabled = true) => {
    const { getAddresses } = useCustomerRepository();
    const isAuthed = useAuthStore((s) => s.status) === 'authenticated';

    return useQuery<CustomerAddress[], AxiosError>({
        queryKey: ADDRESSES_QUERY_KEY,
        queryFn: () => getAddresses(),
        enabled: isAuthed && enabled,
        staleTime: 1000 * 60 * 2,
        retry: 0,
        refetchOnWindowFocus: false,
    });
};

export const useCreateAddress = () => {
    const { createAddress } = useCustomerRepository();
    const queryClient = useQueryClient();

    return useMutation<CustomerAddress, AxiosError, CustomerAddressInput>({
        mutationFn: (input) => createAddress(input),
        retry: 0,
        onSuccess: (created) => {
            queryClient.setQueryData<CustomerAddress[] | undefined>(
                ADDRESSES_QUERY_KEY,
                (current) => (current ? [...current, created] : [created]),
            );
            queryClient.invalidateQueries({ queryKey: ADDRESSES_QUERY_KEY });
        },
    });
};

interface UpdateVariables {
    id: string;
    input: CustomerAddressInput;
}

export const useUpdateAddress = () => {
    const { updateAddress } = useCustomerRepository();
    const queryClient = useQueryClient();

    return useMutation<CustomerAddress, AxiosError, UpdateVariables>({
        mutationFn: ({ id, input }) => updateAddress(id, input),
        retry: 0,
        onSuccess: (updated) => {
            queryClient.setQueryData<CustomerAddress[] | undefined>(
                ADDRESSES_QUERY_KEY,
                (current) =>
                    current?.map((a) => (a.id === updated.id ? updated : a)) ?? [updated],
            );
            queryClient.invalidateQueries({ queryKey: ADDRESSES_QUERY_KEY });
        },
    });
};

export const useDeleteAddress = () => {
    const { deleteAddress } = useCustomerRepository();
    const queryClient = useQueryClient();

    return useMutation<void, AxiosError, string>({
        mutationFn: (id) => deleteAddress(id),
        retry: 0,
        onSuccess: (_data, id) => {
            queryClient.setQueryData<CustomerAddress[] | undefined>(
                ADDRESSES_QUERY_KEY,
                (current) => current?.filter((a) => a.id !== id) ?? [],
            );
            queryClient.invalidateQueries({ queryKey: ADDRESSES_QUERY_KEY });
        },
    });
};
