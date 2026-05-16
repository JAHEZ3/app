import React, { memo, useEffect, useMemo, useRef } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedRegion, MarkerAnimated } from "react-native-maps";
import { colors, shadows } from "@/components/ui/theme";

type MarkerAnimatedHandle = InstanceType<typeof MarkerAnimated> & {
    animateMarkerToCoordinate?: (
        coordinate: { latitude: number; longitude: number },
        duration: number,
    ) => void;
};

interface Props {
    /** Target coordinates from the latest server event. */
    coord: { lat: number; lng: number };
    /** Bearing in degrees (0 = north). */
    bearing?: number;
    /** Animation duration in ms — slightly less than the throttle window. */
    durationMs?: number;
    /** When true, the marker fades and stops pulsing. */
    stale?: boolean;
    /** Optional callback when the marker's position has finished animating. */
    onAnimationEnd?: () => void;
}

/**
 * AnimatedRegion + MarkerAnimated lets react-native-maps interpolate latitude
 * and longitude on the native side, so the move stays smooth even when the
 * JS thread is busy. We feed it a fresh target each time the server sends a
 * new location and let it tween for `durationMs`.
 *
 * The pin itself is plain content; rotating it requires that the platform
 * supports the `rotation` prop (Android does; iOS uses anchor + transform).
 */
function AnimatedDriverMarker({
    coord,
    bearing = 0,
    durationMs = 2_400,
    stale = false,
    onAnimationEnd,
}: Props) {
    const region = useMemo(
        () =>
            new AnimatedRegion({
                latitude: coord.lat,
                longitude: coord.lng,
                latitudeDelta: 0,
                longitudeDelta: 0,
            }),
        // Region is created once; subsequent updates flow via timing().
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );

    const markerRef = useRef<MarkerAnimatedHandle | null>(null);
    const lastTarget = useRef<{ lat: number; lng: number }>({
        lat: coord.lat,
        lng: coord.lng,
    });

    useEffect(() => {
        const last = lastTarget.current;
        // Skip if the server resent the exact same point.
        if (last.lat === coord.lat && last.lng === coord.lng) return;
        lastTarget.current = { lat: coord.lat, lng: coord.lng };

        // Android supports the higher-fidelity native API; iOS falls back to
        // AnimatedRegion.timing (still native-driven for the coordinate).
        if (Platform.OS === "android" && markerRef.current?.animateMarkerToCoordinate) {
            markerRef.current.animateMarkerToCoordinate(
                { latitude: coord.lat, longitude: coord.lng },
                durationMs,
            );
        } else {
            // AnimatedRegion.timing expects a TimingAnimationConfig — the
            // toValue is implied by the latitude/longitude/delta fields.
            const timingConfig = {
                toValue: 0,
                latitude: coord.lat,
                longitude: coord.lng,
                latitudeDelta: 0,
                longitudeDelta: 0,
                useNativeDriver: false,
                duration: durationMs,
            } as unknown as Parameters<typeof region.timing>[0];

            region.timing(timingConfig).start(({ finished }) => {
                if (finished) onAnimationEnd?.();
            });
        }
    }, [coord.lat, coord.lng, durationMs, region, onAnimationEnd]);

    return (
        <MarkerAnimated
            ref={(ref: MarkerAnimatedHandle | null) => {
                markerRef.current = ref;
            }}
            coordinate={region}
            anchor={{ x: 0.5, y: 0.5 }}
            flat
            rotation={bearing}
            tracksViewChanges={false}
        >
            <View style={styles.wrap}>
                {!stale ? <View style={styles.pulseOuter} /> : null}
                {!stale ? <View style={styles.pulseInner} /> : null}
                <View style={[styles.pin, stale && styles.pinStale]}>
                    <Ionicons name="bicycle" size={18} color={colors.onPrimary} />
                </View>
            </View>
        </MarkerAnimated>
    );
}

const styles = StyleSheet.create({
    wrap: {
        width: 64,
        height: 64,
        alignItems: "center",
        justifyContent: "center",
    },
    pulseOuter: {
        position: "absolute",
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: "rgba(245,89,5,0.18)",
    },
    pulseInner: {
        position: "absolute",
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: "rgba(245,89,5,0.28)",
    },
    pin: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.primary,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 3,
        borderColor: "#FFFFFF",
        ...shadows.primary,
    },
    pinStale: {
        backgroundColor: colors.outline,
    },
});

export default memo(AnimatedDriverMarker);
