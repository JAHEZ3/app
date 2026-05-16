import React, { memo, useEffect } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
    Easing,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated";
import AnimatedPressable from "@/components/ui/AnimatedPressable";
import { radii, shadows, typography } from "@/components/ui/theme";
import { useLanguageStore } from "@/store/useLanguageStore";
import type { TrackingTheme } from "./mapStyles";

interface Props {
    theme: TrackingTheme;
    name: string | undefined;
    phone: string | undefined;
    avatarUrl?: string;
    etaMinutes: number | null;
    distanceKm: number | null;
    isLive: boolean;
    statusLabel: string;
    callLabel: string;
    messageLabel: string;
    etaLabelTemplate: string;
    etaUnknown: string;
    distanceLabelTemplate: string;
    liveLabel: string;
    offlineLabel: string;
    onMessage?: () => void;
}

function LiveDot({ color }: { color: string }) {
    const pulse = useSharedValue(0);
    useEffect(() => {
        pulse.value = withRepeat(
            withTiming(1, { duration: 1200, easing: Easing.out(Easing.ease) }),
            -1,
            false,
        );
    }, [pulse]);
    const style = useAnimatedStyle(() => ({
        transform: [{ scale: interpolate(pulse.value, [0, 1], [0.6, 2.2]) }],
        opacity: interpolate(pulse.value, [0, 1], [0.6, 0]),
    }));
    return (
        <View style={styles.liveDotWrap}>
            <Animated.View
                style={[styles.liveDotPulse, { backgroundColor: color }, style]}
            />
            <View style={[styles.liveDotCore, { backgroundColor: color }]} />
        </View>
    );
}

