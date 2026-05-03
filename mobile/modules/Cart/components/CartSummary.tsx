import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeInUp,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import AnimatedPressable from "@/components/ui/AnimatedPressable";
import { colors, radii, shadows, typography } from "@/components/ui/theme";

const formatPrice = (value: number, currency: string) =>
  `${value.toFixed(value % 1 === 0 ? 0 : 2)} ${currency}`;

function AnimatedAmount({
  value,
  currency,
  style,
}: {
  value: number;
  currency: string;
  style: object;
}) {
  const previousValue = useRef(value);
  const [displayValue, setDisplayValue] = useState(value);
  const motion = useSharedValue(1);

  useEffect(() => {
    const from = previousValue.current;
    const to = value;
    previousValue.current = value;
    motion.value = 0;
    motion.value = withTiming(1, { duration: 420 });

    if (from === to) {
      setDisplayValue(to);
      return undefined;
    }

    let frame: ReturnType<typeof requestAnimationFrame>;
    const startedAt = Date.now();
    const duration = 420;

    const tick = () => {
      const progress = Math.min((Date.now() - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(from + (to - from) * eased);

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        setDisplayValue(to);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [motion, value]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(motion.value, [0, 0.45, 1], [0, -2, 0]) },
      { scale: interpolate(motion.value, [0, 0.45, 1], [1, 1.045, 1]) },
    ],
  }));

  return (
    <Animated.Text style={[style, animatedStyle]}>
      {formatPrice(displayValue, currency)}
    </Animated.Text>
  );
}

interface CartSummaryProps {
  subtotal: number;
  itemCount: number;
  deliveryFee?: number;
  currency?: string;
  bottomInset?: number;
  disabled?: boolean;
  onCheckout: () => void;
}

function CartSummary({
  subtotal,
  itemCount,
  deliveryFee = 8,
  currency = "SAR",
  bottomInset = 0,
  disabled = false,
  onCheckout,
}: CartSummaryProps) {
  const total = useMemo(() => subtotal + deliveryFee, [deliveryFee, subtotal]);
  const itemLabel = itemCount === 1 ? "1 item" : `${itemCount} items`;

  return (
    <Animated.View
      entering={FadeInUp.duration(360)}
      style={[styles.container, { paddingBottom: 16 + bottomInset }]}
    >
      <View style={styles.handle} />

      <View style={styles.headerRow}>
        <View>
          <Text style={styles.eyebrow}>Order summary</Text>
          <Text style={styles.itemCount}>{itemLabel}</Text>
        </View>
        <View style={styles.deliveryPill}>
          <Ionicons name="bicycle-outline" size={14} color={colors.primary} />
          <Text style={styles.deliveryPillText}>Fast delivery</Text>
        </View>
      </View>

      <View style={styles.rows}>
        <View style={styles.row}>
          <Text style={styles.label}>Subtotal</Text>
          <Text style={styles.value}>{formatPrice(subtotal, currency)}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Delivery fee</Text>
          <Text style={styles.value}>{formatPrice(deliveryFee, currency)}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <AnimatedAmount value={total} currency={currency} style={styles.totalValue} />
      </View>

      <AnimatedPressable
        onPress={onCheckout}
        disabled={disabled}
        scaleTo={0.965}
        haptic="impact"
        style={styles.checkoutButton}
        disabledStyle={styles.checkoutDisabled}
        accessibilityRole="button"
        accessibilityLabel="Checkout"
      >
        <Text style={styles.checkoutText}>Checkout</Text>
        <View style={styles.checkoutAmount}>
          <Text style={styles.checkoutAmountText}>{formatPrice(total, currency)}</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.onPrimary} />
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: "rgba(255,255,255,0.82)",
    ...shadows.card,
  },
  handle: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceContainerHighest,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  eyebrow: {
    fontFamily: typography.bodyBold,
    color: colors.outline,
    fontSize: 12,
    lineHeight: 15,
  },
  itemCount: {
    marginTop: 1,
    fontFamily: typography.headlineSemi,
    color: colors.onSurface,
    fontSize: 18,
    lineHeight: 23,
  },
  deliveryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radii.pill,
    backgroundColor: colors.faintPrimary,
  },
  deliveryPillText: {
    fontFamily: typography.bodyBold,
    color: colors.primary,
    fontSize: 11,
    lineHeight: 13,
  },
  rows: {
    marginTop: 14,
    gap: 8,
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
  divider: {
    height: 1,
    marginTop: 12,
    marginBottom: 10,
    backgroundColor: colors.surfaceContainer,
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
    fontSize: 17,
    lineHeight: 22,
  },
  totalValue: {
    fontFamily: typography.headline,
    color: colors.primary,
    fontSize: 24,
    lineHeight: 30,
  },
  checkoutButton: {
    marginTop: 14,
    minHeight: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingLeft: 20,
    paddingRight: 8,
    ...shadows.primary,
  },
  checkoutDisabled: {
    opacity: 0.62,
  },
  checkoutText: {
    fontFamily: typography.headlineSemi,
    color: colors.onPrimary,
    fontSize: 16,
    lineHeight: 20,
  },
  checkoutAmount: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingLeft: 12,
    paddingRight: 12,
    borderRadius: radii.pill,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  checkoutAmountText: {
    fontFamily: typography.bodyBold,
    color: colors.onPrimary,
    fontSize: 12,
    lineHeight: 15,
  },
});

export default memo(CartSummary);
