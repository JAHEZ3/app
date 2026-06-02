import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useAuthStore } from '@/store/useAuthStore';
import { useOrderRepository } from '..';
import type {
    OpenDeliveryAgent,
    OpenDeliveryAgentsQuery,
} from '../repository/OrderRepository';
import { ORDER_DETAILS_QUERY_KEY } from './useOrderDetails';

export const OPEN_DRIVERS_QUERY_KEY = ['delivery', 'open-agents'] as const;

interface ApiErrorPayload {
    message?: string | string[];
}

export const getDriverErrorMessage = (err: unknown): string | null => {
    if (!(err instanceof AxiosError)) return null;
    const payload = err.response?.data as ApiErrorPayload | undefined;
    const raw = payload?.message;
    if (Array.isArray(raw)) return raw[0] ?? null;
    if (typeof raw === 'string') return raw;
    return null;
};

export const useOpenDeliveryAgents = (
    query: OpenDeliveryAgentsQuery | null,
    enabled = true,
) => {
    const { getOpenDeliveryAgents } = useOrderRepository();
    const isAuthed = useAuthStore((s) => s.status) === 'authenticated';

    return useQuery<OpenDeliveryAgent[], AxiosError>({
        queryKey: [...OPEN_DRIVERS_QUERY_KEY, query?.lat ?? 0, query?.lng ?? 0, query?.city ?? ''],
        // query === null means caller explicitly disabled the fetch.
        // An empty {} fetches all active agents with no location filter.
        queryFn: () => getOpenDeliveryAgents(query ?? {}),
        enabled: query !== null && isAuthed && enabled,
        staleTime: 1000 * 20,
        retry: 0,
        refetchOnWindowFocus: false,
    });
};

interface AssignVariables {
    orderId: string;
    deliveryAgentId: string;
}

export const useAssignDeliveryAgent = () => {
    const { assignDeliveryAgent } = useOrderRepository();
    const queryClient = useQueryClient();

    return useMutation<void, AxiosError, AssignVariables>({
        mutationFn: ({ orderId, deliveryAgentId }) =>
            assignDeliveryAgent(orderId, deliveryAgentId),
        retry: 0,
        onSuccess: (_data, { orderId }) => {
            queryClient.invalidateQueries({ queryKey: [...ORDER_DETAILS_QUERY_KEY, orderId] });
            queryClient.invalidateQueries({ queryKey: ['orders'] });
        },
    });
};
