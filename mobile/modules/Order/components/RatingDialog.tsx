import React, { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AnimatedPressable from "@/components/ui/AnimatedPressable";
import { colors, radii, shadows, typography } from "@/components/ui/theme";
import { useOrdersT } from "@/hooks/useAppTranslation";
import { useLanguageStore } from "@/store/useLanguageStore";
import { getRateErrorMessage, useRateOrder } from "../hooks/useRateOrder";

interface Props {
    orderId: string;
    visible: boolean;
    onClose: () => void;
    onSubmitted?: () => void;
    initialRating?: number;
}

function RatingDialog({ orderId, visible, onClose, onSubmitted, initialRating }: Props) {
    const { t } = useOrdersT();
    const isRTL = useLanguageStore((s) => s.isRTL);
    const writingDirection = isRTL ? "rtl" : "ltr";
    const textAlign = isRTL ? "right" : "left";

    const [rating, setRating] = useState<number>(initialRating ?? 0);
    const [comment, setComment] = useState("");
    const rate = useRateOrder();

    const handleSubmit = useCallback(async () => {
        if (rating < 1 || rating > 5 || rate.isPending) return;
        try {
            await rate.mutateAsync({
                orderId,
                rating,
                comment: comment.trim() || undefined,
            });
            onSubmitted?.();
            onClose();
        } catch (err) {
            const msg =
                getRateErrorMessage(err) ??
                t("rate.errorBody", { defaultValue: "Please try again." });
            Alert.alert(
                t("rate.errorTitle", { defaultValue: "Could not submit rating" }),
                msg,
            );
        }
    }, [comment, onClose, onSubmitted, orderId, rate, rating, t]);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable style={styles.backdrop} onPress={onClose}>
                <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
                    <View style={styles.handle} />

                    <Text style={[styles.title, { writingDirection }]}>
                        {t("rate.title", { defaultValue: "How was your order?" })}
                    </Text>
                    <Text style={[styles.subtitle, { writingDirection }]}>
                        {t("rate.subtitle", {
                            defaultValue: "Your feedback helps the restaurant improve.",
                        })}
                    </Text>

                    <View style={[styles.starsRow, isRTL && styles.rowReverse]}>
                        {[1, 2, 3, 4, 5].map((n) => {
                            const active = n <= rating;
                            return (
                                <AnimatedPressable
                                    key={n}
                                    onPress={() => setRating(n)}
                                    haptic="selection"
                                    scaleTo={0.85}
                                    style={styles.starBtn}
                                    accessibilityRole="button"
                                    accessibilityLabel={t("rate.star", {
                                        defaultValue: "{{n}} star",
                                        n,
                                    })}
                                >
                                    <Ionicons
                                        name={active ? "star" : "star-outline"}
                                        size={38}
                                        color={active ? "#F5B400" : colors.outline}
                                    />
                                </AnimatedPressable>
                            );
                        })}
                    </View>

                    <TextInput
                        value={comment}
                        onChangeText={setComment}
                        placeholder={t("rate.commentPlaceholder", {
                            defaultValue: "Leave a comment (optional)",
                        })}
                        placeholderTextColor={colors.outline}
                        multiline
                        maxLength={500}
                        style={[styles.comment, { textAlign, writingDirection }]}
                    />

                    <View style={styles.actions}>
                        <AnimatedPressable
                            onPress={handleSubmit}
                            disabled={rating < 1 || rate.isPending}
                            scaleTo={0.97}
                            haptic="impact"
                            style={[
                                styles.submitBtn,
                                (rating < 1 || rate.isPending) && styles.submitBtnDisabled,
                            ]}
                            accessibilityRole="button"
                        >
                            {rate.isPending ? (
                                <ActivityIndicator color={colors.onPrimary} />
                            ) : (
                                <Text style={[styles.submitBtnText, { writingDirection }]}>
                                    {t("rate.submit", { defaultValue: "Submit rating" })}
                                </Text>
                            )}
                        </AnimatedPressable>
                        <AnimatedPressable
                            onPress={onClose}
                            scaleTo={0.97}
                            haptic="selection"
                            style={styles.cancelBtn}
                            accessibilityRole="button"
                        >
                            <Text style={[styles.cancelBtnText, { writingDirection }]}>
                                {t("rate.cancel", { defaultValue: "Maybe later" })}
                            </Text>
                        </AnimatedPressable>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "flex-end",
    },
    rowReverse: { flexDirection: "row-reverse" },
    sheet: {
        backgroundColor: colors.card,
        borderTopLeftRadius: radii.xl,
        borderTopRightRadius: radii.xl,
        paddingHorizontal: 22,
        paddingTop: 12,
        paddingBottom: 28,
        gap: 12,
        ...shadows.card,
    },
    handle: {
        alignSelf: "center",
        width: 42,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.surfaceContainerHighest,
        marginBottom: 6,
    },
    title: {
        fontFamily: typography.headline,
        color: colors.onSurface,
        fontSize: 20,
        lineHeight: 25,
        textAlign: "center",
    },
    subtitle: {
        fontFamily: typography.bodyMedium,
        color: colors.outline,
        fontSize: 13,
        lineHeight: 18,
        textAlign: "center",
    },
    starsRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        marginVertical: 8,
    },
    starBtn: {
        padding: 4,
    },
    comment: {
        minHeight: 90,
        maxHeight: 140,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: radii.lg,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.surfaceContainer,
        fontFamily: typography.bodyMedium,
        color: colors.onSurface,
        fontSize: 14,
        lineHeight: 19,
    },
    actions: {
        marginTop: 6,
        gap: 10,
    },
    submitBtn: {
        minHeight: 52,
        borderRadius: radii.pill,
        backgroundColor: colors.primary,
        alignItems: "center",
        justifyContent: "center",
        ...shadows.primary,
    },
    submitBtnDisabled: { opacity: 0.5 },
    submitBtnText: {
        fontFamily: typography.headlineSemi,
        color: colors.onPrimary,
        fontSize: 15,
        lineHeight: 19,
    },
    cancelBtn: {
        minHeight: 48,
        borderRadius: radii.pill,
        alignItems: "center",
        justifyContent: "center",
    },
    cancelBtnText: {
        fontFamily: typography.bodyBold,
        color: colors.outline,
        fontSize: 14,
        lineHeight: 18,
    },
});

export default RatingDialog;
