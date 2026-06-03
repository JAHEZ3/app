import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AnimatedPressable from "@/components/ui/AnimatedPressable";
import { colors, radii, shadows, typography } from "@/components/ui/theme";
import { useHomeT } from "@/hooks/useAppTranslation";
import { useLanguageStore } from "@/store/useLanguageStore";
import { Meal, MealOption, MealOptionGroup } from "../entities/Meal";
import { useMealOptionsSelection } from "../hooks/useMealOptionsSelection";
import type { MealSelectionResult, GroupValidation } from "../hooks/useMealOptionsSelection";
import { getMealImageSource } from "../utils/foodImages";

const MEAL_BLURHASH = "L6PZfSi_.AyE_3t7t7R**0o#DgR4";
const HERO_HEIGHT = 210;

interface MealOptionsModalProps {
  visible: boolean;
  meal: Meal | null;
  onClose: () => void;
  onConfirm: (result: MealSelectionResult) => void;
  confirmLabel?: string;
  currency?: string;
}

interface OptionRowProps {
  option: MealOption;
  selected: boolean;
  selectionType: "single" | "multiple";
  disabled: boolean;
  onToggle: (optionId: string) => void;
}

const formatPrice = (value: number, currency: string) =>
  `${value.toFixed(value % 1 === 0 ? 0 : 2)} ${currency}`;

// ─── Option row ───────────────────────────────────────────────────────────────

const OptionRow = memo(
  ({ option, selected, selectionType, disabled, onToggle }: OptionRowProps) => {
    const { t } = useHomeT();
    const { isRTL } = useLanguageStore();
    const textAlign = isRTL ? "right" : "left";
    const currency = t("price.currency");

    const handlePress = useCallback(() => {
      if (!disabled && option.isAvailable) onToggle(option.id);
    }, [disabled, onToggle, option.id, option.isAvailable]);

    return (
      <AnimatedPressable
        onPress={handlePress}
        haptic="selection"
        scaleTo={0.98}
        disabled={disabled || !option.isAvailable}
        disabledStyle={styles.optionRowDisabled}
        style={[styles.optionRow, isRTL && styles.rowReverse, selected && styles.optionRowSelected]}
      >
        {selectionType === "single" ? (
          <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
            {selected ? <View style={styles.radioInner} /> : null}
          </View>
        ) : (
          <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
            {selected ? <Ionicons name="checkmark" size={14} color={colors.onPrimary} /> : null}
          </View>
        )}

        <View style={{ flex: 1 }}>
          <Text
            style={[styles.optionName, { textAlign }, !option.isAvailable && styles.optionMuted]}
            numberOfLines={2}
          >
            {option.name}
          </Text>
          {!option.isAvailable ? (
            <Text style={[styles.optionUnavailable, { textAlign }]}>
              {t("mealModal.unavailable")}
            </Text>
          ) : null}
        </View>

        {option.extraPrice > 0 ? (
          <View style={[styles.extraPricePill, selected && styles.extraPricePillSelected]}>
            <Text style={[styles.extraPrice, selected && styles.extraPriceSelected]}>
              +{formatPrice(option.extraPrice, currency)}
            </Text>
          </View>
        ) : null}
      </AnimatedPressable>
    );
  },
);
OptionRow.displayName = "OptionRow";

// ─── Group block ──────────────────────────────────────────────────────────────

