import React, { memo, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AnimatedPressable from "@/components/ui/AnimatedPressable";
import { colors, radii, shadows, typography } from "@/components/ui/theme";
import { useCartT, useOrdersT } from "@/hooks/useAppTranslation";
import { useLanguageStore } from "@/store/useLanguageStore";
import OrderStatusBadge from "./OrderStatusBadge";
import type { OrderListItem } from "../types";

interface OrderCardProps {
  order: OrderListItem;
  onPress: (order: OrderListItem) => void;
}

const formatPrice = (value: number, currency: string) =>
  `${value.toFixed(value % 1 === 0 ? 0 : 2)} ${currency}`;

const formatDate = (iso: string, locale: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  try {
    return date.toLocaleString(locale, {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return date.toLocaleString();
  }
};

function OrderCard({ order, onPress }: OrderCardProps) {
  const { t } = useOrdersT();
  const { t: tCart } = useCartT();
  const isRTL = useLanguageStore((state) => state.isRTL);
  const language = useLanguageStore((state) => state.language);
  const writingDirection = isRTL ? "rtl" : "ltr";
  const textAlign = isRTL ? "right" : "left";
  const currency = tCart("price.currency");

  const formattedDate = useMemo(
    () => formatDate(order.createdAt, language === "ar" ? "ar" : "en-GB"),
    [order.createdAt, language],
  );

  const itemsLabel =
    typeof order.itemCount === "number"
      ? tCart("items.count", { count: order.itemCount })
      : null;

  return (
    <AnimatedPressable
      onPress={() => onPress(order)}
      haptic="impact"
      scaleTo={0.98}
      style={styles.card}
      accessibilityRole="button"
    >
      <View style={[styles.topRow, isRTL && styles.rowReverse]}>
        <View style={styles.iconWrap}>
          <Ionicons name="receipt-outline" size={20} color={colors.primary} />
        </View>
        <View style={styles.titleBlock}>
          <Text
            style={[styles.restaurant, { textAlign, writingDirection }]}
            numberOfLines={1}
          >
            {order.restaurantName ?? t("details.title")}
          </Text>
          <Text style={[styles.orderId, { textAlign, writingDirection }]} numberOfLines={1}>
            #{order.orderId}
          </Text>
        </View>
        <Ionicons
          name={isRTL ? "chevron-back" : "chevron-forward"}
          size={18}
          color={colors.outline}
        />
      </View>

      <View style={[styles.metaRow, isRTL && styles.rowReverse]}>
        <OrderStatusBadge status={order.status} />
        <Text style={[styles.metaText, { textAlign, writingDirection }]} numberOfLines={1}>
          {formattedDate}
        </Text>
      </View>

      <View style={styles.divider} />

      <View style={[styles.bottomRow, isRTL && styles.rowReverse]}>
        <Text style={[styles.totalLabel, { textAlign, writingDirection }]}>
          {t("details.total")}
          {itemsLabel ? ` · ${itemsLabel}` : ""}
        </Text>
        <Text style={[styles.totalValue, { textAlign, writingDirection }]}>
          {formatPrice(order.total ?? 0, currency)}
        </Text>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    padding: 16,
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    gap: 12,
    ...shadows.soft,
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.faintPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  restaurant: {
    fontFamily: typography.headlineSemi,
    color: colors.onSurface,
    fontSize: 15,
    lineHeight: 19,
  },
  orderId: {
    marginTop: 2,
    fontFamily: typography.body,
    color: colors.outline,
    fontSize: 12,
    lineHeight: 15,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  metaText: {
    fontFamily: typography.bodyMedium,
    color: colors.outline,
    fontSize: 12,
    lineHeight: 15,
  },
  divider: {
    height: 1,
    backgroundColor: colors.surfaceContainer,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  totalLabel: {
    fontFamily: typography.bodyMedium,
    color: colors.outline,
    fontSize: 12,
    lineHeight: 16,
  },
  totalValue: {
    fontFamily: typography.headlineSemi,
    color: colors.primary,
    fontSize: 16,
    lineHeight: 20,
  },
});

export default memo(OrderCard);
