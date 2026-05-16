import { useEffect, useMemo, useRef, useState } from 'react';
import { socketService } from '@/socket/socket.service';
import { useJoinOrderRoom, useSocketStatus } from '@/hooks/useSocket';
import type { DeliveryLocationEvent } from '@/hooks/useRealtime';

export interface DriverCoords {
    lat: number;
    lng: number;
    /** Bearing in degrees (0-360, north = 0). Derived from the last two points. */
    bearing: number;
    /** Server-side timestamp in ms (event.timestamp). */
    timestamp: number;
}

interface UseDeliveryTrackingArgs {
    orderId: string | undefined;
    /** Driver's starting position (e.g. from OrderDetails snapshot). */
    initialCoords?: { lat: number; lng: number } | null;
    /** True only when the order status is in-flight (ON_THE_WAY / PREPARING). */
    enabled: boolean;
}

interface UseDeliveryTrackingResult {
    coords: DriverCoords | null;
    /** ms since the last update — used to fade the marker if updates stop. */
    staleness: number;
    isLive: boolean;
    isStale: boolean;
    /** Last raw event for debugging / advanced UIs. */
    lastEvent: DeliveryLocationEvent | null;
}

const STALE_AFTER_MS = 15_000;

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/** Forward-bearing between two lat/lng pairs (degrees, 0-360). */
const computeBearing = (
    from: { lat: number; lng: number },
    to: { lat: number; lng: number },
): number => {
    const φ1 = toRad(from.lat);
    const φ2 = toRad(to.lat);
    const Δλ = toRad(to.lng - from.lng);
    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x =
        Math.cos(φ1) * Math.sin(φ2) -
        Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    const bearing = toDeg(Math.atan2(y, x));
    return (bearing + 360) % 360;
};

/**
 * Subscribes to `delivery:location` for one order. Joins the order room so the
 * gateway will route updates here even if the user returns to the screen after
 * a reconnect.
 *
 * The hook deliberately does NOT animate the marker itself — that lives on the
 * marker component using reanimated, which can update at 60fps without
 * re-rendering the React tree on every shared-value tick.
 */
export const useDeliveryTracking = ({
    orderId,
    initialCoords,
    enabled,
}: UseDeliveryTrackingArgs): UseDeliveryTrackingResult => {
    const socketStatus = useSocketStatus();
    useJoinOrderRoom(orderId, enabled);

    const [coords, setCoords] = useState<DriverCoords | null>(() => {
        if (!initialCoords) return null;
        return {
            lat: initialCoords.lat,
            lng: initialCoords.lng,
            bearing: 0,
            timestamp: Date.now(),
        };
    });
    const [lastEvent, setLastEvent] = useState<DeliveryLocationEvent | null>(null);
    const prevRef = useRef<{ lat: number; lng: number } | null>(
        initialCoords ?? null,
    );

    // Seed from initialCoords if it arrives after the hook mounts (e.g. when
    // the parent finishes loading order details).
    useEffect(() => {
        if (!initialCoords) return;
        setCoords((current) => {
            if (current) return current;
            prevRef.current = initialCoords;
            return {
                lat: initialCoords.lat,
                lng: initialCoords.lng,
                bearing: 0,
                timestamp: Date.now(),
            };
        });
    }, [initialCoords]);

    useEffect(() => {
        if (!enabled || !orderId) return;

        const off = socketService.on('delivery:location', (payload) => {
            const evt = payload as Partial<DeliveryLocationEvent> | null;
            if (
                !evt ||
                typeof evt.lat !== 'number' ||
                typeof evt.lng !== 'number'
            ) {
                return;
            }
            if (evt.orderId && evt.orderId !== orderId) return;

            const next = { lat: evt.lat, lng: evt.lng };
            const bearing = prevRef.current
                ? computeBearing(prevRef.current, next)
                : 0;
            prevRef.current = next;
            setCoords({
                lat: next.lat,
                lng: next.lng,
                bearing,
                timestamp: evt.timestamp ?? Date.now(),
            });
            setLastEvent(evt as DeliveryLocationEvent);
        });

        return off;
    }, [orderId, enabled]);

    // Re-render every 5s so the consumer can react to staleness without us
    // needing to push an artificial event.
    const [tick, setTick] = useState(0);
    useEffect(() => {
        if (!coords) return;
        const id = setInterval(() => setTick((n) => n + 1), 5_000);
        return () => clearInterval(id);
    }, [coords]);

    return useMemo<UseDeliveryTrackingResult>(() => {
        const now = Date.now();
        const staleness = coords ? now - coords.timestamp : Infinity;
        return {
            coords,
            staleness,
            isLive: socketStatus === 'open' && staleness < STALE_AFTER_MS,
            isStale: staleness >= STALE_AFTER_MS,
            lastEvent,
        };
        // tick is intentional — drives staleness recompute.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [coords, socketStatus, lastEvent, tick]);
};

/** Haversine distance in metres. */
export const haversineMeters = (
    a: { lat: number; lng: number },
    b: { lat: number; lng: number },
): number => {
    const R = 6_371_000;
    const φ1 = toRad(a.lat);
    const φ2 = toRad(b.lat);
    const Δφ = toRad(b.lat - a.lat);
    const Δλ = toRad(b.lng - a.lng);
    const sinΔφ = Math.sin(Δφ / 2);
    const sinΔλ = Math.sin(Δλ / 2);
    const h = sinΔφ * sinΔφ + Math.cos(φ1) * Math.cos(φ2) * sinΔλ * sinΔλ;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
};

/** Rough ETA based on a courier average speed of 25 km/h. */
export const estimateEtaMinutes = (
    driver: { lat: number; lng: number } | null,
    destination: { lat: number; lng: number } | null,
    averageKmh: number = 25,
): number | null => {
    if (!driver || !destination) return null;
    const meters = haversineMeters(driver, destination);
    const minutes = (meters / 1000 / averageKmh) * 60;
    if (!Number.isFinite(minutes)) return null;
    return Math.max(1, Math.round(minutes));
};
