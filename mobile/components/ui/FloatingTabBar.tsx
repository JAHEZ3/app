import React, { memo, useEffect } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import AnimatedPressable from "./AnimatedPressable";
import { colors, radii, shadows, typography } from "./theme";
import { useCommonT } from "@/hooks/useAppTranslation";
import { useLanguageStore } from "@/store/useLanguageStore";
import { getCartQuantity, useCartStore } from "@/store/useCartStore";

type TabKey = "orders" | "favorites" | "home" | "cart" | "profile";

interface TabConfig {
  key: TabKey;
  route: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  activePath: (path: string) => boolean;
}

const tabs: TabConfig[] = [
  {
    key: "home",
    route: "/home/Home",
    icon: "home-outline",
    activeIcon: "home",
    activePath: (path) => path === "/home/Home" || path === "/home",
  },
  {
    key: "orders",
    route: "/orders",
    icon: "receipt-outline",
    activeIcon: "receipt",
    activePath: (path) => path.startsWith("/orders"),
  },
  {
    key: "favorites",
    route: "/favorites",
    icon: "heart-outline",
    activeIcon: "heart",
    activePath: (path) => path.startsWith("/favorites"),
  },
  {
    key: "cart",
    route: "/cart",
    icon: "bag-handle-outline",
    activeIcon: "bag-handle",
    activePath: (path) => path.startsWith("/cart"),
  },
  {
    key: "profile",
    route: "/profile",
    icon: "person-outline",
    activeIcon: "person",
    activePath: (path) => path.startsWith("/profile"),
  },
];

interface TabButtonProps {
  tab: TabConfig;
  active: boolean;
  label: string;
  badgeCount?: number;
}

const TabButton = memo(({ tab, active, label, badgeCount = 0 }: TabButtonProps) => {
  const progress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(active ? 1 : 0, {
      damping: 15,
      stiffness: 220,
      mass: 0.7,
    });
  }, [active, progress]);

  // The tinted bubble behind the icon fades/scales in when active.
  const bubbleStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.5, 1]) }],
  }));

  // The whole icon lifts slightly when active.
  const iconLiftStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(progress.value, [0, 1], [0, -2]) }],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    color: active ? colors.primary : colors.outline,
    opacity: withTiming(active ? 1 : 0.85, { duration: 150 }),
  }));

  const handlePress = () => router.navigate(tab.route as never);

  return (
    <AnimatedPressable
      onPress={handlePress}
      haptic="impact"
      scaleTo={0.9}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={styles.tabButton}
    >
      <Animated.View style={[styles.iconShell, iconLiftStyle]}>
        <Animated.View pointerEvents="none" style={[styles.activeBubble, bubbleStyle]} />

        <Ionicons
          name={active ? tab.activeIcon : tab.icon}
          size={22}
          color={active ? colors.onPrimary : colors.outline}
        />

        {tab.key === "cart" && badgeCount > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badgeCount > 9 ? "9+" : badgeCount}</Text>
          </View>
        ) : null}
      </Animated.View>

      <Animated.Text style={[styles.label, labelStyle]} numberOfLines={1}>
        {label}
      </Animated.Text>
    </AnimatedPressable>
  );
});
TabButton.displayName = "TabButton";

function FloatingTabBar() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { t } = useCommonT();
  const isRTL = useLanguageStore((s) => s.isRTL);
  const items = useCartStore((state) => state.items);
  const cartCount = getCartQuantity(items);

  const barWidth = Math.min(width - 24, 440);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: Math.max(insets.bottom, 8) + 6 }]}
    >
      <View style={[styles.bar, { width: barWidth }, isRTL && styles.barRtl]}>
        {tabs.map((tab) => (
          <TabButton
            key={tab.key}
            tab={tab}
            active={tab.activePath(pathname)}
            label={t(`tabs.${tab.key}`)}
            badgeCount={tab.key === "cart" ? cartCount : 0}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 30,
  },
  bar: {
    borderRadius: 28,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 10,
    ...shadows.card,
  },
  barRtl: {
    flexDirection: "row-reverse",
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    paddingVertical: 2,
  },
  iconShell: {
    width: 46,
    height: 32,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  activeBubble: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    ...shadows.primary,
  },
  label: {
    fontFamily: typography.bodyBold,
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 0.1,
    textAlign: "center",
  },
  badge: {
    position: "absolute",
    top: -2,
    right: 4,
    minWidth: 17,
    height: 17,
    borderRadius: radii.pill,
    backgroundColor: colors.error,
    borderWidth: 2,
    borderColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    fontFamily: typography.bodyBold,
    color: colors.onPrimary,
    fontSize: 9,
    lineHeight: 11,
  },
});

export default memo(FloatingTabBar);
