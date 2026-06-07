import React, { memo, useEffect } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
} from "react-native-reanimated";
import AnimatedPressable from "@/components/ui/AnimatedPressable";
import { colors, radii, shadows, typography } from "@/components/ui/theme";
import { useLanguageStore } from "@/store/useLanguageStore";
import type { SortKey } from "../../hooks/useRestaurantsDiscovery";

interface SortOption {
  key: SortKey;
  labelEn: string;
  labelAr: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const OPTIONS: SortOption[] = [
  { key: "recommended", labelEn: "Recommended", labelAr: "موصى به", icon: "sparkles" },
  { key: "rating", labelEn: "Highest Rated", labelAr: "الأعلى تقييماً", icon: "star" },
  { key: "popular", labelEn: "Most Popular", labelAr: "الأكثر رواجاً", icon: "flame" },
  { key: "newest", labelEn: "Newest", labelAr: "الأحدث", icon: "time" },
  { key: "minOrder", labelEn: "Lowest Min Order", labelAr: "أقل حد أدنى", icon: "pricetag" },
];

function SortSheetBase({
  visible,
  value,
  onSelect,
  onClose,
}: {
  visible: boolean;
  value: SortKey;
  onSelect: (key: SortKey) => void;
  onClose: () => void;
}) {
  const isRTL = useLanguageStore((s) => s.isRTL);
  const dir = isRTL ? "rtl" : "ltr";

  const sheetY = useSharedValue(400);
  const backdrop = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      backdrop.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) });
      sheetY.value = withSpring(0, { damping: 22, stiffness: 240, mass: 0.9 });
    } else {
      backdrop.value = withTiming(0, { duration: 160 });
      sheetY.value = withTiming(400, { duration: 200, easing: Easing.in(Easing.quad) });
    }
  }, [visible, sheetY, backdrop]);

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: sheetY.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <View style={styles.anchor} pointerEvents="box-none">
        <Animated.View style={[styles.sheet, sheetStyle]}>
          <View style={styles.handle} />
          <Text style={[styles.title, { writingDirection: dir }]}>
            {isRTL ? "ترتيب حسب" : "Sort by"}
          </Text>

          <View style={styles.list}>
            {OPTIONS.map((opt) => {
              const active = opt.key === value;
              return (
                <AnimatedPressable
                  key={opt.key}
                  onPress={() => {
                    onSelect(opt.key);
                    onClose();
                  }}
                  haptic="selection"
                  scaleTo={0.98}
                  style={[styles.row, active && styles.rowActive, isRTL && styles.rowRtl]}
                >
                  <View style={[styles.rowIcon, active && styles.rowIconActive]}>
                    <Ionicons
                      name={opt.icon}
                      size={17}
                      color={active ? colors.onPrimary : colors.primary}
                    />
                  </View>
                  <Text
                    style={[styles.rowLabel, active && styles.rowLabelActive, { writingDirection: dir }]}
                  >
                    {isRTL ? opt.labelAr : opt.labelEn}
                  </Text>
                  {active ? (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  ) : (
                    <View style={styles.radioIdle} />
                  )}
                </AnimatedPressable>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: "rgba(0,0,0,0.5)" },
  anchor: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 34,
    ...shadows.card,
  },
  handle: {
    alignSelf: "center",
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceContainerHighest,
    marginBottom: 16,
  },
  title: {
    fontFamily: typography.headline,
    color: colors.onSurface,
    fontSize: 19,
    textAlign: "center",
    marginBottom: 14,
  },
  list: { gap: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    height: 56,
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: "transparent",
  },
  rowRtl: { flexDirection: "row-reverse" },
  rowActive: {
    borderColor: colors.softPrimary,
    backgroundColor: colors.faintPrimary,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.faintPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  rowIconActive: { backgroundColor: colors.primary },
  rowLabel: {
    flex: 1,
    fontFamily: typography.bodyBold,
    color: colors.onSurface,
    fontSize: 15,
  },
  rowLabelActive: { color: colors.primary },
  radioIdle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.surfaceContainerHighest,
  },
});

export default memo(SortSheetBase);
