import React, { memo, useCallback, useEffect, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  FadeInUp,
  FadeOutLeft,
  FadeOutRight,
  LinearTransition,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import AnimatedPressable from "@/components/ui/AnimatedPressable";
import { colors, radii, shadows, typography } from "@/components/ui/theme";
import { useCartT } from "@/hooks/useAppTranslation";
import { useLanguageStore } from "@/store/useLanguageStore";
import type { CartItem as CartItemType } from "../types";

const MEAL_BLURHASH = "L6PZfSi_.AyE_3t7t7R**0o#DgR4";
const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1543353071-873f17a7a088?auto=format&fit=crop&w=700&q=80";
const SWIPE_REVEAL = 94;
const SWIPE_THRESHOLD = 72;

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
  currency = "ILS",
  disabled = false,
  onChangeQuantity,
  onRemove,
}: CartItemProps) {
  const { t } = useCartT();
  const isRTL = useLanguageStore((state) => state.isRTL);
  const textAlign = isRTL ? "right" : "left";
  const writingDirection = isRTL ? "rtl" : "ltr";
  const directionMultiplier = isRTL ? 1 : -1;
  const translateX = useSharedValue(0);

  useEffect(() => {
    translateX.value = withTiming(0, { duration: 160 });
  }, [isRTL, translateX]);

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
    translateX.value = withTiming(directionMultiplier * SWIPE_REVEAL, { duration: 120 });
    onRemove(item.mealId);
  }, [directionMultiplier, item.mealId, onRemove, translateX]);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!disabled)
        .activeOffsetX(isRTL ? [-999, 12] : [-12, 999])
        .failOffsetY([-12, 12])
        .onUpdate((event) => {
          const directionalDrag = event.translationX * directionMultiplier;

          if (directionalDrag > 0) {
            translateX.value =
              directionMultiplier * Math.min(directionalDrag, SWIPE_REVEAL);
            return;
          }

          translateX.value = directionMultiplier * Math.max(directionalDrag * 0.18, -14);
        })
        .onEnd((event) => {
          const directionalDrag = event.translationX * directionMultiplier;

          if (directionalDrag > SWIPE_THRESHOLD) {
            translateX.value = withTiming(
              directionMultiplier * SWIPE_REVEAL,
              { duration: 150 },
              (finished) => {
                if (finished) runOnJS(handleRemove)();
              },
            );
            return;
          }

          translateX.value = withSpring(0, { damping: 18, stiffness: 220 });
        }),
    [directionMultiplier, disabled, handleRemove, isRTL, translateX],
  );

  const cardMotionStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Animated.View
      entering={FadeInUp.delay(index * 60)
        .duration(420)
        .springify()
        .damping(18)}
      exiting={(isRTL ? FadeOutRight : FadeOutLeft).duration(220)}
      layout={LinearTransition.springify().damping(18).stiffness(180)}
      style={styles.shell}
    >
      <View
        style={[
          styles.swipeAction,
          isRTL ? styles.swipeActionRtl : styles.swipeActionLtr,
        ]}
        pointerEvents="none"
      >
        <View style={[styles.swipeContent, isRTL && styles.rowReverse]}>
          <Ionicons name="trash-outline" size={18} color={colors.error} />
          <Text style={[styles.swipeText, { textAlign, writingDirection }]}>
            {t("actions.swipeToDelete")}
          </Text>
        </View>
      </View>

      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            styles.card,
            isRTL && styles.rowReverse,
            cardMotionStyle,
          ]}
        >
          <View style={styles.imageWrap}>
            <Image
              source={imageSource}
              placeholder={MEAL_BLURHASH}
              contentFit="cover"
              transition={180}
              style={styles.image}
            />
            <View style={[styles.qtyBadge, isRTL && styles.qtyBadgeRtl]}>
              <Text style={styles.qtyBadgeText}>x{item.quantity}</Text>
            </View>
          </View>

          <View style={styles.content}>
            <View style={[styles.titleRow, isRTL && styles.rowReverse]}>
              <View style={styles.titleBlock}>
                <Text
                  style={[styles.name, { textAlign, writingDirection }]}
                  numberOfLines={2}
                >
                  {item.mealName}
                </Text>
                <Text style={[styles.unitPrice, { textAlign, writingDirection }]}>
                  {formatPrice(item.unitPrice, currency)} {t("items.each")}
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
                accessibilityLabel={t("accessibility.removeItem", {
                  mealName: item.mealName,
                })}
              >
                <Ionicons name="trash-outline" size={17} color={colors.error} />
              </AnimatedPressable>
            </View>

            {visibleOptions.length > 0 ? (
              <View style={[styles.optionsWrap, isRTL && styles.rowReverse]}>
                {visibleOptions.map((option) => (
                  <View key={option.optionId} style={styles.optionChip}>
                    <Text
                      style={[styles.optionText, { textAlign, writingDirection }]}
                      numberOfLines={1}
                    >
                      {option.optionName}
                    </Text>
                  </View>
                ))}
                {hiddenOptionsCount > 0 ? (
                  <View style={styles.optionChip}>
                    <Text style={[styles.optionText, { textAlign, writingDirection }]}>
                      {t("items.moreOptions", { count: hiddenOptionsCount })}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : (
              <Text style={[styles.noOptions, { textAlign, writingDirection }]}>
                {t("items.noCustomizations")}
              </Text>
            )}

            {item.specialInstructions ? (
              <View style={[styles.noteRow, isRTL && styles.rowReverse]}>
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={13}
                  color={colors.outline}
                />
                <Text
                  style={[styles.noteText, { textAlign, writingDirection }]}
                  numberOfLines={1}
                >
                  {item.specialInstructions}
                </Text>
              </View>
            ) : null}

            <View style={[styles.footer, isRTL && styles.rowReverse]}>
              <View style={[styles.stepper, isRTL && styles.rowReverse]}>
                <AnimatedPressable
                  onPress={handleDecrement}
                  disabled={disabled || item.quantity <= 1}
                  scaleTo={0.86}
                  haptic="impact"
                  style={styles.stepButton}
                  disabledStyle={styles.stepButtonDisabled}
                  accessibilityRole="button"
                  accessibilityLabel={t("accessibility.decreaseQuantity", {
                    mealName: item.mealName,
                  })}
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
                  accessibilityLabel={t("accessibility.increaseQuantity", {
                    mealName: item.mealName,
                  })}
                >
                  <Ionicons name="add" size={17} color={colors.onPrimary} />
                </AnimatedPressable>
              </View>

              <View style={[styles.priceBlock, isRTL && styles.priceBlockRtl]}>
                <Text style={[styles.totalLabel, { textAlign, writingDirection }]}>
                  {t("items.total")}
                </Text>
                <Text style={[styles.totalPrice, { textAlign, writingDirection }]}>
                  {formatPrice(item.totalPrice, currency)}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shell: {
    paddingHorizontal: 20,
    position: "relative",
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
  rowReverse: {
    flexDirection: "row-reverse",
  },
  swipeAction: {
    position: "absolute",
    left: 20,
    right: 20,
    top: 0,
    bottom: 0,
    borderRadius: 22,
    backgroundColor: "#FFF0EA",
    justifyContent: "center",
  },
  swipeActionLtr: {
    alignItems: "flex-end",
    paddingRight: 22,
  },
  swipeActionRtl: {
    alignItems: "flex-start",
    paddingLeft: 22,
  },
  swipeContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  swipeText: {
    fontFamily: typography.bodyBold,
    color: colors.error,
    fontSize: 12,
    lineHeight: 15,
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
  qtyBadgeRtl: {
    left: undefined,
    right: 8,
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
    minWidth: 0,
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
  priceBlockRtl: {
    alignItems: "flex-start",
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
