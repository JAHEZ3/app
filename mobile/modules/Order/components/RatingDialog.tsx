import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
    Easing,
    FadeIn,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSequence,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import AnimatedPressable from "@/components/ui/AnimatedPressable";
import { colors, radii, shadows, typography } from "@/components/ui/theme";
import { useOrdersT } from "@/hooks/useAppTranslation";
import { useLanguageStore } from "@/store/useLanguageStore";
import {
    getRateErrorMessage,
    isAlreadyRatedError,
    useRateOrder,
} from "../hooks/useRateOrder";

interface Props {
    orderId: string;
    visible: boolean;
    onClose: () => void;
    onSubmitted?: () => void;
}

// 1=red … 5=green, used to tint the selected score.
const SCORE_COLORS = ["", "#EF4444", "#F97316", "#F59E0B", "#84CC16", "#22C55E"];
const LABELS_EN = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];
const LABELS_AR = ["", "سيء", "مقبول", "جيد", "جيد جداً", "ممتاز"];

// ─── Single animated star ─────────────────────────────────────────────────────

const Star = memo(function Star({
    filled,
    color,
    size,
    onPress,
}: {
    filled: boolean;
    color: string;
    size: number;
    onPress: () => void;
}) {
    const scale = useSharedValue(1);

    // Pop only when this star becomes filled (selection feedback).
    useEffect(() => {
        if (filled) {
            scale.value = withSequence(
                withSpring(1.3, { damping: 5, stiffness: 340 }),
                withSpring(1, { damping: 9, stiffness: 240 }),
            );
        }
    }, [filled, scale]);

    const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

    return (
        <AnimatedPressable
            onPress={onPress}
            scaleTo={0.8}
            haptic="selection"
            style={styles.starBtn}
            accessibilityRole="button"
        >
            <Animated.View style={style}>
                <Ionicons
                    name={filled ? "star" : "star-outline"}
                    size={size}
                    color={filled ? color : "#D6D6D8"}
                />
            </Animated.View>
        </AnimatedPressable>
    );
});

// ─── A labelled row of 5 stars (reused for food + delivery) ───────────────────

const StarRating = memo(function StarRating({
    icon,
    title,
    value,
    onChange,
    isRTL,
    labels,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    value: number;
    onChange: (n: number) => void;
    isRTL: boolean;
    labels: string[];
}) {
    const dir = isRTL ? "rtl" : "ltr";
    const color = value > 0 ? SCORE_COLORS[value] : colors.primary;

    return (
        <View style={styles.ratingBlock}>
            <View style={[styles.ratingHead, isRTL && styles.rowReverse]}>
                <View style={[styles.ratingIcon, { backgroundColor: `${color}1A` }]}>
                    <Ionicons name={icon} size={15} color={color} />
                </View>
                <Text style={[styles.ratingTitle, { writingDirection: dir }]}>{title}</Text>
                {value > 0 ? (
                    <Animated.Text
                        key={value}
                        entering={FadeIn.duration(180)}
                        style={[styles.ratingValueLabel, { color }]}
                    >
                        {labels[value]}
                    </Animated.Text>
                ) : null}
            </View>

            <View style={[styles.starsRow, isRTL && styles.rowReverse]}>
                {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                        key={n}
                        filled={n <= value}
                        color={SCORE_COLORS[value] || SCORE_COLORS[n]}
                        size={34}
                        onPress={() => onChange(n)}
                    />
                ))}
            </View>
        </View>
    );
});

// ─── Dialog ───────────────────────────────────────────────────────────────────

