import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDelivery } from '..';
import { ACTIVE_ASSIGNMENT_QUERY_KEY } from './useActiveAssignment';
import { PENDING_ORDERS_QUERY_KEY } from './usePendingOrders';

export const useAcceptOrder = () => {
    const { acceptOrder } = useDelivery();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (orderId: string) => acceptOrder(orderId),
        onSuccess: (assignment) => {
            queryClient.setQueryData(ACTIVE_ASSIGNMENT_QUERY_KEY, assignment);
            queryClient.invalidateQueries({ queryKey: PENDING_ORDERS_QUERY_KEY });
        },
    });
};
