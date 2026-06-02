import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDelivery } from '..';
import { ACTIVE_ASSIGNMENT_QUERY_KEY } from './useActiveAssignment';
import { PENDING_ORDERS_QUERY_KEY } from './usePendingOrders';

interface RejectVariables {
    orderId: string;
    reason?: string;
}

/**
 * Declines a customer-self-pick assignment. After success the order leaves
 * the agent's queue and the customer's app flips back into "pick a driver"
 * state via the `order:delivery:rejected` socket broadcast.
 */
export const useRejectOrder = () => {
    const { rejectOrder } = useDelivery();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ orderId, reason }: RejectVariables) =>
            rejectOrder(orderId, reason),
        onSuccess: () => {
            // Both the pending list and the active assignment may shift after a
            // reject (in case the user was already on the assignment screen).
            queryClient.invalidateQueries({ queryKey: PENDING_ORDERS_QUERY_KEY });
            queryClient.invalidateQueries({ queryKey: ACTIVE_ASSIGNMENT_QUERY_KEY });
        },
    });
};
