import React, { memo, useCallback } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import AnimatedPressable from "@/components/ui/AnimatedPressable";
import { colors, radii, shadows, typography } from "@/components/ui/theme";
import { Meal } from "../entities/Meal";
import { getMealImageSource } from "../utils/foodImages";

const MEAL_BLURHASH = "L6PZfSi_.AyE_3t7t7R**0o#DgR4";

interface MealCardProps {
  meal: Meal;
  onPress: (meal: Meal) => void;
  currency?: string;
  isAdding?: boolean;
  isRTL?: boolean;
  /** Position in the list — drives the staggered entrance animation. */
  index?: number;
}

const formatPrice = (value: number, currency: string) =>
  `${value.toFixed(value % 1 === 0 ? 0 : 2)} ${currency}`;

const MealCard = ({
  meal,
  onPress,
  currency = "ILS",
  isAdding = false,
  isRTL = false,
  index = 0,
}: MealCardProps) => {
  const handlePress = useCallback(() => onPress(meal), [meal, onPress]);
  const calories = meal.calories ? `${Math.round(meal.calories)} Kcal` : null;
  const textAlign = isRTL ? "right" : "left";

  const hasDiscount =
    meal.discountPrice != null && meal.discountPrice < meal.price;
  const displayPrice = hasDiscount ? meal.discountPrice! : meal.price;

  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index, 8) * 55)
        .springify()
        .damping(18)
        .stiffness(140)}
    >
      <AnimatedPressable
        onPress={handlePress}
        haptic="impact"
        scaleTo={0.98}
        disabled={!meal.isAvailable || isAdding}
        disabledStyle={styles.cardUnavailable}
        style={[styles.card, isRTL && styles.cardRTL]}
      >
        <View style={styles.imageWrap}>
          <Image
            source={getMealImageSource(meal.imageUrl, meal.tags)}
            placeholder={MEAL_BLURHASH}
            contentFit="cover"
            transition={180}
            style={styles.image}
          />
          {meal.isFeatured ? (
            <View style={styles.featuredBadge}>
              <Ionicons name="sparkles" size={10} color={colors.onPrimary} />
              <Text style={styles.featuredText}>Top</Text>
            </View>
          ) : null}
          {!meal.isAvailable ? (
            <View style={styles.unavailableOverlay}>
              <Text style={styles.unavailableText}>
                {isRTL ? "غير متوفر" : "Sold out"}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.info}>
          <View>
            <Text style={[styles.name, { textAlign }]} numberOfLines={2}>
              {meal.name}
            </Text>
            {meal.description ? (
              <Text
                style={[styles.description, { textAlign }]}
                numberOfLines={2}
              >
                {meal.description}
              </Text>
            ) : null}
          </View>

          {(calories || meal.optionGroups.length > 0) && (
            <View style={[styles.metaRow, isRTL && styles.rowReverse]}>
              {calories ? (
                <View style={styles.metaItem}>
                  <Ionicons
                    name="flame-outline"
                    size={12}
                    color={colors.outline}
                  />
                  <Text style={styles.metaText}>{calories}</Text>
                </View>
              ) : null}
              {meal.optionGroups.length > 0 ? (
                <View style={styles.metaItem}>
                  <Ionicons
                    name="options-outline"
                    size={12}
                    color={colors.outline}
                  />
                  <Text style={styles.metaText}>
                    {meal.optionGroups.length}
                  </Text>
                </View>
              ) : null}
            </View>
          )}

          <View style={[styles.footer, isRTL && styles.rowReverse]}>
            <View style={[styles.priceCol, isRTL && styles.priceColRTL]}>
              <Text style={styles.price}>
                {formatPrice(displayPrice, currency)}
              </Text>
              {hasDiscount ? (
                <Text style={styles.strikePrice}>
                  {formatPrice(meal.price, currency)}
                </Text>
              ) : null}
            </View>

            <View style={styles.addBtnWrap}>
              {isAdding ? (
                <View style={styles.addBtnLoading}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : (
                <LinearGradient
                  colors={["#FF7A2F", colors.primary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.addBtn}
                >
                  <Ionicons name="add" size={20} color={colors.onPrimary} />
                </LinearGradient>
              )}
            </View>
          </View>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: 13,
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
    ...shadows.soft,
  },
  cardRTL: {
    flexDirection: "row-reverse",
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
  cardUnavailable: {
    opacity: 0.6,
  },
  imageWrap: {
    width: 104,
    height: 104,
    borderRadius: radii.lg,
    overflow: "hidden",
    position: "relative",
    backgroundColor: colors.surfaceContainer,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  featuredBadge: {
    position: "absolute",
    top: 7,
    left: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  featuredText: {
    fontFamily: typography.bodyBold,
    color: colors.onPrimary,
    fontSize: 9,
  },
  unavailableOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(20,20,20,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  unavailableText: {
    fontFamily: typography.bodyBold,
    color: colors.onPrimary,
    fontSize: 11,
  },
  info: {
    flex: 1,
    minHeight: 104,
    justifyContent: "space-between",
    gap: 6,
  },
  name: {
    fontFamily: typography.headlineSemi,
    color: colors.onSurface,
    fontSize: 15.5,
    lineHeight: 20,
  },
  description: {
    fontFamily: typography.body,
    color: colors.outline,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontFamily: typography.bodyMedium,
    color: colors.outline,
    fontSize: 11,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  priceCol: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 7,
  },
  priceColRTL: {
    flexDirection: "row-reverse",
  },
  price: {
    fontFamily: typography.headline,
    color: colors.onSurface,
    fontSize: 16,
  },
  strikePrice: {
    fontFamily: typography.bodyMedium,
    color: colors.outline,
    fontSize: 12,
    textDecorationLine: "line-through",
  },
  addBtnWrap: {
    width: 36,
    height: 36,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.primary,
  },
  addBtnLoading: {
    width: 36,
    height: 36,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.faintPrimary,
  },
});

export default memo(MealCard);
