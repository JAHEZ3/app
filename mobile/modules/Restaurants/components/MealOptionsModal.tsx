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
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AnimatedPressable from "@/components/ui/AnimatedPressable";
import { colors, radii, shadows, typography } from "@/components/ui/theme";
import { Meal, MealOption, MealOptionGroup } from "../entities/Meal";
import {
  useMealOptionsSelection,
  MealSelectionResult,
} from "../hooks/useMealOptionsSelection";
import { getMealImageSource } from "../utils/foodImages";

const MEAL_BLURHASH = "L6PZfSi_.AyE_3t7t7R**0o#DgR4";

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

const OptionRow = memo(
  ({ option, selected, selectionType, disabled, onToggle }: OptionRowProps) => {
    const handlePress = useCallback(() => {
      if (!disabled && option.isAvailable) onToggle(option.id);
    }, [disabled, onToggle, option.id, option.isAvailable]);

    return (
      <AnimatedPressable
        onPress={handlePress}
        disabled={disabled || !option.isAvailable}
        disabledStyle={styles.optionRowDisabled}
        style={[styles.optionRow, selected && styles.optionRowSelected]}
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
          <Text style={[styles.optionName, !option.isAvailable && styles.optionMuted]} numberOfLines={2}>
            {option.name}
          </Text>
          {!option.isAvailable ? <Text style={styles.optionUnavailable}>Unavailable</Text> : null}
        </View>

        {option.extraPrice > 0 ? (
          <Text style={styles.extraPrice}>+{option.extraPrice.toFixed(2)}</Text>
        ) : null}
      </AnimatedPressable>
    );
  },
);
OptionRow.displayName = "OptionRow";

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
  const handleToggle = useCallback(
    (optionId: string) => onToggle(group, optionId),
    [group, onToggle],
  );

  const reachedMax =
    group.selectionType === "multiple" && selectedCount >= group.maxSelections;

  const helperText =
    group.selectionType === "single"
      ? group.isRequired
        ? "Choose one"
        : "Choose one optional"
      : group.maxSelections > 1
        ? `Choose up to ${group.maxSelections}`
        : "Choose any";

  return (
    <View style={styles.groupBlock}>
      <View style={styles.groupHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.groupTitle}>{group.name}</Text>
          <Text style={styles.groupHelper}>{helperText}</Text>
        </View>
        <View style={[styles.groupBadge, group.isRequired ? styles.requiredBadge : styles.optionalBadge]}>
          <Text style={[styles.groupBadgeText, group.isRequired ? styles.requiredText : styles.optionalText]}>
            {group.isRequired ? "Required" : "Optional"}
          </Text>
        </View>
      </View>

      {showError && errorMessage ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={14} color={colors.error} />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
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
        disabled={quantity <= 1}
        style={styles.qtyBtn}
        disabledStyle={styles.qtyBtnDisabled}
      >
        <Ionicons name="remove" size={16} color={quantity <= 1 ? colors.outline : colors.onSurface} />
      </AnimatedPressable>
      <Text style={styles.qtyValue}>{quantity}</Text>
      <AnimatedPressable onPress={onIncrement} style={styles.qtyBtn}>
        <Ionicons name="add" size={16} color={colors.onSurface} />
      </AnimatedPressable>
    </View>
  );
}

