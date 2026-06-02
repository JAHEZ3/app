import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useDeliveryStore } from '@/store/useDeliveryStore';
import { deliverySocketService } from '@/socket/socket.service';

/**
 * Connects the delivery-agent socket with the delivery access token and wires
 * up server-push events that are relevant to an active agent:
 *
 *  - `order:new`              — a new order was assigned; invalidate the active
 *                               assignment query so the tracking screen updates.
 *  - `order:status:updated`   — order status changed (e.g. restaurant confirmed,
 *                               customer cancelled); invalidate assignment cache.
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

        const offNew = deliverySocketService.on('order:new', () => {
            queryClient.invalidateQueries({ queryKey: ['activeAssignment'] });
        });

        const offStatus = deliverySocketService.on('order:status', () => {
            queryClient.invalidateQueries({ queryKey: ['activeAssignment'] });
        });

        return () => {
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
