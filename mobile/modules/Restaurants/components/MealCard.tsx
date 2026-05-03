import React, { memo, useCallback } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
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
}

const formatPrice = (value: number, currency: string) =>
  `${value.toFixed(value % 1 === 0 ? 0 : 2)} ${currency}`;

const MealCard = ({ meal, onPress, currency = "ILS", isAdding = false }: MealCardProps) => {
  const handlePress = useCallback(() => onPress(meal), [meal, onPress]);
  const calories = meal.calories ? `${Math.round(meal.calories)} Kcal` : null;

  return (
    <AnimatedPressable
      onPress={handlePress}
      haptic="impact"
      disabled={!meal.isAvailable || isAdding}
      disabledStyle={styles.cardUnavailable}
      style={styles.card}
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
            <Ionicons name="sparkles" size={11} color={colors.onPrimary} />
          </View>
        ) : null}
      </View>

      <View style={styles.info}>
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={2}>
            {meal.name}
          </Text>
          <View style={styles.addBtn}>
            {isAdding ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
              <Ionicons name="add" size={16} color={colors.onPrimary} />
            )}
          </View>
        </View>

        {meal.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {meal.description}
          </Text>
        ) : null}

        <View style={styles.footer}>
          <View style={styles.pricePill}>
            <Text style={styles.price}>{formatPrice(meal.price, currency)}</Text>
          </View>
          {calories ? (
            <View style={styles.metaItem}>
              <Ionicons name="flame-outline" size={13} color={colors.outline} />
              <Text style={styles.metaText}>{calories}</Text>
            </View>
          ) : null}
          {meal.optionGroups.length > 0 ? (
            <View style={styles.metaItem}>
              <Ionicons name="options-outline" size={13} color={colors.outline} />
              <Text style={styles.metaText}>{meal.optionGroups.length}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: 11,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
    ...shadows.soft,
  },
  cardUnavailable: {
    opacity: 0.5,
  },
  imageWrap: {
    width: 96,
    height: 96,
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
    top: 8,
    left: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    minHeight: 96,
    justifyContent: "space-between",
    gap: 7,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  name: {
    flex: 1,
    fontFamily: typography.headlineSemi,
    color: colors.onSurface,
    fontSize: 15,
    lineHeight: 20,
  },
  addBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  description: {
    fontFamily: typography.body,
    color: colors.outline,
    fontSize: 12,
    lineHeight: 17,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  pricePill: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.faintPrimary,
  },
  price: {
    fontFamily: typography.bodyBold,
    color: colors.primary,
    fontSize: 12,
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
});

export default memo(MealCard);
