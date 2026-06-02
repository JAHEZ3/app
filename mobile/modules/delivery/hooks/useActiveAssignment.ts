import { useQuery } from '@tanstack/react-query';
import { useDelivery } from '..';
import { useDeliveryStore } from '@/store/useDeliveryStore';

export const ACTIVE_ASSIGNMENT_QUERY_KEY = ['delivery', 'activeAssignment'] as const;

export const useActiveAssignment = () => {
    const { getActiveAssignment } = useDelivery();
    const accessToken = useDeliveryStore((s) => s.accessToken);

    return useQuery({
        queryKey: ACTIVE_ASSIGNMENT_QUERY_KEY,
        queryFn: getActiveAssignment,
        enabled: !!accessToken,
        staleTime: 1000 * 30,
        refetchInterval: 1000 * 60,
        refetchOnReconnect: true,
        retry: 1,
    });
};
