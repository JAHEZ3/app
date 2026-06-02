import { useCallback, useState } from 'react';
import * as Location from 'expo-location';

export interface ResolvedLocation {
    latitude: number;
    longitude: number;
    street?: string;
    city?: string;
}

export const useCurrentLocation = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetch = useCallback(async (): Promise<ResolvedLocation | null> => {
        setError(null);
        setLoading(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setError('permission_denied');
                return null;
            }
            const position = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });
            const { latitude, longitude } = position.coords;

            // Reverse geocode — best-effort; OK if it fails (street will be empty).
            let street: string | undefined;
            let city: string | undefined;
            try {
                const places = await Location.reverseGeocodeAsync({ latitude, longitude });
                const first = places[0];
                if (first) {
                    street =
                        [first.street, first.name].filter(Boolean).join(' ').trim() ||
                        undefined;
                    city = first.city ?? first.subregion ?? first.region ?? undefined;
                }
            } catch {
                /* ignore reverse-geocode failure */
            }

            return { latitude, longitude, street, city };
        } catch (err) {
            console.log('[location] fetch failed', err);
            setError('failed');
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    return { fetch, loading, error };
};
