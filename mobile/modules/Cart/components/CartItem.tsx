import React, { memo, useCallback, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeInUp,
  FadeOutLeft,
  LinearTransition,
} from "react-native-reanimated";
import AnimatedPressable from "@/components/ui/AnimatedPressable";
import { colors, radii, shadows, typography } from "@/components/ui/theme";
import type { CartItem as CartItemType } from "../types";

const MEAL_BLURHASH = "L6PZfSi_.AyE_3t7t7R**0o#DgR4";
const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1543353071-873f17a7a088?auto=format&fit=crop&w=700&q=80";

const formatPrice = (value: number, currency: string) =>
  `${value.toFixed(value % 1 === 0 ? 0 : 2)} ${currency}`;

interface CartItemProps {
  item: CartItemType;
  index: number;
  currency?: string;
  disabled?: boolean;
  onChangeQuantity: (mealId: string, nextQuantity: number) => void;
  onRemove: (mealId: string) => void;
}

function CartItem({
  item,
  index,
  currency = "SAR",
  disabled = false,
  onChangeQuantity,
  onRemove,
}: CartItemProps) {
  const imageSource = useMemo(
    () => ({ uri: item.mealImage || FALLBACK_IMAGE }),
    [item.mealImage],
  );

  const visibleOptions = useMemo(() => item.options.slice(0, 3), [item.options]);
  const hiddenOptionsCount = Math.max(item.options.length - visibleOptions.length, 0);

  const handleIncrement = useCallback(() => {
    onChangeQuantity(item.mealId, item.quantity + 1);
  }, [item.mealId, item.quantity, onChangeQuantity]);

  const handleDecrement = useCallback(() => {
    if (item.quantity <= 1) return;
    onChangeQuantity(item.mealId, item.quantity - 1);
  }, [item.mealId, item.quantity, onChangeQuantity]);

  const handleRemove = useCallback(() => {
    onRemove(item.mealId);
  }, [item.mealId, onRemove]);

  return (
    <Animated.View
      entering={FadeInUp.delay(index * 60)
        .duration(420)
        .springify()
        .damping(18)}
      exiting={FadeOutLeft.duration(220)}
      layout={LinearTransition.springify().damping(18).stiffness(180)}
      style={styles.shell}
    >
      <View style={styles.card}>
        <View style={styles.imageWrap}>
          <Image
            source={imageSource}
            placeholder={MEAL_BLURHASH}
            contentFit="cover"
            transition={180}
            style={styles.image}
          />
          <View style={styles.qtyBadge}>
            <Text style={styles.qtyBadgeText}>x{item.quantity}</Text>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <View style={styles.titleBlock}>
              <Text style={styles.name} numberOfLines={2}>
                {item.mealName}
              </Text>
              <Text style={styles.unitPrice}>
                {formatPrice(item.unitPrice, currency)} each
              </Text>
            </View>

            <AnimatedPressable
              onPress={handleRemove}
              disabled={disabled}
              scaleTo={0.9}
              haptic="impact"
              style={styles.trashButton}
              disabledStyle={styles.disabledAction}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${item.mealName}`}
            >
              <Ionicons name="trash-outline" size={17} color={colors.error} />
            </AnimatedPressable>
          </View>

          {visibleOptions.length > 0 ? (
            <View style={styles.optionsWrap}>
              {visibleOptions.map((option) => (
                <View key={option.optionId} style={styles.optionChip}>
                  <Text style={styles.optionText} numberOfLines={1}>
                    {option.optionName}
                  </Text>
                </View>
              ))}
              {hiddenOptionsCount > 0 ? (
                <View style={styles.optionChip}>
                  <Text style={styles.optionText}>+{hiddenOptionsCount}</Text>
                </View>
              ) : null}
            </View>
          ) : (
            <Text style={styles.noOptions}>No customizations</Text>
          )}

          {item.specialInstructions ? (
            <View style={styles.noteRow}>
              <Ionicons name="chatbubble-ellipses-outline" size={13} color={colors.outline} />
              <Text style={styles.noteText} numberOfLines={1}>
                {item.specialInstructions}
              </Text>
            </View>
          ) : null}

          <View style={styles.footer}>
            <View style={styles.stepper}>
              <AnimatedPressable
                onPress={handleDecrement}
                disabled={disabled || item.quantity <= 1}
                scaleTo={0.86}
                haptic="impact"
                style={styles.stepButton}
                disabledStyle={styles.stepButtonDisabled}
                accessibilityRole="button"
                accessibilityLabel={`Decrease ${item.mealName} quantity`}
              >
                <Ionicons
                  name="remove"
                  size={16}
                  color={item.quantity <= 1 ? colors.outline : colors.onSurface}
                />
              </AnimatedPressable>

              <Animated.View
                key={item.quantity}
                entering={FadeInUp.duration(180)}
                style={styles.quantityPill}
              >
                <Text style={styles.quantityText}>{item.quantity}</Text>
              </Animated.View>

              <AnimatedPressable
                onPress={handleIncrement}
                disabled={disabled}
                scaleTo={0.86}
                haptic="impact"
                style={[styles.stepButton, styles.stepButtonPrimary]}
                disabledStyle={styles.disabledAction}
                accessibilityRole="button"
                accessibilityLabel={`Increase ${item.mealName} quantity`}
              >
                <Ionicons name="add" size={17} color={colors.onPrimary} />
              </AnimatedPressable>
            </View>

            <View style={styles.priceBlock}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalPrice}>
                {formatPrice(item.totalPrice, currency)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shell: {
    paddingHorizontal: 20,
  },
  card: {
    minHeight: 138,
    flexDirection: "row",
    gap: 14,
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(229,229,229,0.78)",
    ...shadows.card,
  },
  imageWrap: {
    width: 104,
    height: 116,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: colors.surfaceContainer,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  qtyBadge: {
    position: "absolute",
    left: 8,
    bottom: 8,
    minWidth: 34,
    height: 24,
    paddingHorizontal: 8,
    borderRadius: radii.pill,
    backgroundColor: "rgba(30,30,30,0.78)",
    alignItems: "center",
    justifyContent: "center",
  },
  qtyBadgeText: {
    fontFamily: typography.bodyBold,
    color: colors.onPrimary,
    fontSize: 11,
    lineHeight: 13,
  },
  content: {
    flex: 1,
    gap: 9,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontFamily: typography.headlineSemi,
    color: colors.onSurface,
    fontSize: 16,
    lineHeight: 21,
  },
  unitPrice: {
    marginTop: 2,
    fontFamily: typography.bodyMedium,
    color: colors.outline,
    fontSize: 12,
    lineHeight: 16,
  },
  trashButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FFF0EA",
    alignItems: "center",
    justifyContent: "center",
  },
  optionsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  optionChip: {
    maxWidth: "100%",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
  },
  optionText: {
    fontFamily: typography.bodyBold,
    color: colors.outline,
    fontSize: 11,
    lineHeight: 13,
  },
  noOptions: {
    fontFamily: typography.bodyMedium,
    color: colors.outline,
    fontSize: 12,
  },
  noteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  noteText: {
    flex: 1,
    fontFamily: typography.bodyMedium,
    color: colors.outline,
    fontSize: 11,
  },
  footer: {
    marginTop: "auto",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    padding: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
  },
  stepButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  stepButtonPrimary: {
    backgroundColor: colors.primary,
    ...shadows.primary,
  },
  stepButtonDisabled: {
    opacity: 0.45,
  },
  quantityPill: {
    minWidth: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityText: {
    fontFamily: typography.bodyBold,
    color: colors.onSurface,
    fontSize: 14,
    lineHeight: 18,
    textAlign: "center",
  },
  priceBlock: {
    alignItems: "flex-end",
    minWidth: 76,
  },
  totalLabel: {
    fontFamily: typography.bodyMedium,
    color: colors.outline,
    fontSize: 10,
    lineHeight: 12,
  },
  totalPrice: {
    fontFamily: typography.headlineSemi,
    color: colors.primary,
    fontSize: 15,
    lineHeight: 20,
  },
  disabledAction: {
    opacity: 0.55,
  },
});

export default memo(CartItem);
