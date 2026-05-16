import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, typography } from "@/components/ui/theme";
import { useCartT } from "@/hooks/useAppTranslation";
import { useLanguageStore } from "@/store/useLanguageStore";
import type { OrderItem } from "../types";

interface OrderItemRowProps {
  item: OrderItem;
}

const formatPrice = (value: number, currency: string) =>
  `${value.toFixed(value % 1 === 0 ? 0 : 2)} ${currency}`;

const OrderItemRow = ({ item }: OrderItemRowProps) => {
  const { t } = useCartT();
  const isRTL = useLanguageStore((state) => state.isRTL);
  const writingDirection = isRTL ? "rtl" : "ltr";
  const textAlign = isRTL ? "right" : "left";
  const currency = t("price.currency");
  const optionsText = item.options?.map((o) => o.optionName).join(" · ");

  return (
    <View style={[styles.row, isRTL && styles.rowReverse]}>
      <View style={styles.imageWrap}>
        {item.mealImage ? (
          <Image
            source={{ uri: item.mealImage }}
            style={styles.image}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <Ionicons name="fast-food-outline" size={22} color={colors.primary} />
        )}
        <View style={styles.qtyBadge}>
          <Text style={styles.qtyBadgeText}>×{item.quantity}</Text>
        </View>
      </View>

      <View style={styles.body}>
        <Text
          style={[styles.name, { textAlign, writingDirection }]}
          numberOfLines={2}
        >
          {item.mealName}
        </Text>
        {optionsText ? (
          <Text
            style={[styles.options, { textAlign, writingDirection }]}
            numberOfLines={2}
          >
            {optionsText}
          </Text>
        ) : null}
        {item.specialInstructions ? (
          <Text
            style={[styles.note, { textAlign, writingDirection }]}
            numberOfLines={2}
          >
            {item.specialInstructions}
          </Text>
        ) : null}
        <Text style={[styles.unit, { textAlign, writingDirection }]}>
          {formatPrice(item.unitPrice, currency)} · {t("items.each")}
        </Text>
      </View>

      <Text style={[styles.total, { writingDirection }]}>
        {formatPrice(item.totalPrice, currency)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
  imageWrap: {
    width: 56,
    height: 56,
    borderRadius: radii.md,
    backgroundColor: colors.faintPrimary,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  qtyBadge: {
    position: "absolute",
    bottom: -6,
    right: -6,
    minWidth: 24,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyBadgeText: {
    fontFamily: typography.bodyBold,
    color: colors.onPrimary,
    fontSize: 11,
    lineHeight: 13,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  name: {
    fontFamily: typography.headlineSemi,
    color: colors.onSurface,
    fontSize: 14,
    lineHeight: 18,
  },
  options: {
    fontFamily: typography.body,
    color: colors.outline,
    fontSize: 12,
    lineHeight: 16,
  },
  note: {
    fontFamily: typography.bodyMedium,
    color: colors.outline,
    fontSize: 12,
    lineHeight: 16,
    fontStyle: "italic",
  },
  unit: {
    marginTop: 2,
    fontFamily: typography.bodyMedium,
    color: colors.outline,
    fontSize: 11,
    lineHeight: 14,
  },
  total: {
    fontFamily: typography.headlineSemi,
    color: colors.primary,
    fontSize: 14,
    lineHeight: 18,
    marginTop: 2,
  },
});

export default OrderItemRow;
