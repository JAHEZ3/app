import React, { useCallback } from "react";
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import AnimatedPressable from "@/components/ui/AnimatedPressable";
import { colors, radii, shadows, typography } from "@/components/ui/theme";
import { useOrdersT } from "@/hooks/useAppTranslation";
import { useLanguageStore } from "@/store/useLanguageStore";
import { useRestaurantPaymentInfo } from "../hooks/usePaymentInfo";
import type { RestaurantPaymentAccount } from "../repository/OrderRepository";

interface Props {
    restaurantId: string;
}

const accountIcon = (
    account: RestaurantPaymentAccount,
): keyof typeof import("@expo/vector-icons").Ionicons.glyphMap =>
    account.type === "wallet" ? "phone-portrait-outline" : "card-outline";

function PaymentInfoCard({ restaurantId }: Props) {
    const { t } = useOrdersT();
    const isRTL = useLanguageStore((s) => s.isRTL);
    const writingDirection = isRTL ? "rtl" : "ltr";
    const textAlign = isRTL ? "right" : "left";

    const { data, isLoading } = useRestaurantPaymentInfo(restaurantId);

    const handleCopy = useCallback(
        async (value: string | undefined, label: string) => {
            if (!value) return;
            try {
                await Clipboard.setStringAsync(value);
                Alert.alert(
                    t("payment.info.copied", { defaultValue: "Copied" }),
                    `${label}: ${value}`,
                );
            } catch {
                /* ignore */
            }
        },
        [t],
    );

    if (isLoading) {
        return (
            <View style={[styles.card, styles.cardCenter]}>
                <ActivityIndicator color={colors.primary} />
            </View>
        );
    }

    if (!data || data.accounts.length === 0) {
        return (
            <View style={styles.card}>
                <View style={[styles.header, isRTL && styles.rowReverse]}>
                    <View style={styles.icon}>
                        <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
                    </View>
                    <Text style={[styles.title, { textAlign, writingDirection }]}>
                        {t("payment.info.contactTitle", {
                            defaultValue: "Contact the restaurant for payment details",
                        })}
                    </Text>
                </View>
                <Text style={[styles.subtitle, { textAlign, writingDirection }]}>
                    {t("payment.info.contactBody", {
                        defaultValue:
                            "Reach out via order chat to request the bank or wallet number, then upload the receipt below.",
                    })}
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.card}>
            <View style={[styles.header, isRTL && styles.rowReverse]}>
                <View style={styles.icon}>
                    <Ionicons name="wallet-outline" size={18} color={colors.primary} />
                </View>
                <View style={styles.headerText}>
                    <Text style={[styles.title, { textAlign, writingDirection }]}>
                        {t("payment.info.title", { defaultValue: "Transfer payment to" })}
                    </Text>
                    <Text style={[styles.subtitle, { textAlign, writingDirection }]}>
                        {t("payment.info.subtitle", {
                            defaultValue:
                                "Send the order total to one of the accounts below, then upload the receipt.",
                        })}
                    </Text>
                </View>
            </View>

            {data.instructions ? (
                <View style={styles.instructionsPill}>
                    <Text
                        style={[styles.instructionsText, { textAlign, writingDirection }]}
                    >
                        {data.instructions}
                    </Text>
                </View>
            ) : null}

            <View style={styles.accountsList}>
                {data.accounts.map((acc, idx) => (
                    <View
                        key={`${acc.type}-${idx}`}
                        style={[
                            styles.accountRow,
                            idx > 0 && styles.accountRowDivider,
                        ]}
                    >
                        <View style={[styles.accountHeader, isRTL && styles.rowReverse]}>
                            <Ionicons
                                name={accountIcon(acc)}
                                size={16}
                                color={colors.primary}
                            />
                            <Text
                                style={[styles.accountLabel, { textAlign, writingDirection }]}
                            >
                                {acc.label ??
                                    acc.bankName ??
                                    acc.walletName ??
                                    (acc.type === "wallet"
                                        ? t("payment.info.wallet", { defaultValue: "Wallet" })
                                        : t("payment.info.bank", { defaultValue: "Bank account" }))}
                            </Text>
                        </View>

                        {acc.accountName ? (
                            <Field
                                label={t("payment.info.accountName", {
                                    defaultValue: "Account name",
                                })}
                                value={acc.accountName}
                                isRTL={isRTL}
                                onCopy={() =>
                                    handleCopy(
                                        acc.accountName,
                                        t("payment.info.accountName", {
                                            defaultValue: "Account name",
                                        }),
                                    )
                                }
                            />
                        ) : null}

                        {acc.accountNumber ? (
                            <Field
                                label={t("payment.info.accountNumber", {
                                    defaultValue: "Account number",
                                })}
                                value={acc.accountNumber}
                                monospace
                                isRTL={isRTL}
                                onCopy={() =>
                                    handleCopy(
                                        acc.accountNumber,
                                        t("payment.info.accountNumber", {
                                            defaultValue: "Account number",
                                        }),
                                    )
                                }
                            />
                        ) : null}

                        {acc.iban ? (
                            <Field
                                label={t("payment.info.iban", { defaultValue: "IBAN" })}
                                value={acc.iban}
                                monospace
                                isRTL={isRTL}
                                onCopy={() =>
                                    handleCopy(
                                        acc.iban,
                                        t("payment.info.iban", { defaultValue: "IBAN" }),
                                    )
                                }
                            />
                        ) : null}

                        {acc.walletNumber ? (
                            <Field
                                label={t("payment.info.walletNumber", {
                                    defaultValue: "Wallet number",
                                })}
                                value={acc.walletNumber}
                                monospace
                                isRTL={isRTL}
                                onCopy={() =>
                                    handleCopy(
                                        acc.walletNumber,
                                        t("payment.info.walletNumber", {
                                            defaultValue: "Wallet number",
                                        }),
                                    )
                                }
                            />
                        ) : null}

                        {acc.walletPhone ? (
                            <Field
                                label={t("payment.info.walletPhone", {
                                    defaultValue: "Wallet phone",
                                })}
                                value={acc.walletPhone}
                                monospace
                                isRTL={isRTL}
                                onCopy={() =>
                                    handleCopy(
                                        acc.walletPhone,
                                        t("payment.info.walletPhone", {
                                            defaultValue: "Wallet phone",
                                        }),
                                    )
                                }
                            />
                        ) : null}

                        {acc.bankPhone ? (
                            <Field
                                label={t("payment.info.bankPhone", {
                                    defaultValue: "Bank phone",
                                })}
                                value={acc.bankPhone}
                                monospace
                                isRTL={isRTL}
                                onCopy={() =>
                                    handleCopy(
                                        acc.bankPhone,
                                        t("payment.info.bankPhone", {
                                            defaultValue: "Bank phone",
                                        }),
                                    )
                                }
                            />
                        ) : null}

                        {acc.notes ? (
                            <Text
                                style={[
                                    styles.accountNotes,
                                    { textAlign, writingDirection },
                                ]}
                            >
                                {acc.notes}
                            </Text>
                        ) : null}
                    </View>
                ))}
            </View>
        </View>
    );
}

