import React, { memo, useCallback, useEffect, useState } from "react";
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
import { useRateRestaurant, getRateErrorMessage } from "../hooks/useRateRestaurant";

// 1=red … 5=green tint per selected score.
const SCORE_COLORS = ["", "#EF4444", "#F97316", "#F59E0B", "#84CC16", "#22C55E"];
const LABELS_EN = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];
const LABELS_AR = ["", "سيء", "مقبول", "جيد", "جيد جداً", "ممتاز"];

interface Props {
    visible: boolean;
    restaurantId: string;
    restaurantName: string;
    isRTL?: boolean;
    /** The caller's previous rating, if any — pre-fills the sheet. */
    initialRating?: number;
    initialComment?: string | null;
    onClose: () => void;
    onSubmitted?: () => void;
}

// ─── Single animated star ─────────────────────────────────────────────────────

const Star = memo(function Star({
    filled,
    color,
    onPress,
}: {
    filled: boolean;
    color: string;
    onPress: () => void;
}) {
    const scale = useSharedValue(1);
    useEffect(() => {
        if (filled) {
            scale.value = withSequence(
                withSpring(1.32, { damping: 5, stiffness: 340 }),
                withSpring(1, { damping: 9, stiffness: 240 }),
            );
        }
    }, [filled, scale]);
    const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
    return (
        <AnimatedPressable onPress={onPress} scaleTo={0.8} haptic="selection" style={styles.starBtn}>
            <Animated.View style={style}>
                <Ionicons
                    name={filled ? "star" : "star-outline"}
                    size={44}
                    color={filled ? color : "#D6D6D8"}
                />
            </Animated.View>
        </AnimatedPressable>
    );
});

// ─── Sheet ────────────────────────────────────────────────────────────────────

