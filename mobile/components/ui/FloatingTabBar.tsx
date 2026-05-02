import React, { memo, useEffect } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import AnimatedPressable from "./AnimatedPressable";
import { colors, radii, shadows, typography } from "./theme";
import { getCartQuantity, useCartStore } from "@/store/useCartStore";

type TabKey = "categories" | "home" | "cart" | "profile";

interface TabConfig {
  key: TabKey;
  route: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  activePath: (path: string) => boolean;
}

const tabs: TabConfig[] = [
  {
    key: "categories",
    route: "/restaurants",
    icon: "grid-outline",
    activeIcon: "grid",
    activePath: (path) => path.startsWith("/restaurants"),
  },
  {
    key: "home",
    route: "/home/Home",
    icon: "home-outline",
    activeIcon: "home",
    activePath: (path) => path === "/home/Home" || path === "/home",
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
  isHome?: boolean;
  badgeCount?: number;
}

const TabButton = memo(({ tab, active, isHome, badgeCount = 0 }: TabButtonProps) => {
  const progress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(active ? 1 : 0, {
      damping: 16,
      stiffness: 210,
      mass: 0.7,
    });
  }, [active, progress]);

  const bubbleStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.7, 1]) }],
  }));

  const shellStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(progress.value, [0, 1], [0, isHome ? -2 : -1]),
      },
      {
        scale: interpolate(progress.value, [0, 1], [1, isHome ? 1.08 : 1.03]),
      },
    ],
  }));

  const handlePress = () => {
    router.navigate(tab.route as never);
  };

  const iconColor = active ? colors.onPrimary : colors.outline;

  return (
    <AnimatedPressable
      onPress={handlePress}
      haptic="impact"
      scaleTo={0.92}
      accessibilityRole="button"
      accessibilityLabel={tab.key}
      style={[styles.tabButton, isHome && styles.homeButton]}
    >
      <Animated.View style={[styles.iconShell, isHome && styles.homeIconShell, shellStyle]}>
        <Animated.View
          pointerEvents="none"
          style={[styles.activeBubble, isHome && styles.homeActiveBubble, bubbleStyle]}
        />
        <Ionicons
          name={active ? tab.activeIcon : tab.icon}
          size={isHome ? 25 : 22}
          color={iconColor}
        />
        {tab.key === "cart" && badgeCount > 0 ? (
          <View style={styles.badge}>
            <Animated.Text style={styles.badgeText}>
              {badgeCount > 9 ? "9+" : badgeCount}
            </Animated.Text>
          </View>
        ) : null}
      </Animated.View>
    </AnimatedPressable>
  );
});
TabButton.displayName = "TabButton";

function FloatingTabBar() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const items = useCartStore((state) => state.items);
  const badgeCount = getCartQuantity(items);

  const barWidth = Math.min(width - 32, 380);
  const homeLeft = barWidth / 2 - 32;

  const categories = tabs[0];
  const home = tabs[1];
  const cart = tabs[2];
  const profile = tabs[3];

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: Math.max(insets.bottom, 10) + 8 }]}
    >
      <View style={[styles.bar, { width: barWidth }]}>
        <View style={styles.leftSlot}>
          <TabButton tab={categories} active={categories.activePath(pathname)} />
        </View>

        <View style={styles.rightSlot}>
          <TabButton
            tab={cart}
            active={cart.activePath(pathname)}
            badgeCount={badgeCount}
          />
          <TabButton tab={profile} active={profile.activePath(pathname)} />
        </View>

        <View style={[styles.homeSlot, { left: homeLeft }]}>
          <TabButton tab={home} active={home.activePath(pathname)} isHome />
        </View>
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
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.softSurface,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.78)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    ...shadows.card,
  },
  leftSlot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  rightSlot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  homeSlot: {
    position: "absolute",
    top: 7,
  },
  tabButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  homeButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  iconShell: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  homeIconShell: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.card,
    ...shadows.primary,
  },
  activeBubble: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    backgroundColor: colors.primary,
  },
  homeActiveBubble: {
    borderRadius: 32,
  },
  badge: {
    position: "absolute",
    top: 6,
    right: 5,
    minWidth: 17,
    height: 17,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
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
