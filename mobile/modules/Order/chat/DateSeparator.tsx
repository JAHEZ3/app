import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, radii, typography } from "@/components/ui/theme";

interface Props {
    label: string;
}

function DateSeparator({ label }: Props) {
    return (
        <View style={styles.wrap}>
            <View style={styles.pill}>
                <Text style={styles.text}>{label}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        alignItems: "center",
        marginVertical: 10,
    },
    pill: {
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: radii.pill,
        backgroundColor: colors.surfaceContainer,
    },
    text: {
        fontFamily: typography.bodyBold,
        color: colors.outline,
        fontSize: 11,
        lineHeight: 14,
    },
});

export default memo(DateSeparator);
