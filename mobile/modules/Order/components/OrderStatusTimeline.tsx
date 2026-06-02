import React, { useEffect, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
    Easing,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated";
import { colors, radii, typography } from "@/components/ui/theme";
import { useOrdersT } from "@/hooks/useAppTranslation";
import { useLanguageStore } from "@/store/useLanguageStore";
import type { OrderStatusHistoryEntry } from "../types";

interface OrderStatusTimelineProps {
    /** Server status history; sorted ascending by changedAt before rendering. */
    history: OrderStatusHistoryEntry[];
    /** The current status; used to highlight the active step. */
    currentStatus?: string;
}

type StepKey =
    | "PENDING"
    | "CONFIRMED"
    | "PREPARING"
    | "READY_FOR_PICKUP"
    | "OUT_FOR_DELIVERY"
    | "DELIVERED";

interface Step {
    key: StepKey;
    /** i18n key under `status.*` */
    labelKey: string;
    icon: keyof typeof Ionicons.glyphMap;
}

const STEPS: Step[] = [
    { key: "PENDING", labelKey: "pending", icon: "time-outline" },
    { key: "CONFIRMED", labelKey: "confirmed", icon: "checkmark-done-outline" },
    { key: "PREPARING", labelKey: "preparing", icon: "restaurant-outline" },
    { key: "READY_FOR_PICKUP", labelKey: "readyForPickup", icon: "bag-handle-outline" },
    { key: "OUT_FOR_DELIVERY", labelKey: "outForDelivery", icon: "bicycle-outline" },
    { key: "DELIVERED", labelKey: "delivered", icon: "home-outline" },
];

const STATUS_TO_INDEX: Record<string, number> = {
    PENDING: 0,
    CONFIRMED: 1,
    PREPARING: 2,
    READY_FOR_PICKUP: 3,
    OUT_FOR_DELIVERY: 4,
    DELIVERED: 5,
    CANCELLED: -1,
};

const formatTimestamp = (iso: string, locale: string) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    try {
        return date.toLocaleString(locale, {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return date.toLocaleString();
    }
};

function PulseDot() {
    const pulse = useSharedValue(0);
    useEffect(() => {
        pulse.value = withRepeat(
            withTiming(1, { duration: 1200, easing: Easing.out(Easing.ease) }),
            -1,
            false,
        );
    }, [pulse]);
    const style = useAnimatedStyle(() => ({
        transform: [{ scale: interpolate(pulse.value, [0, 1], [0.6, 2.0]) }],
        opacity: interpolate(pulse.value, [0, 1], [0.55, 0]),
    }));
    return <Animated.View style={[styles.pulse, style]} />;
}

const OrderStatusTimeline = ({
    history,
    currentStatus,
}: OrderStatusTimelineProps) => {
    const { t } = useOrdersT();
    const isRTL = useLanguageStore((state) => state.isRTL);
    const language = useLanguageStore((state) => state.language);
    const writingDirection = isRTL ? "rtl" : "ltr";
    const textAlign = isRTL ? "right" : "left";

    const sorted = useMemo(
        () =>
            [...history].sort(
                (a, b) =>
                    new Date(a.changedAt).getTime() -
                    new Date(b.changedAt).getTime(),
            ),
        [history],
    );

    const isCancelled = (currentStatus ?? "").toUpperCase() === "CANCELLED";

    // Map each canonical step to the latest matching history entry (for timestamp).
    const stepTimestamps = useMemo(() => {
        const map: Partial<Record<StepKey, string>> = {};
        for (const entry of sorted) {
            const key = entry.status as StepKey;
            if (STATUS_TO_INDEX[key] !== undefined && STATUS_TO_INDEX[key] >= 0) {
                map[key] = entry.changedAt;
            }
        }
        return map;
    }, [sorted]);

    const activeIndex = useMemo(() => {
        if (currentStatus) {
            const idx = STATUS_TO_INDEX[currentStatus.toUpperCase()];
            if (idx !== undefined && idx >= 0) return idx;
        }
        // Fall back to the most-recent canonical entry.
        for (let i = sorted.length - 1; i >= 0; i--) {
            const idx = STATUS_TO_INDEX[sorted[i].status as string];
            if (idx !== undefined && idx >= 0) return idx;
        }
        return 0;
    }, [currentStatus, sorted]);

    // Cancelled override — show single cancelled card.
    if (isCancelled) {
        const cancelledEntry = sorted.find(
            (e) => (e.status as string).toUpperCase() === "CANCELLED",
        );
        return (
            <View style={styles.cancelledBox}>
                <View style={styles.cancelledIcon}>
                    <Ionicons
                        name="close-circle"
                        size={26}
                        color={colors.error}
                    />
                </View>
                <View style={styles.cancelledTextBlock}>
                    <Text
                        style={[styles.cancelledTitle, { textAlign, writingDirection }]}
                    >
                        {t("status.cancelled")}
                    </Text>
                    {cancelledEntry ? (
                        <Text
                            style={[
                                styles.cancelledTime,
                                { textAlign, writingDirection },
                            ]}
                        >
                            {formatTimestamp(
                                cancelledEntry.changedAt,
                                language === "ar" ? "ar" : "en-GB",
                            )}
                        </Text>
                    ) : null}
                    {cancelledEntry?.note ? (
                        <Text
                            style={[
                                styles.cancelledNote,
                                { textAlign, writingDirection },
                            ]}
                        >
                            {cancelledEntry.note}
                        </Text>
                    ) : null}
                </View>
            </View>
        );
    }

    return (
        <View style={styles.wrap}>
            {STEPS.map((step, index) => {
                const isLast = index === STEPS.length - 1;
                const isCompleted = index < activeIndex;
                const isActive = index === activeIndex;
                const ts = stepTimestamps[step.key];

                return (
                    <View
                        key={step.key}
                        style={[styles.row, isRTL && styles.rowReverse]}
                    >
                        <View style={styles.railColumn}>
                            <View
                                style={[
                                    styles.dot,
                                    isCompleted && styles.dotCompleted,
                                    isActive && styles.dotActive,
                                    !isCompleted && !isActive && styles.dotPending,
                                ]}
                            >
                                {isActive ? <PulseDot /> : null}
                                <Ionicons
                                    name={
                                        isCompleted ? "checkmark" : step.icon
                                    }
                                    size={14}
                                    color={
                                        isCompleted || isActive
                                            ? colors.onPrimary
                                            : colors.outline
                                    }
                                />
                            </View>
                            {!isLast ? (
                                <View
                                    style={[
                                        styles.line,
                                        isCompleted && styles.lineCompleted,
                                    ]}
                                />
                            ) : null}
                        </View>

                        <View style={styles.body}>
                            <Text
                                style={[
                                    styles.label,
                                    (isCompleted || isActive) && styles.labelActive,
                                    { textAlign, writingDirection },
                                ]}
                            >
                                {t(`status.${step.labelKey}`)}
                            </Text>
                            {ts ? (
                                <Text
                                    style={[
                                        styles.timestamp,
                                        { textAlign, writingDirection },
                                    ]}
                                >
                                    {formatTimestamp(
                                        ts,
                                        language === "ar" ? "ar" : "en-GB",
                                    )}
                                </Text>
                            ) : isActive ? (
                                <Text
                                    style={[
                                        styles.timestampMuted,
                                        { textAlign, writingDirection },
                                    ]}
                                >
                                    {t("history.inProgress", {
                                        defaultValue: "In progress…",
                                    })}
                                </Text>
                            ) : (
                                <Text
                                    style={[
                                        styles.timestampMuted,
                                        { textAlign, writingDirection },
                                    ]}
                                >
                                    {t("history.upcoming", {
                                        defaultValue: "Upcoming",
                                    })}
                                </Text>
                            )}
                        </View>
                    </View>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    wrap: {
        gap: 0,
    },
    rowReverse: {
        flexDirection: "row-reverse",
    },
    row: {
        flexDirection: "row",
        gap: 14,
    },
    railColumn: {
        alignItems: "center",
        width: 30,
    },
    dot: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        zIndex: 1,
    },
    dotPending: {
        backgroundColor: colors.surfaceContainer,
        borderWidth: 1,
        borderColor: colors.surfaceContainerHighest,
    },
    dotCompleted: {
        backgroundColor: colors.primary,
    },
    dotActive: {
        backgroundColor: colors.primary,
    },
    pulse: {
        position: "absolute",
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: colors.primary,
    },
    line: {
        width: 2,
        flex: 1,
        minHeight: 22,
        backgroundColor: colors.surfaceContainerHighest,
        marginVertical: 2,
        borderRadius: radii.sm,
    },
    lineCompleted: {
        backgroundColor: colors.primary,
    },
    body: {
        flex: 1,
        paddingBottom: 16,
        gap: 2,
    },
    label: {
        fontFamily: typography.headlineSemi,
        color: colors.outline,
        fontSize: 14,
        lineHeight: 18,
    },
    labelActive: {
        color: colors.onSurface,
    },
    timestamp: {
        fontFamily: typography.bodyMedium,
        color: colors.outline,
        fontSize: 11,
        lineHeight: 14,
    },
    timestampMuted: {
        fontFamily: typography.body,
        color: colors.outline,
        fontSize: 11,
        lineHeight: 14,
        opacity: 0.65,
    },
    cancelledBox: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 14,
        borderRadius: radii.lg,
        backgroundColor: "#FCE2DD",
        borderWidth: 1,
        borderColor: "rgba(176, 37, 0, 0.18)",
    },
    cancelledIcon: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: colors.card,
        alignItems: "center",
        justifyContent: "center",
    },
    cancelledTextBlock: {
        flex: 1,
        minWidth: 0,
        gap: 2,
    },
    cancelledTitle: {
        fontFamily: typography.headlineSemi,
        color: colors.error,
        fontSize: 15,
        lineHeight: 19,
    },
    cancelledTime: {
        fontFamily: typography.bodyMedium,
        color: colors.outline,
        fontSize: 12,
        lineHeight: 15,
    },
    cancelledNote: {
        marginTop: 2,
        fontFamily: typography.bodyMedium,
        color: colors.onSurface,
        fontSize: 12,
        lineHeight: 16,
    },
});

export default OrderStatusTimeline;
