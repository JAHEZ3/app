import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AnimatedPressable from "@/components/ui/AnimatedPressable";
import { colors, radii, typography } from "@/components/ui/theme";
import { useCheckoutT } from "@/hooks/useAppTranslation";
import { useLanguageStore } from "@/store/useLanguageStore";
import { useCurrentLocation, type ResolvedLocation } from "../hooks/useCurrentLocation";
import SavedAddressesSheet from "./SavedAddressesSheet";
import type { CustomerAddress } from "@/modules/Customer/types";

interface Props {
    onLocationResolved: (loc: ResolvedLocation) => void;
    onSavedSelected: (address: CustomerAddress) => void;
    onMapPick?: () => void;
}

function AddressActionsRow({ onLocationResolved, onSavedSelected, onMapPick }: Props) {
    const { t } = useCheckoutT();
    const isRTL = useLanguageStore((s) => s.isRTL);
    const writingDirection = isRTL ? "rtl" : "ltr";

    const [savedOpen, setSavedOpen] = useState(false);
    const { fetch, loading } = useCurrentLocation();

    const handleGPS = useCallback(async () => {
        const resolved = await fetch();
        if (!resolved) {
            Alert.alert(
                t("address.gps.errorTitle", { defaultValue: "Could not get location" }),
                t("address.gps.errorBody", {
                    defaultValue: "Make sure location services are on and try again.",
                }),
            );
            return;
        }
        onLocationResolved(resolved);
    }, [fetch, onLocationResolved, t]);

    return (
        <>
            <View style={[styles.row, isRTL && styles.rowReverse]}>
                <Chip
                    icon={loading ? undefined : "navigate"}
                    label={t("address.gps.cta", { defaultValue: "Use current location" })}
                    onPress={handleGPS}
                    loading={loading}
                    writingDirection={writingDirection}
                />
                <Chip
                    icon="bookmark-outline"
                    label={t("address.saved.cta", { defaultValue: "Saved" })}
                    onPress={() => setSavedOpen(true)}
                    writingDirection={writingDirection}
                />
                {onMapPick ? (
                    <Chip
                        icon="map"
                        label={t("address.map.cta", { defaultValue: "Map" })}
                        onPress={onMapPick}
                        writingDirection={writingDirection}
                    />
                ) : null}
            </View>

            <SavedAddressesSheet
                visible={savedOpen}
                onClose={() => setSavedOpen(false)}
                onSelect={onSavedSelected}
            />
        </>
    );
}

function Chip({
    icon,
    label,
    onPress,
    loading,
    writingDirection,
}: {
    icon?: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress: () => void;
    loading?: boolean;
    writingDirection: "ltr" | "rtl";
}) {
    return (
        <AnimatedPressable
            onPress={onPress}
            disabled={loading}
            haptic="selection"
            scaleTo={0.95}
            style={styles.chip}
            accessibilityRole="button"
        >
            {loading ? (
                <ActivityIndicator size="small" color={colors.primary} />
            ) : icon ? (
                <Ionicons name={icon} size={14} color={colors.primary} />
            ) : null}
            <Text style={[styles.chipLabel, { writingDirection }]}>{label}</Text>
        </AnimatedPressable>
    );
}

const styles = StyleSheet.create({
    rowReverse: { flexDirection: "row-reverse" },
    row: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 8,
    },
    chip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: radii.pill,
        backgroundColor: colors.faintPrimary,
    },
    chipLabel: {
        fontFamily: typography.bodyBold,
        color: colors.primary,
        fontSize: 12,
        lineHeight: 16,
    },
});

export default AddressActionsRow;
