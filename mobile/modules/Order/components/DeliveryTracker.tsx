import React, { useEffect } from "react";
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

/**
 * Compact, customer-facing delivery tracker showing the four headline states
 * the customer cares about:
 *
 *   Order received → Driver accepted → On the way → Delivered
 *
 * This is intentionally simpler than the full restaurant status history; it
 * reads from the live order status + driver acceptance and is the first thing
 * the customer sees in the delivery section. It updates in real time because
 * the parent screen patches `status` / `deliveryAcceptance` from socket events.
 */

type TrackerStep = {
    key: "received" | "accepted" | "onTheWay" | "delivered";
    labelKey: string;
    fallback: string;
    icon: keyof typeof Ionicons.glyphMap;
};

const STEPS: TrackerStep[] = [
    { key: "received", labelKey: "tracker.received", fallback: "Order received", icon: "receipt-outline" },
    { key: "accepted", labelKey: "tracker.accepted", fallback: "Driver accepted", icon: "checkmark-done-outline" },
    { key: "onTheWay", labelKey: "tracker.onTheWay", fallback: "On the way", icon: "bicycle-outline" },
    { key: "delivered", labelKey: "tracker.delivered", fallback: "Delivered", icon: "home-outline" },
];

interface Props {
    /** Backend OrderStatus (any case). */
    status: string;
    /** Backend deliveryAcceptance: none | pending | accepted. */
    deliveryAcceptance?: string;
}

/**
 * Resolve how many steps are complete (0–4) from order status + acceptance.
 *  - received  : always once the order exists
 *  - accepted  : driver acceptance === 'accepted', or status past pickup
 *  - onTheWay  : status === out_for_delivery (or delivered)
 *  - delivered : status === delivered
 */
const resolveActiveIndex = (status: string, acceptance?: string): number => {
    const s = (status ?? "").toUpperCase();
    if (s === "DELIVERED") return 3;
    if (s === "OUT_FOR_DELIVERY") return 2;
    const accepted =
        (acceptance ?? "").toLowerCase() === "accepted" ||
        ["READY_FOR_PICKUP"].includes(s);
    if (accepted) return 1;
    return 0;
};

function PulseRing() {
    const pulse = useSharedValue(0);
    useEffect(() => {
        pulse.value = withRepeat(
            withTiming(1, { duration: 1300, easing: Easing.out(Easing.ease) }),
            -1,
            false,
        );
    }, [pulse]);
    const style = useAnimatedStyle(() => ({
        transform: [{ scale: interpolate(pulse.value, [0, 1], [0.7, 2.1]) }],
        opacity: interpolate(pulse.value, [0, 1], [0.5, 0]),
    }));
    return <Animated.View style={[styles.pulse, style]} />;
}

const DeliveryTracker = ({ status, deliveryAcceptance }: Props) => {
    const { t } = useOrdersT();
    const isRTL = useLanguageStore((s) => s.isRTL);
    const writingDirection = isRTL ? "rtl" : "ltr";

    const isCancelled = (status ?? "").toUpperCase() === "CANCELLED";
    if (isCancelled) {
        return (
            <View style={styles.cancelled}>
                <Ionicons name="close-circle" size={20} color={colors.error} />
                <Text style={[styles.cancelledText, { writingDirection }]}>
                    {t("status.cancelled", { defaultValue: "Cancelled" })}
                </Text>
            </View>
        );
    }

    const activeIndex = resolveActiveIndex(status, deliveryAcceptance);

    return (
        <View style={[styles.row, isRTL && styles.rowReverse]}>
            {STEPS.map((step, index) => {
                const completed = index < activeIndex;
                const active = index === activeIndex;
                const isLast = index === STEPS.length - 1;
                return (
                    <React.Fragment key={step.key}>
                        <View style={styles.stepCol}>
                            <View
                                style={[
                                    styles.dot,
                                    completed && styles.dotCompleted,
                                    active && styles.dotActive,
                                    !completed && !active && styles.dotPending,
                                ]}
                            >
                                {active ? <PulseRing /> : null}
                                <Ionicons
                                    name={completed ? "checkmark" : step.icon}
                                    size={16}
                                    color={
                                        completed || active
                                            ? colors.onPrimary
                                            : colors.outline
                                    }
                                />
                            </View>
                            <Text
                                style={[
                                    styles.label,
                                    (completed || active) && styles.labelActive,
                                    { writingDirection },
                                ]}
                                numberOfLines={2}
                            >
                                {t(step.labelKey, { defaultValue: step.fallback })}
                            </Text>
                        </View>
                        {!isLast ? (
                            <View
                                style={[
                                    styles.connector,
                                    index < activeIndex && styles.connectorDone,
                                ]}
                            />
                        ) : null}
                    </React.Fragment>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    row: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 4 },
    rowReverse: { flexDirection: "row-reverse" },
    stepCol: { alignItems: "center", width: 70 },
    dot: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
    },
    dotPending: {
        backgroundColor: colors.surfaceContainer,
        borderWidth: 1,
        borderColor: colors.surfaceContainerHighest,
    },
    dotCompleted: { backgroundColor: colors.primary },
    dotActive: { backgroundColor: colors.primary },
    pulse: {
        position: "absolute",
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primary,
    },
    label: {
        marginTop: 8,
        fontFamily: typography.bodyMedium,
        color: colors.outline,
        fontSize: 11,
        lineHeight: 14,
        textAlign: "center",
    },
    labelActive: { color: colors.onSurface, fontFamily: typography.headlineSemi },
    connector: {
        flex: 1,
        height: 2,
        backgroundColor: colors.surfaceContainerHighest,
        marginTop: 19,
        borderRadius: radii.sm,
    },
    connectorDone: { backgroundColor: colors.primary },
    cancelled: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        padding: 12,
        borderRadius: radii.lg,
        backgroundColor: "#FCE2DD",
    },
    cancelledText: {
        fontFamily: typography.headlineSemi,
        color: colors.error,
        fontSize: 14,
    },
});

export default DeliveryTracker;
