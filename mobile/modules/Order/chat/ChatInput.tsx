import React, { memo, useCallback, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AnimatedPressable from "@/components/ui/AnimatedPressable";
import { colors, shadows, typography } from "@/components/ui/theme";
import { useLanguageStore } from "@/store/useLanguageStore";

interface Props {
    placeholder: string;
    sendLabel: string;
    onSend: (content: string) => void;
    onTyping?: () => void;
    onStoppedTyping?: () => void;
    disabled?: boolean;
    isSending?: boolean;
    maxLength?: number;
}

function ChatInput({
    placeholder,
    sendLabel,
    onSend,
    onTyping,
    onStoppedTyping,
    disabled,
    isSending,
    maxLength = 2000,
}: Props) {
    const isRTL = useLanguageStore((s) => s.isRTL);
    const textAlign = isRTL ? "right" : "left";
    const writingDirection = isRTL ? "rtl" : "ltr";

    const [value, setValue] = useState("");
    const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleChange = useCallback(
        (text: string) => {
            setValue(text);
            if (text.length === 0) {
                if (stopTimer.current) clearTimeout(stopTimer.current);
                onStoppedTyping?.();
                return;
            }
            onTyping?.();
            if (stopTimer.current) clearTimeout(stopTimer.current);
            stopTimer.current = setTimeout(() => {
                onStoppedTyping?.();
            }, 2_500);
        },
        [onTyping, onStoppedTyping],
    );

    const handleSubmit = useCallback(() => {
        const trimmed = value.trim();
        if (!trimmed || disabled) return;
        if (stopTimer.current) clearTimeout(stopTimer.current);
        onStoppedTyping?.();
        setValue("");
        onSend(trimmed);
    }, [value, disabled, onSend, onStoppedTyping]);

    const canSend = value.trim().length > 0 && !disabled;

    return (
        <View
            style={[
                styles.bar,
                { flexDirection: isRTL ? "row-reverse" : "row" },
            ]}
        >
            <View style={styles.inputWrap}>
                <TextInput
                    value={value}
                    onChangeText={handleChange}
                    placeholder={placeholder}
                    placeholderTextColor={colors.outline}
                    multiline
                    maxLength={maxLength}
                    editable={!disabled}
                    onSubmitEditing={handleSubmit}
                    blurOnSubmit={false}
                    style={[styles.input, { textAlign, writingDirection }]}
                />
            </View>

            <AnimatedPressable
                onPress={handleSubmit}
                disabled={!canSend}
                scaleTo={0.92}
                haptic="impact"
                style={[
                    styles.sendBtn,
                    !canSend && styles.sendBtnDisabled,
                ]}
                accessibilityRole="button"
                accessibilityLabel={sendLabel}
            >
                {isSending ? (
                    <ActivityIndicator size="small" color={colors.onPrimary} />
                ) : (
                    <Ionicons
                        name={isRTL ? "arrow-back" : "arrow-forward"}
                        size={18}
                        color={colors.onPrimary}
                    />
                )}
            </AnimatedPressable>
        </View>
    );
}

const styles = StyleSheet.create({
    bar: {
        alignItems: "flex-end",
        gap: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        backgroundColor: colors.card,
        borderTopWidth: 1,
        borderTopColor: colors.surfaceContainer,
    },
    inputWrap: {
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: colors.surfaceContainer,
        paddingHorizontal: 14,
        paddingVertical: 8,
        minHeight: 44,
        maxHeight: 120,
    },
    input: {
        fontFamily: typography.body,
        color: colors.onSurface,
        fontSize: 15,
        lineHeight: 20,
        padding: 0,
    },
    sendBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.primary,
        alignItems: "center",
        justifyContent: "center",
        ...shadows.primary,
    },
    sendBtnDisabled: {
        opacity: 0.5,
    },
});

export default memo(ChatInput);
