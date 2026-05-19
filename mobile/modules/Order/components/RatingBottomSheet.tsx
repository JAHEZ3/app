import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
    Easing,
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import AnimatedPressable from "@/components/ui/AnimatedPressable";
import { colors, radii, shadows, typography } from "@/components/ui/theme";
import { useLanguageStore } from "@/store/useLanguageStore";
import StarRating from "./StarRating";

interface Props {
    visible: boolean;
    onDismiss: () => void;
    onSubmit: (args: {
        foodRating: number;
        deliveryRating: number;
        comment?: string;
    }) => Promise<void> | void;
    isSubmitting: boolean;
    /** Localized copy — keeps this component i18n-agnostic. */
    title: string;
    subtitle: string;
    foodLabel: string;
    deliveryLabel: string;
    commentLabel: string;
    commentPlaceholder: string;
    submitLabel: string;
    submittingLabel: string;
    requiredHint: string;
    inlineError?: string | null;
    /** Optional restaurant name to anchor the question. */
    restaurantName?: string;
}

const SHEET_HIDDEN_OFFSET = 1.2; // multiplied by sheet height

function RatingBottomSheet({
    visible,
    onDismiss,
    onSubmit,
    isSubmitting,
    title,
    subtitle,
    foodLabel,
    deliveryLabel,
    commentLabel,
    commentPlaceholder,
    submitLabel,
    submittingLabel,
    requiredHint,
    inlineError,
    restaurantName,
}: Props) {
    const insets = useSafeAreaInsets();
    const isRTL = useLanguageStore((s) => s.isRTL);
    const writingDirection = isRTL ? "rtl" : "ltr";
    const textAlign = isRTL ? "right" : "left";

    const [foodRating, setFoodRating] = useState(0);
    const [deliveryRating, setDeliveryRating] = useState(0);
    const [comment, setComment] = useState("");

    // The Modal wrapper unmounts the content when hidden so resetting on the
    // visible→true transition is enough; we *don't* reset while submitting.
    useEffect(() => {
        if (visible && !isSubmitting) {
            setFoodRating(0);
            setDeliveryRating(0);
            setComment("");
        }
    }, [visible, isSubmitting]);

    const canSubmit = foodRating > 0 && deliveryRating > 0 && !isSubmitting;

    const handleSubmit = useCallback(async () => {
        if (!canSubmit) return;
        await onSubmit({
            foodRating,
            deliveryRating,
            comment: comment.trim() || undefined,
        });
    }, [canSubmit, comment, deliveryRating, foodRating, onSubmit]);

    // ── Animations ────────────────────────────────────────────────────────
    // The sheet slides up from off-screen; the backdrop fades in. Modal's
    // built-in transition is iOS-only and stiff, so we drive both with
    // reanimated for parity across platforms.
    const progress = useSharedValue(0);
    const [shouldRender, setShouldRender] = useState(visible);

    useEffect(() => {
        if (visible) {
            setShouldRender(true);
            progress.value = withTiming(1, {
                duration: 280,
                easing: Easing.out(Easing.cubic),
            });
        } else {
            progress.value = withTiming(
                0,
                { duration: 220, easing: Easing.in(Easing.cubic) },
                (finished) => {
                    if (finished) runOnJS(setShouldRender)(false);
                },
            );
        }
    }, [visible, progress]);

    const backdropStyle = useAnimatedStyle(() => ({
        opacity: interpolate(progress.value, [0, 1], [0, 1]),
    }));

    const sheetStyle = useAnimatedStyle(() => ({
        transform: [
            {
                translateY: interpolate(
                    progress.value,
                    [0, 1],
                    [SHEET_HIDDEN_OFFSET * 600, 0], // 600 ≈ tall sheet ceiling
                ),
            },
        ],
        opacity: interpolate(progress.value, [0, 0.4, 1], [0, 1, 1]),
    }));

    const dismiss = useCallback(() => {
        if (isSubmitting) return;
        onDismiss();
    }, [isSubmitting, onDismiss]);

    const submitButtonLabel = useMemo(
        () => (isSubmitting ? submittingLabel : submitLabel),
        [isSubmitting, submitLabel, submittingLabel],
    );

    if (!shouldRender) return null;

    return (
        <Modal
            visible={shouldRender}
            transparent
            animationType="none"
            onRequestClose={dismiss}
            statusBarTranslucent
        >
            <View style={styles.root}>
                <Animated.View
                    style={[styles.backdrop, backdropStyle]}
                    pointerEvents={visible ? "auto" : "none"}
                >
                    <Pressable
                        style={StyleSheet.absoluteFill}
                        onPress={dismiss}
                        accessibilityRole="button"
                        accessibilityLabel="Dismiss"
                    />
                </Animated.View>

                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                    style={styles.keyboardWrap}
                    pointerEvents="box-none"
                >
                    <Animated.View
                        style={[
                            styles.sheet,
                            { paddingBottom: 18 + Math.max(insets.bottom, 0) },
                            sheetStyle,
                        ]}
                    >
                        <View style={styles.handle} />

                        <View
                            style={[
                                styles.headerRow,
                                { flexDirection: isRTL ? "row-reverse" : "row" },
                            ]}
                        >
                            <View style={styles.headerIcon}>
                                <Ionicons
                                    name="star"
                                    size={20}
                                    color={colors.primary}
                                />
                            </View>
                            <View style={styles.headerTextBlock}>
                                <Text
                                    style={[
                                        styles.title,
                                        { textAlign, writingDirection },
                                    ]}
                                    numberOfLines={2}
                                >
                                    {title}
                                </Text>
                                <Text
                                    style={[
                                        styles.subtitle,
                                        { textAlign, writingDirection },
                                    ]}
                                    numberOfLines={2}
                                >
                                    {restaurantName
                                        ? `${subtitle} · ${restaurantName}`
                                        : subtitle}
                                </Text>
                            </View>

                            <AnimatedPressable
                                onPress={dismiss}
                                disabled={isSubmitting}
                                haptic="selection"
                                scaleTo={0.9}
                                style={styles.closeBtn}
                                accessibilityRole="button"
                                accessibilityLabel="Close"
                            >
                                <Ionicons
                                    name="close"
                                    size={18}
                                    color={colors.onSurface}
                                />
                            </AnimatedPressable>
                        </View>

                        <View style={styles.section}>
                            <Text
                                style={[
                                    styles.sectionLabel,
                                    { textAlign, writingDirection },
                                ]}
                            >
                                {foodLabel}
                            </Text>
                            <View style={styles.starsCenter}>
                                <StarRating
                                    value={foodRating}
                                    onChange={setFoodRating}
                                    size={34}
                                    accessibilityLabel={foodLabel}
                                />
                            </View>
                        </View>

                        <View style={styles.section}>
                            <Text
                                style={[
                                    styles.sectionLabel,
                                    { textAlign, writingDirection },
                                ]}
                            >
                                {deliveryLabel}
                            </Text>
                            <View style={styles.starsCenter}>
                                <StarRating
                                    value={deliveryRating}
                                    onChange={setDeliveryRating}
                                    size={34}
                                    accessibilityLabel={deliveryLabel}
                                />
                            </View>
                        </View>

                        <View style={styles.section}>
                            <Text
                                style={[
                                    styles.sectionLabel,
                                    { textAlign, writingDirection },
                                ]}
                            >
                                {commentLabel}
                            </Text>
                            <TextInput
                                value={comment}
                                onChangeText={setComment}
                                placeholder={commentPlaceholder}
                                placeholderTextColor={colors.outline}
                                multiline
                                maxLength={500}
                                style={[
                                    styles.commentInput,
                                    { textAlign, writingDirection },
                                ]}
                                editable={!isSubmitting}
                                textAlignVertical="top"
                            />
                            <Text
                                style={[
                                    styles.commentCounter,
                                    { textAlign, writingDirection },
                                ]}
                            >
                                {comment.length}/500
                            </Text>
                        </View>

                        {!canSubmit && !isSubmitting && (foodRating === 0 || deliveryRating === 0) ? (
                            <Text
                                style={[
                                    styles.requiredHint,
                                    { textAlign, writingDirection },
                                ]}
                            >
                                {requiredHint}
                            </Text>
                        ) : null}

                        {inlineError ? (
                            <View
                                style={[
                                    styles.errorBox,
                                    { flexDirection: isRTL ? "row-reverse" : "row" },
                                ]}
                            >
                                <Ionicons
                                    name="alert-circle"
                                    size={16}
                                    color={colors.error}
                                />
                                <Text
                                    style={[
                                        styles.errorText,
                                        { textAlign, writingDirection },
                                    ]}
                                >
                                    {inlineError}
                                </Text>
                            </View>
                        ) : null}

                        <AnimatedPressable
                            onPress={handleSubmit}
                            disabled={!canSubmit}
                            haptic="impact"
                            scaleTo={0.97}
                            style={[
                                styles.submitBtn,
                                !canSubmit && styles.submitBtnDisabled,
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel={submitButtonLabel}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator
                                    size="small"
                                    color={colors.onPrimary}
                                />
                            ) : (
                                <Ionicons
                                    name="checkmark-circle"
                                    size={18}
                                    color={colors.onPrimary}
                                />
                            )}
                            <Text
                                style={[styles.submitText, { writingDirection }]}
                            >
                                {submitButtonLabel}
                            </Text>
                        </AnimatedPressable>
                    </Animated.View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.scrim,
    },
    keyboardWrap: {
        flex: 1,
        justifyContent: "flex-end",
    },
    sheet: {
        backgroundColor: colors.card,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 20,
        paddingTop: 10,
        gap: 16,
        ...shadows.card,
    },
    handle: {
        alignSelf: "center",
        width: 44,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.surfaceContainerHighest,
        marginBottom: 6,
    },
    headerRow: {
        alignItems: "center",
        gap: 12,
    },
    headerIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.faintPrimary,
        alignItems: "center",
        justifyContent: "center",
    },
    headerTextBlock: {
        flex: 1,
        minWidth: 0,
    },
    title: {
        fontFamily: typography.headline,
        color: colors.onSurface,
        fontSize: 18,
        lineHeight: 23,
    },
    subtitle: {
        marginTop: 2,
        fontFamily: typography.bodyMedium,
        color: colors.outline,
        fontSize: 12,
        lineHeight: 16,
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.surface,
        alignItems: "center",
        justifyContent: "center",
    },
    section: {
        gap: 10,
    },
    sectionLabel: {
        fontFamily: typography.headlineSemi,
        color: colors.onSurface,
        fontSize: 14,
        lineHeight: 18,
    },
    starsCenter: {
        alignItems: "center",
    },
    commentInput: {
        minHeight: 90,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: radii.lg,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.surfaceContainer,
        fontFamily: typography.body,
        color: colors.onSurface,
        fontSize: 14,
        lineHeight: 20,
    },
    commentCounter: {
        fontFamily: typography.bodyMedium,
        color: colors.outline,
        fontSize: 11,
        lineHeight: 14,
    },
    requiredHint: {
        fontFamily: typography.bodyMedium,
        color: colors.outline,
        fontSize: 12,
        lineHeight: 16,
    },
    errorBox: {
        alignItems: "center",
        gap: 8,
        padding: 10,
        borderRadius: radii.md,
        backgroundColor: "#FCE2DD",
    },
    errorText: {
        flex: 1,
        fontFamily: typography.bodyMedium,
        color: colors.error,
        fontSize: 12,
        lineHeight: 16,
    },
    submitBtn: {
        minHeight: 54,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingHorizontal: 22,
        borderRadius: radii.pill,
        backgroundColor: colors.primary,
        ...shadows.primary,
    },
    submitBtnDisabled: {
        opacity: 0.5,
    },
    submitText: {
        fontFamily: typography.headlineSemi,
        color: colors.onPrimary,
        fontSize: 15,
        lineHeight: 19,
    },
});

export default memo(RatingBottomSheet);
