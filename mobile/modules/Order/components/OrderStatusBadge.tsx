import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useOrdersT } from "@/hooks/useAppTranslation";
import { colors, radii, typography } from "@/components/ui/theme";
import type { OrderStatus } from "../types";

interface OrderStatusBadgeProps {
  status: OrderStatus | string;
}

const STATUS_THEME: Record<string, { bg: string; fg: string; key: string }> = {
  PENDING: { bg: "#FFF4E0", fg: "#A66A00", key: "pending" },
  CONFIRMED: { bg: "#E0F2FE", fg: "#0369A1", key: "confirmed" },
  PREPARING: { bg: "#FFE6D5", fg: "#B23A00", key: "preparing" },
  READY_FOR_PICKUP: { bg: "#FFE9D8", fg: "#B23A00", key: "readyForPickup" },
  OUT_FOR_DELIVERY: { bg: "#E5E0FF", fg: "#3F2BB1", key: "outForDelivery" },
  DELIVERED: { bg: "#D9F5E2", fg: "#0F7A36", key: "delivered" },
  CANCELLED: { bg: "#FCE2DD", fg: colors.error, key: "cancelled" },
};

const FALLBACK = {
  bg: colors.surfaceContainer,
  fg: colors.outline,
  key: "pending",
};

const OrderStatusBadge = ({ status }: OrderStatusBadgeProps) => {
  const { t } = useOrdersT();
  const theme = STATUS_THEME[status as string] ?? FALLBACK;
  const label = t(`status.${theme.key}`, { defaultValue: status });

  return (
    <View style={[styles.badge, { backgroundColor: theme.bg }]}>
      <View style={[styles.dot, { backgroundColor: theme.fg }]} />
      <Text style={[styles.text, { color: theme.fg }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    alignSelf: "flex-start",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontFamily: typography.bodyBold,
    fontSize: 11,
    lineHeight: 14,
  },
});

export default OrderStatusBadge;