function RatingDialog({ orderId, visible, onClose, onSubmitted }: Props) {
    const { t } = useOrdersT();
    const isRTL = useLanguageStore((s) => s.isRTL);
    const dir = isRTL ? "rtl" : "ltr";
    const textAlign = isRTL ? "right" : "left";
    const labels = isRTL ? LABELS_AR : LABELS_EN;

    const [food, setFood] = useState(0);
    const [delivery, setDelivery] = useState(0);
    const [comment, setComment] = useState("");
    const [success, setSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const rate = useRateOrder();
    const canSubmit = food > 0 && delivery > 0 && !rate.isPending && !success;

    // Sheet slide-up + backdrop fade.
    const sheetY = useSharedValue(420);
    const backdrop = useSharedValue(0);
    useEffect(() => {
        if (visible) {
            backdrop.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) });
            sheetY.value = withSpring(0, { damping: 22, stiffness: 230, mass: 0.9 });
        } else {
            backdrop.value = withTiming(0, { duration: 160 });
            sheetY.value = withTiming(420, { duration: 200, easing: Easing.in(Easing.quad) });
        }
    }, [visible, sheetY, backdrop]);

    // Reset transient state each time the sheet opens.
    useEffect(() => {
        if (visible) {
            setFood(0);
            setDelivery(0);
            setComment("");
            setSuccess(false);
            setErrorMsg(null);
        }
    }, [visible]);

    const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: sheetY.value }] }));
    const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));

    // Success check-mark pop.
    const checkScale = useSharedValue(0);
    useEffect(() => {
        if (success) {
            checkScale.value = withDelay(
                40,
                withSequence(
                    withSpring(1.15, { damping: 6, stiffness: 320 }),
                    withSpring(1, { damping: 10, stiffness: 240 }),
                ),
            );
        } else {
            checkScale.value = 0;
        }
    }, [success, checkScale]);
    const checkStyle = useAnimatedStyle(() => ({ transform: [{ scale: checkScale.value }] }));

    const handleSubmit = useCallback(async () => {
        if (food < 1 || delivery < 1 || rate.isPending || success) return;
        setErrorMsg(null);
        try {
            await rate.mutateAsync({
                orderId,
                foodRating: food,
                deliveryRating: delivery,
                comment: comment.trim() || undefined,
            });
            setSuccess(true);
            onSubmitted?.();
            // Let the success state breathe, then dismiss.
            setTimeout(() => onClose(), 1100);
        } catch (err) {
            // Already-rated is a benign terminal state — show success-like close.
            if (isAlreadyRatedError(err)) {
                onSubmitted?.();
                onClose();
                return;
            }
            setErrorMsg(
                getRateErrorMessage(err) ??
                    t("rate.errorBody", { defaultValue: "Please try again." }),
            );
        }
    }, [food, delivery, comment, orderId, rate, success, onSubmitted, onClose, t]);

    const submitColor = useMemo(() => {
        const avg = Math.round((food + delivery) / 2) || 0;
        return avg > 0 ? SCORE_COLORS[avg] : colors.primary;
    }, [food, delivery]);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            statusBarTranslucent
            onRequestClose={onClose}
        >
            <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
            </Animated.View>

            <View style={styles.anchor} pointerEvents="box-none">
                <Animated.View style={[styles.sheet, sheetStyle]}>
                    {success ? (
                        // ── Success state ──────────────────────────────────────
                        <Animated.View entering={FadeIn.duration(220)} style={styles.successWrap}>
                            <Animated.View style={[styles.successCircle, checkStyle]}>
                                <Ionicons name="checkmark" size={42} color={colors.onPrimary} />
                            </Animated.View>
                            <Text style={[styles.successTitle, { writingDirection: dir }]}>
                                {t("rate.successTitle", { defaultValue: "Thanks for your feedback!" })}
                            </Text>
                            <Text style={[styles.successSubtitle, { writingDirection: dir }]}>
                                {t("rate.successBody", {
                                    defaultValue: "Your rating helps the restaurant improve.",
                                })}
                            </Text>
                        </Animated.View>
                    ) : (
                        // ── Form state ─────────────────────────────────────────
                        <>
                            <View style={styles.handle} />

                            <View style={styles.header}>
                                <Text style={[styles.title, { writingDirection: dir }]}>
                                    {t("rate.title", { defaultValue: "How was your order?" })}
                                </Text>
                                <Text style={[styles.subtitle, { writingDirection: dir }]}>
                                    {t("rate.subtitle", {
                                        defaultValue: "Rate the food and the delivery separately.",
                                    })}
                                </Text>
                            </View>

                            <StarRating
                                icon="restaurant"
                                title={t("rate.food", { defaultValue: "Food quality" })}
                                value={food}
                                onChange={setFood}
                                isRTL={isRTL}
                                labels={labels}
                            />

                            <View style={styles.divider} />

                            <StarRating
                                icon="bicycle"
                                title={t("rate.delivery", { defaultValue: "Delivery" })}
                                value={delivery}
                                onChange={setDelivery}
                                isRTL={isRTL}
                                labels={labels}
                            />

                            <TextInput
                                value={comment}
                                onChangeText={setComment}
                                placeholder={t("rate.commentPlaceholder", {
                                    defaultValue: "Add a comment (optional)",
                                })}
                                placeholderTextColor={colors.outline}
                                multiline
                                maxLength={500}
                                style={[styles.comment, { textAlign, writingDirection: dir }]}
                            />

                            {errorMsg ? (
                                <Animated.View entering={FadeIn.duration(160)} style={styles.errorBox}>
                                    <Ionicons name="alert-circle" size={15} color={colors.error} />
                                    <Text style={[styles.errorText, { writingDirection: dir }]}>
                                        {errorMsg}
                                    </Text>
                                </Animated.View>
                            ) : null}

                            <View style={styles.actions}>
                                <AnimatedPressable
                                    onPress={handleSubmit}
                                    disabled={!canSubmit}
                                    scaleTo={0.97}
                                    haptic="impact"
                                    style={styles.submitWrap}
                                >
                                    {canSubmit ? (
                                        <LinearGradient
                                            colors={[submitColor, shade(submitColor, -22)]}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={styles.submitInner}
                                        >
                                            <Ionicons name="checkmark-circle" size={18} color="#fff" />
                                            <Text style={styles.submitText}>
                                                {t("rate.submit", { defaultValue: "Submit rating" })}
                                            </Text>
                                        </LinearGradient>
                                    ) : (
                                        <View style={[styles.submitInner, styles.submitDisabled]}>
                                            {rate.isPending ? (
                                                <PendingDots />
                                            ) : (
                                                <Text style={styles.submitTextDisabled}>
                                                    {food === 0 || delivery === 0
                                                        ? t("rate.needBoth", {
                                                              defaultValue: "Rate food & delivery",
                                                          })
                                                        : t("rate.submit", {
                                                              defaultValue: "Submit rating",
                                                          })}
                                                </Text>
                                            )}
                                        </View>
                                    )}
                                </AnimatedPressable>

                                <AnimatedPressable
                                    onPress={onClose}
                                    disabled={rate.isPending}
                                    scaleTo={0.97}
                                    haptic="selection"
                                    style={styles.cancelBtn}
                                >
                                    <Text style={[styles.cancelText, { writingDirection: dir }]}>
                                        {t("rate.cancel", { defaultValue: "Maybe later" })}
                                    </Text>
                                </AnimatedPressable>
                            </View>
                        </>
                    )}
                </Animated.View>
            </View>
        </Modal>
    );
}