function OptionGroupBlock({
  group,
  isOptionSelected,
  onToggle,
  selectedCount,
  errorMessage,
  showError,
}: {
  group: MealOptionGroup;
  isOptionSelected: (groupId: string, optionId: string) => boolean;
  onToggle: (group: MealOptionGroup, optionId: string) => void;
  selectedCount: number;
  errorMessage?: string;
  showError: boolean;
}) {
  const { t } = useHomeT();
  const { isRTL } = useLanguageStore();
  const textAlign = isRTL ? "right" : "left";

  const handleToggle = useCallback(
    (optionId: string) => onToggle(group, optionId),
    [group, onToggle],
  );

  const reachedMax =
    group.selectionType === "multiple" && selectedCount >= group.maxSelections;
  const complete = selectedCount > 0 && !showError;

  const helperText =
    group.selectionType === "single"
      ? group.isRequired
        ? t("mealModal.chooseOne")
        : t("mealModal.chooseOneOptional")
      : group.maxSelections > 1
        ? t("mealModal.chooseUpTo", { count: group.maxSelections })
        : t("mealModal.chooseAny");

  return (
    <View style={styles.groupBlock}>
      <View style={[styles.groupHeader, isRTL && styles.rowReverse]}>
        <View style={{ flex: 1 }}>
          <View style={[styles.groupTitleRow, isRTL && styles.rowReverse]}>
            <Text style={[styles.groupTitle, { textAlign }]}>{group.name}</Text>
            {complete ? (
              <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
            ) : null}
          </View>
          <Text style={[styles.groupHelper, { textAlign }]}>{helperText}</Text>
        </View>
        <View style={[styles.groupBadge, group.isRequired ? styles.requiredBadge : styles.optionalBadge]}>
          <Text style={[styles.groupBadgeText, group.isRequired ? styles.requiredText : styles.optionalText]}>
            {group.isRequired ? t("mealModal.required") : t("mealModal.optional")}
          </Text>
        </View>
      </View>

      {showError && errorMessage ? (
        <Animated.View entering={FadeIn.duration(180)} style={[styles.errorRow, isRTL && styles.rowReverse]}>
          <Ionicons name="alert-circle" size={14} color={colors.error} />
          <Text style={[styles.errorText, { textAlign }]}>{errorMessage}</Text>
        </Animated.View>
      ) : null}

      <View style={styles.optionsList}>
        {group.options.map((option) => {
          const selected = isOptionSelected(group.id, option.id);
          const disabled = !selected && reachedMax && group.selectionType === "multiple";
          return (
            <OptionRow
              key={option.id}
              option={option}
              selected={selected}
              selectionType={group.selectionType}
              disabled={disabled}
              onToggle={handleToggle}
            />
          );
        })}
      </View>
    </View>
  );
}

// ─── Quantity stepper ─────────────────────────────────────────────────────────

