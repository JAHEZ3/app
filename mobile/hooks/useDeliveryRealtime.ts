import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useDeliveryStore } from '@/store/useDeliveryStore';
import { deliverySocketService } from '@/socket/socket.service';
import { ACTIVE_ASSIGNMENT_QUERY_KEY } from '@/modules/delivery/hooks/useActiveAssignment';
import { PENDING_ORDERS_QUERY_KEY } from '@/modules/delivery/hooks/usePendingOrders';

/**
 * Connects the delivery-agent socket with the delivery access token and wires
 * up server-push events that are relevant to an active agent:
 *
 *  - `order:delivery:assigned` — the agent was just picked for an order. Refresh
 *                                the pending-requests list so the accept/reject
 *                                card appears instantly (was previously only
 *                                surfaced by the 20s poll).
 *  - `order:status`            — order status changed (restaurant confirmed,
 *                                customer cancelled, …); refresh the active job.
 *  - `order:new`               — kept for backwards-compat with older payloads.
 *
 * Both the pending and active queries are invalidated on every event so the
 * dashboard and the tracking screen stay in sync regardless of which one the
 * agent is looking at.
 *
 * Must be called inside a component that mounts for the lifetime of the delivery
 * tab session (e.g. the delivery tabs layout).
 */
export const useDeliveryRealtime = () => {
    const queryClient = useQueryClient();
    const accessToken = useDeliveryStore((s) => s.accessToken);
    const authStatus = useDeliveryStore((s) => s.authStatus);

    useEffect(() => {
        if (authStatus !== 'authenticated' || !accessToken) {
            deliverySocketService.disconnect();
            return;
        }

        deliverySocketService.connect(accessToken);

        const refresh = () => {
            queryClient.invalidateQueries({ queryKey: PENDING_ORDERS_QUERY_KEY });
            queryClient.invalidateQueries({ queryKey: ACTIVE_ASSIGNMENT_QUERY_KEY });
        };

        const offAssigned = deliverySocketService.on('order:delivery:assigned', refresh);
        const offNew = deliverySocketService.on('order:new', refresh);
        const offStatus = deliverySocketService.on('order:status', refresh);

        return () => {
            offAssigned();
            offNew();
            offStatus();
        };
    }, [accessToken, authStatus, queryClient]);

    useEffect(() => {
        return () => {
            deliverySocketService.disconnect();
        };
    }, []);
};
