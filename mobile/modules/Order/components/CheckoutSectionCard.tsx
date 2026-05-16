import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, shadows, typography } from "@/components/ui/theme";
import { useLanguageStore } from "@/store/useLanguageStore";

interface Props {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    trailing?: React.ReactNode;
}

function CheckoutSectionCard({ icon, title, subtitle, children, trailing }: Props) {
    const isRTL = useLanguageStore((s) => s.isRTL);
    const textAlign = isRTL ? "right" : "left";
    const writingDirection = isRTL ? "rtl" : "ltr";

    return (
        <View style={styles.card}>
            <View style={[styles.header, isRTL && styles.rowReverse]}>
                <View style={styles.iconWrap}>
                    <Ionicons name={icon} size={18} color={colors.primary} />
                </View>
                <View style={styles.titleBlock}>
                    <Text style={[styles.title, { textAlign, writingDirection }]}>
                        {title}
                    </Text>
                    {subtitle ? (
                        <Text
                            style={[styles.subtitle, { textAlign, writingDirection }]}
                            numberOfLines={2}
                        >
                            {subtitle}
                        </Text>
                    ) : null}
                </View>
                {trailing ?? null}
            </View>
            <View style={styles.body}>{children}</View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.card,
        borderRadius: radii.xl,
        paddingHorizontal: 16,
        paddingVertical: 16,
        ...shadows.soft,
    },
    rowReverse: {
        flexDirection: "row-reverse",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    iconWrap: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: colors.faintPrimary,
        alignItems: "center",
        justifyContent: "center",
    },
    titleBlock: {
        flex: 1,
        minWidth: 0,
    },
    title: {
        fontFamily: typography.headlineSemi,
        color: colors.onSurface,
        fontSize: 15,
        lineHeight: 19,
    },
    subtitle: {
        marginTop: 2,
        fontFamily: typography.bodyMedium,
        color: colors.outline,
        fontSize: 12,
        lineHeight: 16,
    },
    body: {
        marginTop: 14,
    },
});

export default memo(CheckoutSectionCard);