function QtyStepper({
  quantity,
  onIncrement,
  onDecrement,
}: {
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  return (
    <View style={styles.qtyWrap}>
      <AnimatedPressable
        onPress={onDecrement}
        haptic="selection"
        disabled={quantity <= 1}
        style={styles.qtyBtn}
        disabledStyle={styles.qtyBtnDisabled}
      >
        <Ionicons name="remove" size={18} color={quantity <= 1 ? colors.outline : colors.onSurface} />
      </AnimatedPressable>
      <Text style={styles.qtyValue}>{quantity}</Text>
      <AnimatedPressable onPress={onIncrement} haptic="selection" style={styles.qtyBtn}>
        <Ionicons name="add" size={18} color={colors.onSurface} />
      </AnimatedPressable>
    </View>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

const MealOptionsModal = ({
  visible,
  meal,
  onClose,
  onConfirm,
  confirmLabel,
  currency,
}: MealOptionsModalProps) => {
  const { t } = useHomeT();
  const { isRTL, language } = useLanguageStore();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const sheetHeight = Math.round(height * 0.86);
  const textAlign = isRTL ? "right" : "left";
  const resolvedCurrency = currency ?? t("price.currency");
  const resolvedConfirmLabel = confirmLabel ?? t("mealModal.addToCart");

  const [mounted, setMounted] = useState(visible);
  const [sheetMeal, setSheetMeal] = useState<Meal | null>(meal);
  const [showErrors, setShowErrors] = useState(false);

  const translateY = useSharedValue(sheetHeight);
  const overlayOpacity = useSharedValue(0);

  const {
    quantity,
    increment,
    decrement,
    isOptionSelected,
    toggleOption,
    groupValidations,
    isValid,
    totalPrice,
    firstInvalidGroupId,
    buildResult,
  } = useMealOptionsSelection({ meal: sheetMeal });

  useEffect(() => {
    if (visible && meal) {
      setMounted(true);
      setSheetMeal(meal);
      setShowErrors(false);
      translateY.value = sheetHeight;
      overlayOpacity.value = 0;
      requestAnimationFrame(() => {
        translateY.value = withTiming(0, { duration: 340 });
        overlayOpacity.value = withTiming(1, { duration: 260 });
      });
      return;
    }

    if (mounted && !visible) {
      translateY.value = withTiming(sheetHeight, { duration: 260 }, (finished) => {
        if (finished) {
          runOnJS(setMounted)(false);
          runOnJS(setSheetMeal)(null);
        }
      });
      overlayOpacity.value = withTiming(0, { duration: 220 });
    }
  }, [visible, meal, mounted, overlayOpacity, sheetHeight, translateY]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const validationByGroupId = useMemo(() => {
    const map: Record<string, (typeof groupValidations)[number]> = {};
    for (const validation of groupValidations) map[validation.groupId] = validation;
    return map;
  }, [groupValidations]);

  const getValidationMessage = useCallback(
    (validation: GroupValidation) => {
      if (validation.reason === "required") return t("mealModal.required");
      if (validation.reason === "min") {
        return t("mealModal.selectAtLeast", { count: validation.minSelections });
      }
      if (validation.reason === "max") {
        return t("mealModal.selectAtMost", { count: validation.maxSelections });
      }
      return undefined;
    },
    [t],
  );

  const handleConfirm = useCallback(() => {
    if (!isValid) {
      setShowErrors(true);
      return;
    }
    const result = buildResult();
    if (result) onConfirm(result);
  }, [buildResult, isValid, onConfirm]);

  if (!mounted || !sheetMeal) return null;

  const hasDiscount =
    sheetMeal.discountPrice != null && sheetMeal.discountPrice < sheetMeal.price;
  const basePrice = hasDiscount ? sheetMeal.discountPrice! : sheetMeal.price;
  const requiredCount = sheetMeal.optionGroups.filter((g) => g.isRequired).length;
  const ctaDisabled = !isValid && showErrors;

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        <Animated.View style={[styles.overlay, overlayStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View
          key={language}
          style={[styles.sheet, { height: sheetHeight }, sheetStyle]}
        >
          {/* Scrollable content (hero scrolls with the body for an immersive feel). */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: 130 + Math.max(insets.bottom, 8) },
            ]}
            bounces={false}
          >
            {/* Hero image */}
            <View style={styles.hero}>
              <Image
                source={getMealImageSource(sheetMeal.imageUrl, sheetMeal.tags)}
                placeholder={MEAL_BLURHASH}
                contentFit="cover"
                transition={240}
                style={styles.heroImage}
              />
              <LinearGradient
                colors={["rgba(15,15,15,0.32)", "rgba(15,15,15,0)", "rgba(15,15,15,0.30)"]}
                locations={[0, 0.45, 1]}
                style={StyleSheet.absoluteFill}
              />

              {/* Grab handle floats over the hero */}
              <View style={styles.handleBar} />

              {/* Close button */}
              <AnimatedPressable onPress={onClose} scaleTo={0.88} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={colors.onSurface} />
              </AnimatedPressable>

              {/* Badges */}
              <View style={[styles.heroBadges, isRTL && styles.heroBadgesRtl]}>
                {sheetMeal.isFeatured ? (
                  <View style={styles.featuredBadge}>
                    <Ionicons name="sparkles" size={11} color={colors.onPrimary} />
                    <Text style={styles.featuredText}>{t("meal.popular")}</Text>
                  </View>
                ) : null}
                {hasDiscount ? (
                  <View style={styles.discountBadge}>
                    <Ionicons name="pricetag" size={11} color={colors.onPrimary} />
                    <Text style={styles.featuredText}>
                      {`-${Math.round((1 - basePrice / sheetMeal.price) * 100)}%`}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Title + price card */}
            <View style={styles.infoCard}>
              <Text style={[styles.mealName, { textAlign }]}>{sheetMeal.name}</Text>

              <View style={[styles.priceRow, isRTL && styles.rowReverse]}>
                <View style={[styles.priceCol, isRTL && styles.rowReverse]}>
                  <Text style={styles.mealPrice}>{formatPrice(basePrice, resolvedCurrency)}</Text>
                  {hasDiscount ? (
                    <Text style={styles.mealStrikePrice}>
                      {formatPrice(sheetMeal.price, resolvedCurrency)}
                    </Text>
                  ) : null}
                </View>
                {sheetMeal.calories ? (
                  <View style={[styles.caloriePill, isRTL && styles.rowReverse]}>
                    <Ionicons name="flame" size={13} color={colors.primary} />
                    <Text style={styles.calorieText}>
                      {t("mealModal.kcal", { count: Math.round(sheetMeal.calories) })}
                    </Text>
                  </View>
                ) : null}
              </View>

              {sheetMeal.description ? (
                <Text style={[styles.mealDescription, { textAlign }]}>
                  {sheetMeal.description}
                </Text>
              ) : null}
            </View>

            {/* Options */}
            {sheetMeal.optionGroups.length > 0 ? (
              <View style={styles.optionsSection}>
                <View style={[styles.customizeHeader, isRTL && styles.rowReverse]}>
                  <View style={[styles.customizeTitleRow, isRTL && styles.rowReverse]}>
                    <View style={styles.customizeIcon}>
                      <Ionicons name="options" size={15} color={colors.primary} />
                    </View>
                    <Text style={[styles.customizeTitle, { textAlign }]}>
                      {t("mealModal.customize")}
                    </Text>
                  </View>
                  {requiredCount > 0 ? (
                    <Text style={styles.customizeMeta}>
                      {t("mealModal.required")}
                    </Text>
                  ) : null}
                </View>

                {sheetMeal.optionGroups.map((group) => {
                  const validation = validationByGroupId[group.id];
                  return (
                    <OptionGroupBlock
                      key={group.id}
                      group={group}
                      isOptionSelected={isOptionSelected}
                      onToggle={toggleOption}
                      selectedCount={validation?.selectedCount ?? 0}
                      errorMessage={validation ? getValidationMessage(validation) : undefined}
                      showError={showErrors && validation != null && !validation.valid}
                    />
                  );
                })}
              </View>
            ) : (
              <View style={[styles.noOptions, isRTL && styles.rowReverse]}>
                <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                <Text style={[styles.noOptionsText, { textAlign }]}>
                  {t("mealModal.noCustomizations")}
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Sticky footer */}
          <View
            style={[
              styles.footer,
              { paddingBottom: Math.max(insets.bottom, 14) },
            ]}
          >
            {showErrors && firstInvalidGroupId ? (
              <Animated.View
                entering={FadeIn.duration(200)}
                style={[styles.footerHint, isRTL && styles.rowReverse]}
              >
                <Ionicons name="alert-circle" size={14} color={colors.error} />
                <Text style={styles.footerHintText}>{t("mealModal.completeRequired")}</Text>
              </Animated.View>
            ) : null}

            <View style={[styles.footerRow, isRTL && styles.rowReverse]}>
              <QtyStepper quantity={quantity} onIncrement={increment} onDecrement={decrement} />

              <AnimatedPressable
                onPress={handleConfirm}
                haptic="impact"
                scaleTo={0.97}
                style={styles.confirmBtnWrap}
              >
                <LinearGradient
                  colors={ctaDisabled ? [colors.outline, colors.outline] : ["#FF7A2F", colors.primary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.confirmBtn, isRTL && styles.rowReverse]}
                >
                  <View style={[styles.confirmLeft, isRTL && styles.rowReverse]}>
                    <Ionicons name="bag-add" size={18} color={colors.onPrimary} />
                    <Text style={styles.confirmLabel}>{resolvedConfirmLabel}</Text>
                  </View>
                  <Text style={styles.confirmPrice}>
                    {formatPrice(totalPrice, resolvedCurrency)}
                  </Text>
                </LinearGradient>
              </AnimatedPressable>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(20,20,20,0.55)",
  },
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: colors.surface,
    overflow: "hidden",
    ...shadows.card,
  },
  scrollContent: {
    paddingBottom: 130,
  },

  // Hero
  hero: {
    height: HERO_HEIGHT,
    width: "100%",
    backgroundColor: colors.surfaceContainerHighest,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  handleBar: {
    position: "absolute",
    top: 10,
    alignSelf: "center",
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.7)",
  },
  closeBtn: {
    position: "absolute",
    top: 14,
    right: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    ...shadows.soft,
  },
  heroBadges: {
    position: "absolute",
    bottom: 14,
    left: 16,
    flexDirection: "row",
    gap: 8,
  },
  heroBadgesRtl: {
    left: undefined,
    right: 16,
    flexDirection: "row-reverse",
  },
  featuredBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  discountBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: "#16A34A",
  },
  featuredText: {
    fontFamily: typography.bodyBold,
    color: colors.onPrimary,
    fontSize: 11,
  },

  // Info card
  infoCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: 16,
    gap: 12,
    ...shadows.soft,
  },
  mealName: {
    fontFamily: typography.headline,
    color: colors.onSurface,
    fontSize: 22,
    lineHeight: 29,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  priceCol: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  mealPrice: {
    fontFamily: typography.headline,
    color: colors.primary,
    fontSize: 20,
  },
  mealStrikePrice: {
    fontFamily: typography.bodyMedium,
    color: colors.outline,
    fontSize: 14,
    textDecorationLine: "line-through",
  },
  caloriePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.faintPrimary,
  },
  calorieText: {
    fontFamily: typography.bodyBold,
    color: colors.primary,
    fontSize: 12,
  },
  mealDescription: {
    fontFamily: typography.body,
    color: colors.outline,
    fontSize: 13.5,
    lineHeight: 21,
  },

  // Options
  optionsSection: {
    paddingHorizontal: 16,
    paddingTop: 22,
  },
  customizeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  customizeTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  customizeIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.faintPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  customizeTitle: {
    fontFamily: typography.headline,
    color: colors.onSurface,
    fontSize: 18,
  },
  customizeMeta: {
    fontFamily: typography.bodyBold,
    color: colors.error,
    fontSize: 11,
  },
  groupBlock: {
    paddingTop: 18,
    gap: 10,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  groupTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  groupTitle: {
    fontFamily: typography.headlineSemi,
    color: colors.onSurface,
    fontSize: 15.5,
  },
  groupHelper: {
    marginTop: 2,
    fontFamily: typography.body,
    color: colors.outline,
    fontSize: 12,
  },
  groupBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  requiredBadge: {
    backgroundColor: "#FFF0EA",
  },
  optionalBadge: {
    backgroundColor: colors.surfaceContainer,
  },
  groupBadgeText: {
    fontFamily: typography.bodyBold,
    fontSize: 10,
  },
  requiredText: {
    color: colors.error,
  },
  optionalText: {
    color: colors.outline,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF0EA",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radii.md,
  },
  errorText: {
    color: colors.error,
    fontFamily: typography.bodyBold,
    fontSize: 12,
  },
  optionsList: {
    gap: 9,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.surfaceContainerHighest,
  },
  optionRowSelected: {
    borderColor: colors.primary,
    backgroundColor: "#FFF7F1",
    ...shadows.soft,
  },
  optionRowDisabled: {
    opacity: 0.5,
  },
  optionName: {
    fontFamily: typography.bodyBold,
    color: colors.onSurface,
    fontSize: 14,
  },
  optionMuted: {
    color: colors.outline,
  },
  optionUnavailable: {
    marginTop: 2,
    fontFamily: typography.body,
    color: colors.outline,
    fontSize: 11,
  },
  extraPricePill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceContainer,
  },
  extraPricePillSelected: {
    backgroundColor: colors.faintPrimary,
  },
  extraPrice: {
    fontFamily: typography.bodyBold,
    color: colors.outline,
    fontSize: 12,
  },
  extraPriceSelected: {
    color: colors.primary,
  },
  radioOuter: {
    width: 23,
    height: 23,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.surfaceContainerHighest,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  checkbox: {
    width: 23,
    height: 23,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.surfaceContainerHighest,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  noOptions: {
    marginHorizontal: 16,
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    padding: 14,
    borderRadius: radii.lg,
    backgroundColor: "#F0FDF4",
  },
  noOptionsText: {
    fontFamily: typography.bodyMedium,
    color: "#15803D",
    fontSize: 13,
  },

  // Footer
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 14,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainer,
    ...shadows.card,
  },
  footerHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "center",
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: "#FFF0EA",
  },
  footerHintText: {
    fontFamily: typography.bodyBold,
    color: colors.error,
    fontSize: 12,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  qtyWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.surfaceContainerHighest,
    borderRadius: radii.pill,
    paddingHorizontal: 4,
    height: 52,
  },
  qtyBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyBtnDisabled: {
    opacity: 0.4,
  },
  qtyValue: {
    minWidth: 26,
    textAlign: "center",
    color: colors.onSurface,
    fontFamily: typography.headline,
    fontSize: 16,
  },
  confirmBtnWrap: {
    flex: 1,
    height: 52,
    borderRadius: radii.pill,
    overflow: "hidden",
    ...shadows.primary,
  },
  confirmBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
  },
  confirmLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  confirmLabel: {
    color: colors.onPrimary,
    fontFamily: typography.bodyBold,
    fontSize: 15,
  },
  confirmPrice: {
    color: colors.onPrimary,
    fontFamily: typography.headline,
    fontSize: 15,
  },
});

export default memo(MealOptionsModal);