function RestaurantRatingSheet({
    visible,
    restaurantId,
    restaurantName,
    isRTL = false,
    initialRating,
    initialComment,
    onClose,
    onSubmitted,
}: Props) {
    const dir = isRTL ? "rtl" : "ltr";
    const textAlign = isRTL ? "right" : "left";
    const labels = isRTL ? LABELS_AR : LABELS_EN;

    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState("");
    const [success, setSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const rate = useRateRestaurant();
    const canSubmit = rating > 0 && !rate.isPending && !success;
    const activeColor = rating > 0 ? SCORE_COLORS[rating] : colors.primary;

    // Slide-up + backdrop fade.
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

    // (Re)initialise from the user's existing rating each time it opens.
    useEffect(() => {
        if (visible) {
            setRating(initialRating ?? 0);
            setComment(initialComment ?? "");
            setSuccess(false);
            setErrorMsg(null);
        }
    }, [visible, initialRating, initialComment]);

    const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: sheetY.value }] }));
    const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));

    // Success check pop.
    const checkScale = useSharedValue(0);
    useEffect(() => {
        checkScale.value = success
            ? withDelay(
                  40,
                  withSequence(
                      withSpring(1.15, { damping: 6, stiffness: 320 }),
                      withSpring(1, { damping: 10, stiffness: 240 }),
                  ),
              )
            : 0;
    }, [success, checkScale]);
    const checkStyle = useAnimatedStyle(() => ({ transform: [{ scale: checkScale.value }] }));

    const handleSubmit = useCallback(async () => {
        if (rating < 1 || rate.isPending || success) return;
        setErrorMsg(null);
        try {
            await rate.mutateAsync({
                restaurantId,
                rating,
                comment: comment.trim() || undefined,
            });
            setSuccess(true);
            onSubmitted?.();
            setTimeout(() => onClose(), 1100);
        } catch (err) {
            setErrorMsg(
                getRateErrorMessage(err) ??
                    (isRTL ? "تعذر إرسال التقييم. حاول مرة أخرى." : "Could not submit. Please try again."),
            );
        }
    }, [rating, comment, restaurantId, rate, success, onSubmitted, onClose, isRTL]);

    const isUpdate = (initialRating ?? 0) > 0;

    return (
        <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
            <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
            </Animated.View>

            <View style={styles.anchor} pointerEvents="box-none">
                <Animated.View style={[styles.sheet, sheetStyle]}>
                    {success ? (
                        <Animated.View entering={FadeIn.duration(220)} style={styles.successWrap}>
                            <Animated.View style={[styles.successCircle, checkStyle]}>
                                <Ionicons name="checkmark" size={42} color={colors.onPrimary} />
                            </Animated.View>
                            <Text style={[styles.successTitle, { writingDirection: dir }]}>
                                {isRTL ? "شكراً على تقييمك!" : "Thanks for rating!"}
                            </Text>
                            <Text style={[styles.successSubtitle, { writingDirection: dir }]}>
                                {isRTL
                                    ? "تقييمك يساعد الآخرين على الاختيار."
                                    : "Your rating helps others choose."}
                            </Text>
                        </Animated.View>
                    ) : (
                        <>
                            <View style={styles.handle} />

                            <View style={styles.header}>
                                <View style={[styles.iconWrap, { backgroundColor: `${activeColor}1A` }]}>
                                    <Ionicons name="restaurant" size={24} color={activeColor} />
                                </View>
                                <Text style={[styles.title, { writingDirection: dir }]} numberOfLines={2}>
                                    {isRTL ? `تقييم ${restaurantName}` : `Rate ${restaurantName}`}
                                </Text>
                                <Text style={[styles.subtitle, { writingDirection: dir }]}>
                                    {isRTL ? "كيف كانت تجربتك؟" : "How was your experience?"}
                                </Text>
                            </View>

                            <View style={styles.starsRow}>
                                {[1, 2, 3, 4, 5].map((n) => (
                                    <Star
                                        key={n}
                                        filled={n <= rating}
                                        color={SCORE_COLORS[rating] || SCORE_COLORS[n]}
                                        onPress={() => setRating(n)}
                                    />
                                ))}
                            </View>

                            {rating > 0 ? (
                                <Animated.View
                                    key={rating}
                                    entering={FadeIn.duration(180)}
                                    style={[styles.labelPill, { backgroundColor: `${activeColor}1A` }]}
                                >
                                    <Text style={[styles.labelText, { color: activeColor }]}>
                                        {labels[rating]}
                                    </Text>
                                </Animated.View>
                            ) : (
                                <Text style={[styles.hintText, { writingDirection: dir }]}>
                                    {isRTL ? "اضغط على نجمة للتقييم" : "Tap a star to rate"}
                                </Text>
                            )}

                            <TextInput
                                value={comment}
                                onChangeText={setComment}
                                placeholder={isRTL ? "أضف تعليقاً (اختياري)" : "Add a comment (optional)"}
                                placeholderTextColor={colors.outline}
                                multiline
                                maxLength={500}
                                style={[styles.comment, { textAlign, writingDirection: dir }]}
                            />

                            {errorMsg ? (
                                <Animated.View entering={FadeIn.duration(160)} style={styles.errorBox}>
                                    <Ionicons name="alert-circle" size={15} color={colors.error} />
                                    <Text style={[styles.errorText, { writingDirection: dir }]}>{errorMsg}</Text>
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
                                            colors={[activeColor, shade(activeColor, -22)]}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={styles.submitInner}
                                        >
                                            <Ionicons name="checkmark-circle" size={18} color="#fff" />
                                            <Text style={styles.submitText}>
                                                {isUpdate
                                                    ? isRTL ? "تحديث التقييم" : "Update rating"
                                                    : isRTL ? "إرسال التقييم" : "Submit rating"}
                                            </Text>
                                        </LinearGradient>
                                    ) : (
                                        <View style={[styles.submitInner, styles.submitDisabled]}>
                                            {rate.isPending ? (
                                                <PendingDots />
                                            ) : (
                                                <Text style={styles.submitTextDisabled}>
                                                    {isRTL ? "إرسال التقييم" : "Submit rating"}
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
                                        {isRTL ? "ربما لاحقاً" : "Maybe later"}
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

function PendingDots() {
    return (
        <View style={styles.dotsRow}>
            {[0, 1, 2].map((i) => (
                <Dot key={i} delay={i * 140} />
            ))}
        </View>
    );
}
function Dot({ delay }: { delay: number }) {
    const y = useSharedValue(0);
    useEffect(() => {
        const run = () => {
            y.value = withSequence(
                withTiming(-4, { duration: 300, easing: Easing.inOut(Easing.quad) }),
                withTiming(0, { duration: 300, easing: Easing.inOut(Easing.quad) }),
            );
        };
        const id = setInterval(run, 720);
        y.value = withDelay(delay, withTiming(-4, { duration: 300 }));
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
    backdrop: { backgroundColor: "rgba(0,0,0,0.52)" },
    anchor: { flex: 1, justifyContent: "flex-end" },
    sheet: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingHorizontal: 24,
        paddingTop: 12,
        paddingBottom: 34,
        ...shadows.card,
    },
    handle: {
        alignSelf: "center",
        width: 44,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.surfaceContainerHighest,
        marginBottom: 18,
    },
    header: { alignItems: "center", gap: 5, marginBottom: 22 },
    iconWrap: {
        width: 56,
        height: 56,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8,
    },
    title: {
        fontFamily: typography.headline,
        color: colors.onSurface,
        fontSize: 20,
        lineHeight: 26,
        textAlign: "center",
    },
    subtitle: {
        fontFamily: typography.bodyMedium,
        color: colors.outline,
        fontSize: 13,
        textAlign: "center",
    },
    starsRow: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 4,
        marginBottom: 12,
    },
    starBtn: { paddingHorizontal: 3, paddingVertical: 2 },
    labelPill: {
        alignSelf: "center",
        paddingHorizontal: 18,
        paddingVertical: 6,
        borderRadius: radii.pill,
        marginBottom: 18,
    },
    labelText: { fontFamily: typography.bodyBold, fontSize: 14 },
    hintText: {
        fontFamily: typography.bodyMedium,
        color: colors.outline,
        fontSize: 13,
        textAlign: "center",
        marginBottom: 18,
    },
    comment: {
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
    submitWrap: { height: 54, borderRadius: radii.pill, overflow: "hidden" },
    submitInner: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        borderRadius: radii.pill,
    },
    submitDisabled: { backgroundColor: colors.surfaceContainer },
    submitText: { fontFamily: typography.bodyBold, color: "#fff", fontSize: 15 },
    submitTextDisabled: { fontFamily: typography.bodyBold, color: colors.outline, fontSize: 15 },
    cancelBtn: { height: 46, borderRadius: radii.pill, alignItems: "center", justifyContent: "center" },
    cancelText: { fontFamily: typography.bodyBold, color: colors.outline, fontSize: 14 },
    dotsRow: { flexDirection: "row", gap: 6, alignItems: "center" },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.outline },
    successWrap: { alignItems: "center", gap: 10, paddingTop: 18, paddingBottom: 16 },
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

export default memo(RestaurantRatingSheet);
