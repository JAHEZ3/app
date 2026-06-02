import React from "react";
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AnimatedPressable from "@/components/ui/AnimatedPressable";
import { colors, radii, shadows, typography } from "@/components/ui/theme";
import { useCheckoutT } from "@/hooks/useAppTranslation";
import { useLanguageStore } from "@/store/useLanguageStore";
import { useAddresses } from "@/modules/Customer/hooks/useAddresses";
import type { CustomerAddress } from "@/modules/Customer/types";

interface Props {
    visible: boolean;
    onClose: () => void;
    onSelect: (address: CustomerAddress) => void;
}

function SavedAddressesSheet({ visible, onClose, onSelect }: Props) {
    const { t } = useCheckoutT();
    const isRTL = useLanguageStore((s) => s.isRTL);
    const writingDirection = isRTL ? "rtl" : "ltr";
    const textAlign = isRTL ? "right" : "left";

    const { data, isLoading, isError, refetch } = useAddresses(visible);

    const renderItem = ({ item }: { item: CustomerAddress }) => {
        const fullLine = [item.street, item.city].filter(Boolean).join(", ");
        return (
            <AnimatedPressable
                onPress={() => {
                    onSelect(item);
                    onClose();
                }}
                haptic="impact"
                scaleTo={0.98}
                style={[styles.row, isRTL && styles.rowReverse]}
                accessibilityRole="button"
            >
                <View style={styles.rowIcon}>
                    <Ionicons name="location" size={18} color={colors.primary} />
                </View>
                <View style={styles.rowText}>
                    {item.label ? (
                        <Text
                            style={[styles.rowLabel, { textAlign, writingDirection }]}
                            numberOfLines={1}
                        >
                            {item.label}
                        </Text>
                    ) : null}
                    {fullLine ? (
                        <Text
                            style={[styles.rowAddress, { textAlign, writingDirection }]}
                            numberOfLines={2}
                        >
                            {fullLine}
                        </Text>
                    ) : null}
                </View>
                <Ionicons
                    name={isRTL ? "chevron-back" : "chevron-forward"}
                    size={18}
                    color={colors.outline}
                />
            </AnimatedPressable>
        );
    };

    let body: React.ReactNode;
    if (isLoading) {
        body = (
            <View style={styles.center}>
                <ActivityIndicator color={colors.primary} />
            </View>
        );
    } else if (isError) {
        body = (
            <View style={styles.center}>
                <Text style={[styles.muted, { writingDirection }]}>
                    {t("address.saved.error", { defaultValue: "Could not load addresses." })}
                </Text>
                <AnimatedPressable
                    onPress={() => refetch()}
                    haptic="impact"
                    scaleTo={0.96}
                    style={styles.retryBtn}
                    accessibilityRole="button"
                >
                    <Text style={[styles.retryBtnText, { writingDirection }]}>
                        {t("error.action", { defaultValue: "Retry" })}
                    </Text>
                </AnimatedPressable>
            </View>
        );
    } else if (!data || data.length === 0) {
        body = (
            <View style={styles.center}>
                <View style={styles.emptyIcon}>
                    <Ionicons name="location-outline" size={26} color={colors.primary} />
                </View>
                <Text style={[styles.emptyTitle, { writingDirection }]}>
                    {t("address.saved.emptyTitle", { defaultValue: "No saved addresses" })}
                </Text>
                <Text style={[styles.emptyBody, { writingDirection }]}>
                    {t("address.saved.emptyBody", {
                        defaultValue:
                            "Use the form below to enter an address, then save it from your profile.",
                    })}
                </Text>
            </View>
        );
    } else {
        body = (
            <FlatList
                data={data}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
        );
    }

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
                    <View style={[styles.header, isRTL && styles.rowReverse]}>
                        <Text style={[styles.title, { writingDirection }]}>
                            {t("address.saved.title", { defaultValue: "Saved addresses" })}
                        </Text>
                        <AnimatedPressable
                            onPress={onClose}
                            scaleTo={0.92}
                            haptic="selection"
                            style={styles.closeBtn}
                            accessibilityRole="button"
                            accessibilityLabel={t("error.back", { defaultValue: "Close" })}
                        >
                            <Ionicons name="close" size={20} color={colors.onSurface} />
                        </AnimatedPressable>
                    </View>
                    <View style={styles.body}>{body}</View>
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
        paddingHorizontal: 18,
        paddingTop: 10,
        paddingBottom: 22,
        maxHeight: "75%",
        ...shadows.card,
    },
    handle: {
        alignSelf: "center",
        width: 42,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.surfaceContainerHighest,
        marginBottom: 8,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.surfaceContainer,
    },
    title: {
        fontFamily: typography.headline,
        color: colors.onSurface,
        fontSize: 17,
        lineHeight: 22,
    },
    closeBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: colors.surfaceContainer,
        alignItems: "center",
        justifyContent: "center",
    },
    body: {
        marginTop: 8,
        minHeight: 160,
    },
    listContent: {
        paddingVertical: 6,
    },
    separator: {
        height: 1,
        backgroundColor: colors.surfaceContainer,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 4,
    },
    rowIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.faintPrimary,
        alignItems: "center",
        justifyContent: "center",
    },
    rowText: {
        flex: 1,
        gap: 2,
    },
    rowLabel: {
        fontFamily: typography.headlineSemi,
        color: colors.onSurface,
        fontSize: 14,
        lineHeight: 18,
    },
    rowAddress: {
        fontFamily: typography.bodyMedium,
        color: colors.outline,
        fontSize: 12,
        lineHeight: 16,
    },
    center: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
        paddingVertical: 32,
        gap: 10,
    },
    muted: {
        fontFamily: typography.bodyMedium,
        color: colors.outline,
        fontSize: 13,
        lineHeight: 17,
        textAlign: "center",
    },
    retryBtn: {
        marginTop: 8,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: radii.pill,
        backgroundColor: colors.primary,
    },
    retryBtnText: {
        fontFamily: typography.bodyBold,
        color: colors.onPrimary,
        fontSize: 13,
    },
    emptyIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.faintPrimary,
        alignItems: "center",
        justifyContent: "center",
    },
    emptyTitle: {
        fontFamily: typography.headline,
        color: colors.onSurface,
        fontSize: 16,
        lineHeight: 21,
        textAlign: "center",
    },
    emptyBody: {
        fontFamily: typography.bodyMedium,
        color: colors.outline,
        fontSize: 12,
        lineHeight: 17,
        textAlign: "center",
    },
});

export default SavedAddressesSheet;