function Field({
    label,
    value,
    onCopy,
    monospace,
    isRTL,
}: {
    label: string;
    value: string;
    onCopy: () => void;
    monospace?: boolean;
    isRTL: boolean;
}) {
    const writingDirection = isRTL ? "rtl" : "ltr";
    const textAlign = isRTL ? "right" : "left";
    return (
        <View style={[styles.field, isRTL && styles.rowReverse]}>
            <View style={styles.fieldText}>
                <Text style={[styles.fieldLabel, { textAlign, writingDirection }]}>
                    {label}
                </Text>
                <Text
                    style={[
                        styles.fieldValue,
                        monospace && styles.fieldValueMono,
                        { textAlign, writingDirection },
                    ]}
                    selectable
                >
                    {value}
                </Text>
            </View>
            <AnimatedPressable
                onPress={onCopy}
                haptic="selection"
                scaleTo={0.92}
                style={styles.copyBtn}
                accessibilityRole="button"
                accessibilityLabel="Copy"
            >
                <Ionicons name="copy-outline" size={16} color={colors.primary} />
            </AnimatedPressable>
        </View>
    );
}

const styles = StyleSheet.create({
    rowReverse: { flexDirection: "row-reverse" },
    card: {
        padding: 16,
        borderRadius: radii.xl,
        backgroundColor: colors.card,
        gap: 12,
        ...shadows.soft,
    },
    cardCenter: {
        alignItems: "center",
        justifyContent: "center",
        minHeight: 80,
    },
    header: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
    },
    icon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.faintPrimary,
        alignItems: "center",
        justifyContent: "center",
    },
    headerText: {
        flex: 1,
        gap: 2,
    },
    title: {
        fontFamily: typography.headlineSemi,
        color: colors.onSurface,
        fontSize: 15,
        lineHeight: 19,
    },
    subtitle: {
        fontFamily: typography.bodyMedium,
        color: colors.outline,
        fontSize: 12,
        lineHeight: 16,
    },
    instructionsPill: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: radii.lg,
        backgroundColor: "#FFF7DC",
    },
    instructionsText: {
        fontFamily: typography.bodyMedium,
        color: "#A66A00",
        fontSize: 12,
        lineHeight: 16,
    },
    accountsList: {
        gap: 10,
    },
    accountRow: {
        gap: 8,
    },
    accountRowDivider: {
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.surfaceContainer,
    },
    accountHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    accountLabel: {
        fontFamily: typography.headlineSemi,
        color: colors.onSurface,
        fontSize: 13,
        lineHeight: 17,
        flex: 1,
    },
    field: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    fieldText: {
        flex: 1,
        gap: 2,
    },
    fieldLabel: {
        fontFamily: typography.body,
        color: colors.outline,
        fontSize: 11,
        lineHeight: 14,
    },
    fieldValue: {
        fontFamily: typography.bodyBold,
        color: colors.onSurface,
        fontSize: 14,
        lineHeight: 18,
    },
    fieldValueMono: {
        letterSpacing: 0.5,
    },
    accountNotes: {
        fontFamily: typography.bodyMedium,
        color: colors.outline,
        fontSize: 12,
        lineHeight: 16,
    },
    copyBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.faintPrimary,
        alignItems: "center",
        justifyContent: "center",
    },
});

export default PaymentInfoCard;
