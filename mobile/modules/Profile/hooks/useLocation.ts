import { useEffect, useState } from "react";
import * as Location from "expo-location";

interface LocationCoords {
  lat: number;
  lng: number;
}

interface UseLocationResult {
  coords: LocationCoords | null;
  permissionDenied: boolean;
  isLoading: boolean;
}

export const useLocation = (): UseLocationResult => {
  const [coords, setCoords] = useState<LocationCoords | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function requestLocation() {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        if (!cancelled) {
          setPermissionDenied(true);
          setIsLoading(false);
        }
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      if (!cancelled) {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setIsLoading(false);
      }
    }

    requestLocation();
    return () => { cancelled = true; };
  }, []);

  return { coords, permissionDenied, isLoading };
};
