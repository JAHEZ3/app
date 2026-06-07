import React, { memo } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radii, typography } from "@/components/ui/theme";
import { useLanguageStore } from "@/store/useLanguageStore";

interface Props {
    value: string;
    onChange: (text: string) => void;
    placeholder: string;
    maxLength?: number;
}

function CustomerNotesInput({ value, onChange, placeholder, maxLength = 250 }: Props) {
    const isRTL = useLanguageStore((s) => s.isRTL);
    const textAlign = isRTL ? "right" : "left";
    const writingDirection = isRTL ? "rtl" : "ltr";

    return (
        <View>
            <TextInput
                value={value}
                onChangeText={onChange}
                placeholder={placeholder}
                placeholderTextColor={colors.outline}
                multiline
                maxLength={maxLength}
                style={[styles.textarea, { textAlign, writingDirection }]}
                textAlignVertical="top"
            />
            <Text style={[styles.counter, { textAlign, writingDirection }]}>
                {value.length}/{maxLength}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    textarea: {
        minHeight: 92,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: radii.lg,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.surfaceContainer,
        fontFamily: typography.bodyMedium,
        color: colors.onSurface,
        fontSize: 14,
        lineHeight: 20,
    },
    counter: {
        marginTop: 6,
        fontFamily: typography.bodyMedium,
        color: colors.outline,
        fontSize: 11,
        lineHeight: 14,
    },
});

export default memo(CustomerNotesInput);