// Three bouncing dots while the request is in flight.
function PendingDots() {
    const dots = [0, 1, 2];
    return (
        <View style={styles.dotsRow}>
            {dots.map((i) => (
                <Dot key={i} delay={i * 140} />
            ))}
        </View>
    );
}
function Dot({ delay }: { delay: number }) {
    const y = useSharedValue(0);
    useEffect(() => {
        y.value = withDelay(
            delay,
            withSequence(
                withTiming(-4, { duration: 300, easing: Easing.inOut(Easing.quad) }),
                withTiming(0, { duration: 300, easing: Easing.inOut(Easing.quad) }),
            ),
        );
        const id = setInterval(() => {
            y.value = withSequence(
                withTiming(-4, { duration: 300, easing: Easing.inOut(Easing.quad) }),
                withTiming(0, { duration: 300, easing: Easing.inOut(Easing.quad) }),
            );
        }, 720);
        return () => clearInterval(id);
    }, [delay, y]);
    const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
    return <Animated.View style={[styles.dot, style]} />;
}

/** Darken a hex colour by `amount` (-255..255). */
function shade(hex: string, amount: number): string {
    const num = parseInt(hex.replace("#", ""), 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amount));
    const b = Math.max(0, Math.min(255, (num & 0xff) + amount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

const styles = StyleSheet.create({
    backdrop: { backgroundColor: "rgba(0,0,0,0.5)" },
    rowReverse: { flexDirection: "row-reverse" },
    anchor: { flex: 1, justifyContent: "flex-end" },
    sheet: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingHorizontal: 22,
        paddingTop: 12,
        paddingBottom: 32,
        ...shadows.card,
    },
    handle: {
        alignSelf: "center",
        width: 44,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.surfaceContainerHighest,
        marginBottom: 16,
    },
    header: { alignItems: "center", gap: 5, marginBottom: 20 },
    title: {
        fontFamily: typography.headline,
        color: colors.onSurface,
        fontSize: 21,
        lineHeight: 27,
        textAlign: "center",
    },
    subtitle: {
        fontFamily: typography.bodyMedium,
        color: colors.outline,
        fontSize: 13,
        lineHeight: 18,
        textAlign: "center",
    },

    // Rating block
    ratingBlock: { gap: 8 },
    ratingHead: { flexDirection: "row", alignItems: "center", gap: 9 },
    ratingIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
    },
    ratingTitle: {
        flex: 1,
        fontFamily: typography.bodyBold,
        color: colors.onSurface,
        fontSize: 14.5,
    },
    ratingValueLabel: {
        fontFamily: typography.bodyBold,
        fontSize: 12.5,
    },
    starsRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    starBtn: { paddingHorizontal: 4, paddingVertical: 2 },

    divider: {
        height: 1,
        backgroundColor: colors.surfaceContainer,
        marginVertical: 16,
    },

    comment: {
        marginTop: 18,
        minHeight: 80,
        maxHeight: 130,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: radii.lg,
        backgroundColor: colors.card,
        borderWidth: 1.5,
        borderColor: colors.surfaceContainer,
        fontFamily: typography.bodyMedium,
        color: colors.onSurface,
        fontSize: 14,
        lineHeight: 19,
    },

    errorBox: {
        marginTop: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        paddingHorizontal: 12,
        paddingVertical: 9,
        borderRadius: radii.md,
        backgroundColor: "#FEF2F2",
    },
    errorText: {
        flex: 1,
        fontFamily: typography.bodyMedium,
        color: colors.error,
        fontSize: 12.5,
        lineHeight: 17,
    },

    actions: { marginTop: 20, gap: 8 },
    submitWrap: {
        height: 54,
        borderRadius: radii.pill,
        overflow: "hidden",
    },
    submitInner: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        borderRadius: radii.pill,
    },
    submitDisabled: { backgroundColor: colors.surfaceContainer },
    submitText: {
        fontFamily: typography.bodyBold,
        color: "#fff",
        fontSize: 15,
    },
    submitTextDisabled: {
        fontFamily: typography.bodyBold,
        color: colors.outline,
        fontSize: 15,
    },
    cancelBtn: {
        height: 46,
        borderRadius: radii.pill,
        alignItems: "center",
        justifyContent: "center",
    },
    cancelText: {
        fontFamily: typography.bodyBold,
        color: colors.outline,
        fontSize: 14,
    },

    // Pending dots
    dotsRow: { flexDirection: "row", gap: 6, alignItems: "center" },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.outline },

    // Success
    successWrap: {
        alignItems: "center",
        gap: 10,
        paddingTop: 18,
        paddingBottom: 16,
    },
    successCircle: {
        width: 78,
        height: 78,
        borderRadius: 39,
        backgroundColor: "#22C55E",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 6,
        ...shadows.soft,
    },
    successTitle: {
        fontFamily: typography.headline,
        color: colors.onSurface,
        fontSize: 19,
        textAlign: "center",
    },
    successSubtitle: {
        fontFamily: typography.bodyMedium,
        color: colors.outline,
        fontSize: 13.5,
        lineHeight: 19,
        textAlign: "center",
        maxWidth: 280,
    },
});

export default memo(RatingDialog);