function DriverInfoCard({
    theme,
    name,
    phone,
    etaMinutes,
    distanceKm,
    isLive,
    statusLabel,
    callLabel,
    messageLabel,
    etaLabelTemplate,
    etaUnknown,
    distanceLabelTemplate,
    liveLabel,
    offlineLabel,
    onMessage,
}: Props) {
    const isRTL = useLanguageStore((s) => s.isRTL);
    const textAlign = isRTL ? "right" : "left";
    const writingDirection = isRTL ? "rtl" : "ltr";

    const etaText =
        etaMinutes !== null
            ? etaLabelTemplate.replace("{{count}}", String(etaMinutes))
            : etaUnknown;
    const distanceText =
        distanceKm !== null
            ? distanceLabelTemplate.replace(
                  "{{km}}",
                  distanceKm < 1
                      ? Math.max(50, Math.round(distanceKm * 1000)) + " m"
                      : distanceKm.toFixed(1) + " km",
              )
            : "";

    const handleCall = () => {
        if (!phone) return;
        Linking.openURL(`tel:${phone}`).catch(() => undefined);
    };

    return (
        <View style={[styles.card, { backgroundColor: theme.card }]}>
            {/* Top row: status pill */}
            <View style={[styles.topRow, isRTL && styles.rowReverse]}>
                <View
                    style={[
                        styles.statusPill,
                        { backgroundColor: theme.liveBg },
                        isRTL && styles.rowReverse,
                    ]}
                >
                    <LiveDot
                        color={isLive ? theme.liveDot : theme.outline}
                    />
                    <Text
                        style={[
                            styles.statusText,
                            { color: isLive ? theme.liveText : theme.outline, writingDirection },
                        ]}
                    >
                        {isLive ? liveLabel : offlineLabel}
                    </Text>
                </View>
                <Text
                    style={[
                        styles.statusLabel,
                        { color: theme.onSurface, textAlign, writingDirection },
                    ]}
                    numberOfLines={1}
                >
                    {statusLabel}
                </Text>
            </View>

            {/* Eta block */}
            <View style={[styles.etaBlock, isRTL && styles.alignEnd]}>
                <Text
                    style={[
                        styles.etaLabel,
                        { color: theme.outline, textAlign, writingDirection },
                    ]}
                >
                    {etaUnknown && etaMinutes === null ? etaUnknown : null}
                </Text>
                <Text
                    style={[
                        styles.etaValue,
                        { color: theme.onSurface, textAlign, writingDirection },
                    ]}
                >
                    {etaText}
                </Text>
                {distanceText ? (
                    <Text
                        style={[
                            styles.etaDistance,
                            { color: theme.outline, textAlign, writingDirection },
                        ]}
                    >
                        {distanceText}
                    </Text>
                ) : null}
            </View>

            {/* Driver row + CTAs */}
            <View
                style={[
                    styles.driverRow,
                    { borderTopColor: theme.border },
                    isRTL && styles.rowReverse,
                ]}
            >
                <View
                    style={[
                        styles.avatar,
                        { backgroundColor: theme.surface, borderColor: theme.border },
                    ]}
                >
                    <Ionicons name="person" size={22} color={theme.outline} />
                </View>
                <View style={styles.driverBody}>
                    <Text
                        style={[
                            styles.driverName,
                            { color: theme.onSurface, textAlign, writingDirection },
                        ]}
                        numberOfLines={1}
                    >
                        {name ?? "—"}
                    </Text>
                    {phone ? (
                        <Text
                            style={[
                                styles.driverPhone,
                                { color: theme.outline, textAlign, writingDirection },
                            ]}
                            numberOfLines={1}
                        >
                            {phone}
                        </Text>
                    ) : null}
                </View>

                {onMessage ? (
                    <AnimatedPressable
                        onPress={onMessage}
                        haptic="selection"
                        scaleTo={0.92}
                        style={[
                            styles.ctaGhost,
                            { borderColor: theme.border },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={messageLabel}
                    >
                        <Ionicons
                            name="chatbubble-ellipses-outline"
                            size={18}
                            color={theme.onSurface}
                        />
                    </AnimatedPressable>
                ) : null}
                <AnimatedPressable
                    onPress={handleCall}
                    disabled={!phone}
                    haptic="impact"
                    scaleTo={0.92}
                    style={styles.ctaPrimary}
                    accessibilityRole="button"
                    accessibilityLabel={callLabel}
                >
                    <Ionicons name="call" size={18} color="#FFFFFF" />
                </AnimatedPressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: radii.xxl,
        padding: 18,
        gap: 14,
        ...shadows.card,
    },
    rowReverse: {
        flexDirection: "row-reverse",
    },
    alignEnd: {
        alignItems: "flex-end",
    },
    topRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
    },
    statusPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: radii.pill,
    },
    statusText: {
        fontFamily: typography.bodyBold,
        fontSize: 11,
        lineHeight: 14,
        letterSpacing: 0.3,
    },
    statusLabel: {
        flex: 1,
        fontFamily: typography.bodyBold,
        fontSize: 12,
        lineHeight: 15,
    },
    liveDotWrap: {
        width: 10,
        height: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    liveDotPulse: {
        position: "absolute",
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    liveDotCore: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    etaBlock: {
        gap: 2,
    },
    etaLabel: {
        fontFamily: typography.bodyMedium,
        fontSize: 11,
        lineHeight: 14,
    },
    etaValue: {
        fontFamily: typography.headline,
        fontSize: 28,
        lineHeight: 34,
    },
    etaDistance: {
        marginTop: 2,
        fontFamily: typography.bodyBold,
        fontSize: 12,
        lineHeight: 15,
    },
    driverRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingTop: 14,
        borderTopWidth: 1,
    },
    avatar: {
        width: 46,
        height: 46,
        borderRadius: 23,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
    },
    driverBody: {
        flex: 1,
        minWidth: 0,
    },
    driverName: {
        fontFamily: typography.headlineSemi,
        fontSize: 15,
        lineHeight: 19,
    },
    driverPhone: {
        marginTop: 2,
        fontFamily: typography.bodyMedium,
        fontSize: 12,
        lineHeight: 15,
    },
    ctaGhost: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
    },
    ctaPrimary: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "#F55905",
        alignItems: "center",
        justifyContent: "center",
        ...shadows.primary,
    },
});

export default memo(DriverInfoCard);
