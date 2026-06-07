import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDelivery } from '..';
import type { DriverOrderStatusUpdate } from '../repository/DeliveryRepository';
import { ACTIVE_ASSIGNMENT_QUERY_KEY } from './useActiveAssignment';
import { PENDING_ORDERS_QUERY_KEY } from './usePendingOrders';
import { ORDER_DETAILS_QUERY_KEY } from './useDeliveryOrderDetails';

interface Vars {
    orderId: string;
    status: DriverOrderStatusUpdate;
}

/**
 * Advance the delivery lifecycle (Start Delivery → out_for_delivery,
 * Delivered → delivered). On success we write the refreshed active order back
 * into the cache and invalidate the dependent queries so the dashboard,
 * tracking screen, and details page all reflect the new state without a manual
 * refresh. Duplicate taps are guarded by `isPending` in the screen.
 */
export const useUpdateDeliveryStatus = () => {
    const { updateOrderStatus } = useDelivery();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ orderId, status }: Vars) => updateOrderStatus(orderId, status),
        onSuccess: (active, { orderId }) => {
            if (active) {
                queryClient.setQueryData(ACTIVE_ASSIGNMENT_QUERY_KEY, active);
            } else {
                queryClient.invalidateQueries({ queryKey: ACTIVE_ASSIGNMENT_QUERY_KEY });
            }
            queryClient.invalidateQueries({ queryKey: PENDING_ORDERS_QUERY_KEY });
            queryClient.invalidateQueries({
                queryKey: [...ORDER_DETAILS_QUERY_KEY, orderId],
            });
        },
    });
};
