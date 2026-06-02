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

const FAV_COLOR       = colors.primary;
const FAV_COLOR_LIGHT = colors.faintPrimary;

interface TabButtonProps {
  tab: TabConfig;
  active: boolean;
  isHome?: boolean;
  badgeCount?: number;
}

const TabButton = memo(({ tab, active, isHome, badgeCount = 0 }: TabButtonProps) => {
  const isFav = tab.key === "favorites";
  const progress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(active ? 1 : 0, {
      damping: 15,
      stiffness: 220,
      mass: 0.7,
    });
  }, [active, progress]);

  const bubbleStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.6, 1]) }],
    backgroundColor: isFav ? FAV_COLOR : colors.primary,
  }));

  const shellStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [0, isHome ? -2 : -1]) },
      { scale: interpolate(progress.value, [0, 1], [1, isHome ? 1.08 : 1.04]) },
    ],
  }));

  // Fav tab gets a soft rose tint background even when inactive
  const favRest = useAnimatedStyle(() => ({
    backgroundColor: isFav && !active
      ? FAV_COLOR_LIGHT
      : "transparent",
    borderRadius: 24,
  }));

  const handlePress = () => router.navigate(tab.route as never);

  const iconColor = active
    ? colors.onPrimary
    : isFav
    ? FAV_COLOR
    : colors.outline;

  const iconSize = isHome ? 25 : isFav ? 23 : 22;

  return (
    <AnimatedPressable
      onPress={handlePress}
      haptic="impact"
      scaleTo={0.9}
      accessibilityRole="button"
      accessibilityLabel={tab.key}
      style={[styles.tabButton, isHome && styles.homeButton]}
    >
      <Animated.View style={[styles.iconShell, isHome && styles.homeIconShell, shellStyle]}>
        {/* Soft rose rest-state tint for favorites */}
        {isFav && !isHome ? (
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFillObject, { borderRadius: 24 }, favRest]}
          />
        ) : null}

        {/* Active bubble */}
        <Animated.View
          pointerEvents="none"
          style={[styles.activeBubble, isHome && styles.homeActiveBubble, bubbleStyle]}
        />

        <Ionicons
          name={active ? tab.activeIcon : tab.icon}
          size={iconSize}
          color={iconColor}
        />

        {/* Badge — only cart shows a count; favorites uses the heart icon alone */}
        {tab.key === "cart" && badgeCount > 0 ? (
          <View style={styles.badge}>
            <Animated.Text style={styles.badgeText}>
              {badgeCount > 9 ? "9+" : badgeCount}
            </Animated.Text>
          </View>
        ) : null}
      </Animated.View>

      {/* Label — shown only under the favorites icon */}
      {isFav ? (
        <Animated.Text
          style={[
            styles.favLabel,
            { color: active ? FAV_COLOR : colors.outline, opacity: 0.9 },
          ]}
          numberOfLines={1}
        >
          {active ? "Saved" : "Save"}
        </Animated.Text>
      ) : null}
    </AnimatedPressable>
  );
});
TabButton.displayName = "TabButton";

function FloatingTabBar() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const items = useCartStore((state) => state.items);
  const cartCount = getCartQuantity(items);

  const barWidth = Math.min(width - 32, 420);
  const homeLeft = barWidth / 2 - 32;

  const orders    = tabs[0];
  const favorites = tabs[1];
  const home      = tabs[2];
  const cart      = tabs[3];
  const profile   = tabs[4];

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: Math.max(insets.bottom, 10) + 8 }]}
    >
      <View style={[styles.bar, { width: barWidth }]}>
        <View style={styles.leftSlot}>
          <TabButton tab={orders} active={orders.activePath(pathname)} />
          <TabButton tab={favorites} active={favorites.activePath(pathname)} />
        </View>

        <View style={styles.rightSlot}>
          <TabButton
            tab={cart}
            active={cart.activePath(pathname)}
            badgeCount={cartCount}
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
    height: 76,
    borderRadius: 38,
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
    alignItems: "center",
  },
  homeButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  favLabel: {
    fontFamily: typography.bodyBold,
    fontSize: 9,
    lineHeight: 11,
    marginTop: 2,
    letterSpacing: 0.2,
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
