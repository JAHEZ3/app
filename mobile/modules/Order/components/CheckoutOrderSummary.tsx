import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, radii, typography } from "@/components/ui/theme";
import { useLanguageStore } from "@/store/useLanguageStore";

const formatPrice = (value: number, currency: string) =>
    `${value.toFixed(value % 1 === 0 ? 0 : 2)} ${currency}`;

interface Props {
    subtotal: number;
    deliveryFee: number;
    discount?: number;
    total: number;
    currency: string;
    labels: {
        subtotal: string;
        deliveryFee: string;
        discount: string;
        total: string;
    };
}

function CheckoutOrderSummary({
    subtotal,
    deliveryFee,
    discount = 0,
    total,
    currency,
    labels,
}: Props) {
    const isRTL = useLanguageStore((s) => s.isRTL);
    const textAlign = isRTL ? "right" : "left";
    const writingDirection = isRTL ? "rtl" : "ltr";

    return (
        <View>
            <View style={styles.rows}>
                <Row
                    label={labels.subtotal}
                    value={formatPrice(subtotal, currency)}
                    isRTL={isRTL}
                    textAlign={textAlign}
                    writingDirection={writingDirection}
                />
                <Row
                    label={labels.deliveryFee}
                    value={formatPrice(deliveryFee, currency)}
                    isRTL={isRTL}
                    textAlign={textAlign}
                    writingDirection={writingDirection}
                />
                {discount > 0 ? (
                    <Row
                        label={labels.discount}
                        value={`- ${formatPrice(discount, currency)}`}
                        isRTL={isRTL}
                        textAlign={textAlign}
                        writingDirection={writingDirection}
                        accent
                    />
                ) : null}
            </View>

            <View style={styles.divider} />

            <View style={[styles.totalRow, isRTL && styles.rowReverse]}>
                <Text style={[styles.totalLabel, { textAlign, writingDirection }]}>
                    {labels.total}
                </Text>
                <Text style={[styles.totalValue, { textAlign, writingDirection }]}>
                    {formatPrice(total, currency)}
                </Text>
            </View>
        </View>
    );
}

function Row({
    label,
    value,
    isRTL,
    textAlign,
    writingDirection,
    accent = false,
}: {
    label: string;
    value: string;
    isRTL: boolean;
    textAlign: "left" | "right";
    writingDirection: "ltr" | "rtl";
    accent?: boolean;
}) {
    return (
        <View style={[styles.row, isRTL && styles.rowReverse]}>
            <Text style={[styles.label, { textAlign, writingDirection }]}>{label}</Text>
            <Text
                style={[
                    styles.value,
                    accent && styles.valueAccent,
                    { textAlign, writingDirection },
                ]}
            >
                {value}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    rowReverse: {
        flexDirection: "row-reverse",
    },
    rows: {
        gap: 9,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
    },
    label: {
        fontFamily: typography.bodyMedium,
        color: colors.outline,
        fontSize: 13,
        lineHeight: 18,
    },
    value: {
        fontFamily: typography.bodyBold,
        color: colors.onSurface,
        fontSize: 13,
        lineHeight: 18,
    },
    valueAccent: {
        color: colors.primary,
    },
    divider: {
        height: 1,
        marginTop: 14,
        marginBottom: 12,
        backgroundColor: colors.surfaceContainer,
        borderRadius: radii.sm,
    },
    totalRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
    },
    totalLabel: {
        fontFamily: typography.headlineSemi,
        color: colors.onSurface,
        fontSize: 16,
        lineHeight: 21,
    },
    totalValue: {
        fontFamily: typography.headline,
        color: colors.primary,
        fontSize: 22,
        lineHeight: 28,
    },
});

export default memo(CheckoutOrderSummary);
