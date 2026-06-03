import React, { memo, useCallback, useEffect } from "react";
import { Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { colors } from "@/components/ui/theme";

const PARTICLE_COUNT = 6;
const PARTICLE_DISTANCE = 22;

interface FavoriteButtonProps {
  favorited: boolean;
  onToggle: () => void;
  disabled?: boolean;
  /** "overlay" sits on the hero image; "plain" for light backgrounds. */
  variant?: "overlay" | "plain";
  size?: number;
}

/**
 * A single, premium favourite toggle. On activation the heart springs with a
 * pop, a glow ring pulses outward and a ring of particles bursts and fades —
 * the kind of micro-interaction top food apps use to make saving feel good.
 *
 * This is intentionally the ONLY favourite control on the restaurant screen.
 */
function Particle({
  angle,
  progress,
}: {
  angle: number;
  progress: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    const p = progress.value;
    const dist = PARTICLE_DISTANCE * p;
    return {
      transform: [
        { translateX: Math.cos(angle) * dist },
        { translateY: Math.sin(angle) * dist },
        { scale: 0.4 + (1 - Math.abs(p - 0.5) * 2) * 0.9 },
      ],
      opacity: p === 0 || p >= 1 ? 0 : 1,
    };
  });
  return <Animated.View style={[styles.particle, style]} />;
}

function FavoriteButtonBase({
  favorited,
  onToggle,
  disabled = false,
  variant = "overlay",
  size = 22,
}: FavoriteButtonProps) {
  const scale = useSharedValue(1);
  const glow = useSharedValue(0);
  const burst = useSharedValue(0);
  const mountedFav = useSharedValue(favorited);

  // Burst only when transitioning into the favorited state (not on mount).
  useEffect(() => {
    if (favorited && !mountedFav.value) {
      scale.value = withSequence(
        withSpring(1.32, { damping: 5, stiffness: 360 }),
        withSpring(1, { damping: 9, stiffness: 240 }),
      );
      glow.value = withSequence(
        withTiming(1, { duration: 180, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 360, easing: Easing.in(Easing.quad) }),
      );
      burst.value = 0;
      burst.value = withDelay(
        40,
        withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }),
      );
    } else if (!favorited && mountedFav.value) {
      scale.value = withSequence(
        withSpring(0.84, { damping: 9, stiffness: 320 }),
        withSpring(1, { damping: 10, stiffness: 240 }),
      );
    }
    mountedFav.value = favorited;
  }, [favorited, burst, glow, scale, mountedFav]);

  useEffect(
    () => () => {
      cancelAnimation(scale);
      cancelAnimation(glow);
      cancelAnimation(burst);
    },
    [burst, glow, scale],
  );

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value * 0.7,
    transform: [{ scale: 0.6 + glow.value * 1.1 }],
  }));

  const pressScale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const handlePress = useCallback(() => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    onToggle();
  }, [disabled, onToggle]);

  const isOverlay = variant === "overlay";
  const heartColor = favorited
    ? colors.primary
    : isOverlay
      ? colors.onPrimary
      : colors.onSurface;

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={() => {
        pressScale.value = withSpring(0.86, { damping: 18, stiffness: 280 });
      }}
      onPressOut={() => {
        pressScale.value = withSpring(1, { damping: 14, stiffness: 220 });
      }}
      disabled={disabled}
      hitSlop={10}
    >
      <Animated.View
        style={[
          styles.button,
          { width: size + 20, height: size + 20, borderRadius: (size + 20) / 2 },
          isOverlay ? styles.overlay : styles.plain,
          favorited && (isOverlay ? styles.overlayActive : styles.plainActive),
          pressStyle,
        ]}
      >
        {/* Glow ring pulse */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.glow,
            { width: size + 20, height: size + 20, borderRadius: (size + 20) / 2 },
            glowStyle,
          ]}
        />

        {/* Particle burst */}
        {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
          <Particle
            key={i}
            angle={(i / PARTICLE_COUNT) * Math.PI * 2}
            progress={burst}
          />
        ))}

        <Animated.View style={heartStyle}>
          <Ionicons
            name={favorited ? "heart" : "heart-outline"}
            size={size}
            color={heartColor}
          />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
  },
  overlay: {
    backgroundColor: "rgba(20,20,20,0.42)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  overlayActive: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderColor: "rgba(245,89,5,0.25)",
  },
  plain: {
    backgroundColor: colors.card,
  },
  plainActive: {
    backgroundColor: colors.faintPrimary,
  },
  glow: {
    position: "absolute",
    backgroundColor: colors.primary,
  },
  particle: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
});

export default memo(FavoriteButtonBase);