const MealOptionsModal = ({
  visible,
  meal,
  onClose,
  onConfirm,
  confirmLabel = "Add to cart",
  currency = "SAR",
}: MealOptionsModalProps) => {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const sheetHeight = Math.round(height * 0.56);

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
        translateY.value = withTiming(0, { duration: 320 });
        overlayOpacity.value = withTiming(1, { duration: 240 });
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

  const handleConfirm = useCallback(() => {
    if (!isValid) {
      setShowErrors(true);
      return;
    }
    const result = buildResult();
    if (result) onConfirm(result);
  }, [buildResult, isValid, onConfirm]);

  if (!mounted || !sheetMeal) return null;

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
          style={[
            styles.sheet,
            {
              height: sheetHeight,
              paddingBottom: Math.max(insets.bottom, 12),
            },
            sheetStyle,
          ]}
        >
          <View style={styles.handleBar} />

          <View style={styles.headerBar}>
            <View>
              <Text style={styles.headerEyebrow}>Meal details</Text>
              <Text style={styles.headerTitle} numberOfLines={1}>
                Customize
              </Text>
            </View>
            <AnimatedPressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.onSurface} />
            </AnimatedPressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.heroRow}>
              <Image
                source={getMealImageSource(sheetMeal.imageUrl, sheetMeal.tags)}
                placeholder={MEAL_BLURHASH}
                contentFit="cover"
                transition={220}
                style={styles.mealImage}
              />
              <View style={styles.mealIntro}>
                <Text style={styles.mealName} numberOfLines={2}>
                  {sheetMeal.name}
                </Text>
                <Text style={styles.mealPrice}>{formatPrice(sheetMeal.price, currency)}</Text>
                {sheetMeal.calories ? (
                  <View style={styles.caloriePill}>
                    <Ionicons name="flame-outline" size={13} color={colors.primary} />
                    <Text style={styles.calorieText}>{Math.round(sheetMeal.calories)} Kcal</Text>
                  </View>
                ) : null}
              </View>
            </View>

            {sheetMeal.description ? (
              <Text style={styles.mealDescription}>{sheetMeal.description}</Text>
            ) : null}

            {sheetMeal.optionGroups.length > 0 ? (
              <>
                <View style={styles.customizeHeader}>
                  <Text style={styles.customizeTitle}>Options</Text>
                  <Text style={styles.customizeMeta}>{sheetMeal.optionGroups.length} group{sheetMeal.optionGroups.length === 1 ? "" : "s"}</Text>
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
                      errorMessage={validation?.message}
                      showError={showErrors && validation != null && !validation.valid}
                    />
                  );
                })}
              </>
            ) : (
              <View style={styles.noOptions}>
                <Ionicons name="checkmark-circle-outline" size={18} color={colors.primary} />
                <Text style={styles.noOptionsText}>No customizations needed.</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <QtyStepper quantity={quantity} onIncrement={increment} onDecrement={decrement} />

            <AnimatedPressable
              onPress={handleConfirm}
              haptic="impact"
              style={[styles.confirmBtn, !isValid && showErrors && styles.confirmBtnInvalid]}
            >
              <Text style={styles.confirmLabel}>{confirmLabel}</Text>
              <View style={styles.confirmDivider} />
              <Text style={styles.confirmPrice}>{formatPrice(totalPrice, currency)}</Text>
            </AnimatedPressable>
          </View>

          {showErrors && firstInvalidGroupId ? (
            <View style={styles.toast} pointerEvents="none">
              <Ionicons name="alert-circle" size={16} color={colors.onPrimary} />
              <Text style={styles.toastText}>Complete required selections.</Text>
            </View>
          ) : null}
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
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(30,30,30,0.42)",
  },
  sheet: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: colors.card,
    overflow: "hidden",
    ...shadows.card,
  },
  handleBar: {
    alignSelf: "center",
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceContainerHighest,
    marginTop: 10,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
  },
  headerEyebrow: {
    fontFamily: typography.bodyMedium,
    color: colors.outline,
    fontSize: 11,
  },
  headerTitle: {
    fontFamily: typography.headlineSemi,
    color: colors.onSurface,
    fontSize: 18,
    marginTop: 1,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceContainer,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  heroRow: {
    flexDirection: "row",
    gap: 13,
    alignItems: "center",
  },
  mealImage: {
    width: 112,
    height: 112,
    borderRadius: radii.xl,
    backgroundColor: colors.surfaceContainer,
  },
  mealIntro: {
    flex: 1,
    gap: 7,
  },
  mealName: {
    fontFamily: typography.headline,
    color: colors.onSurface,
    fontSize: 21,
    lineHeight: 27,
  },
  mealPrice: {
    fontFamily: typography.bodyBold,
    color: colors.primary,
    fontSize: 15,
  },
  caloriePill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.faintPrimary,
  },
  calorieText: {
    fontFamily: typography.bodyBold,
    color: colors.primary,
    fontSize: 11,
  },
  mealDescription: {
    marginTop: 13,
    fontFamily: typography.body,
    color: colors.outline,
    fontSize: 13,
    lineHeight: 20,
  },
  customizeHeader: {
    marginTop: 18,
    marginBottom: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  customizeTitle: {
    fontFamily: typography.headlineSemi,
    color: colors.onSurface,
    fontSize: 17,
  },
  customizeMeta: {
    fontFamily: typography.bodyMedium,
    color: colors.outline,
    fontSize: 12,
  },
  groupBlock: {
    paddingTop: 14,
    gap: 8,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  groupTitle: {
    fontFamily: typography.headlineSemi,
    color: colors.onSurface,
    fontSize: 15,
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
    paddingVertical: 7,
    borderRadius: radii.md,
  },
  errorText: {
    color: colors.error,
    fontFamily: typography.bodyBold,
    fontSize: 12,
  },
  optionsList: {
    gap: 8,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
  },
  optionRowSelected: {
    borderColor: colors.primary,
    backgroundColor: "#FFF7F1",
  },
  optionRowDisabled: {
    opacity: 0.55,
  },
  optionName: {
    fontFamily: typography.bodyBold,
    color: colors.onSurface,
    fontSize: 13,
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
  extraPrice: {
    fontFamily: typography.bodyBold,
    color: colors.primary,
    fontSize: 12,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.surfaceContainerHighest,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
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
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  noOptionsText: {
    fontFamily: typography.bodyMedium,
    color: colors.outline,
    fontSize: 12,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainer,
    backgroundColor: colors.card,
  },
  qtyWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.pill,
    paddingHorizontal: 4,
    minHeight: 42,
  },
  qtyBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyBtnDisabled: {
    opacity: 0.45,
  },
  qtyValue: {
    minWidth: 26,
    textAlign: "center",
    color: colors.onSurface,
    fontFamily: typography.bodyBold,
    fontSize: 14,
  },
  confirmBtn: {
    flex: 1,
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 11,
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    ...shadows.primary,
  },
  confirmBtnInvalid: {
    backgroundColor: colors.outline,
    shadowOpacity: 0,
  },
  confirmLabel: {
    color: colors.onPrimary,
    fontFamily: typography.bodyBold,
    fontSize: 14,
  },
  confirmDivider: {
    width: 1,
    height: 16,
    backgroundColor: "rgba(255,255,255,0.42)",
  },
  confirmPrice: {
    color: colors.onPrimary,
    fontFamily: typography.bodyBold,
    fontSize: 14,
  },
  toast: {
    position: "absolute",
    bottom: 76,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: "rgba(30,30,30,0.92)",
  },
  toastText: {
    color: colors.onPrimary,
    fontFamily: typography.bodyBold,
    fontSize: 12,
  },
});

export default memo(MealOptionsModal);
