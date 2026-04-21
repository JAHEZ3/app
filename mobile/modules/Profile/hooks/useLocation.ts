import { useCallback, useEffect, useState } from "react";
import * as Location from "expo-location";

interface LocationCoords {
  lat: number;
  lng: number;
}

type PermissionState = "undetermined" | "granted" | "denied";

interface UseLocationResult {
  coords: LocationCoords | null;
  permissionState: PermissionState;
  hasPermission: boolean;
  canAskAgain: boolean;
  permissionDenied: boolean;
  isLoading: boolean;
  requestLocation: () => Promise<void>;
  refreshLocation: () => Promise<void>;
}

export const useLocation = (): UseLocationResult => {
  const [coords, setCoords] = useState<LocationCoords | null>(null);
  const [permissionState, setPermissionState] = useState<PermissionState>("undetermined");
  const [canAskAgain, setCanAskAgain] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCurrentLocation = useCallback(async (cancelled = false) => {
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    if (!cancelled) {
      setCoords({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
    }
  }, []);

  const requestLocation = useCallback(async () => {
    setIsLoading(true);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      const granted = permission.status === Location.PermissionStatus.GRANTED;

      setPermissionState(granted ? "granted" : "denied");
      setPermissionDenied(!granted);
      setCanAskAgain(permission.canAskAgain);

      if (!granted) {
        return;
      }

      await fetchCurrentLocation();
    } finally {
      setIsLoading(false);
    }
  }, [fetchCurrentLocation]);

  const refreshLocation = useCallback(async () => {
    if (permissionState !== "granted") {
      return;
    }

    setIsLoading(true);
    try {
      await fetchCurrentLocation();
    } finally {
      setIsLoading(false);
    }
  }, [fetchCurrentLocation, permissionState]);

  useEffect(() => {
    let cancelled = false;

    async function hydrateLocation() {
      try {
        const permission = await Location.getForegroundPermissionsAsync();
        const granted = permission.status === Location.PermissionStatus.GRANTED;

        if (cancelled) return;

        setPermissionState(
          granted
            ? "granted"
            : permission.status === Location.PermissionStatus.DENIED
              ? "denied"
              : "undetermined"
        );
        setPermissionDenied(permission.status === Location.PermissionStatus.DENIED);
        setCanAskAgain(permission.canAskAgain);

        if (!granted) {
          return;
        }

        await fetchCurrentLocation(cancelled);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    hydrateLocation();
    return () => {
      cancelled = true;
    };
  }, [fetchCurrentLocation]);

  return {
    coords,
    permissionState,
    hasPermission: permissionState === "granted",
    canAskAgain,
    permissionDenied,
    isLoading,
    requestLocation,
    refreshLocation,
  };
};
