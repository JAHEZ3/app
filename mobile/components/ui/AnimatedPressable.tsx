import React, { useCallback } from "react";
import {
  GestureResponderEvent,
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

type HapticFeedback = "none" | "selection" | "impact";

interface AnimatedPressableProps
  extends Omit<PressableProps, "children" | "style" | "onPressIn" | "onPressOut"> {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  disabledStyle?: StyleProp<ViewStyle>;
  scaleTo?: number;
  haptic?: HapticFeedback;
}

const runHaptic = (mode: HapticFeedback) => {
  if (mode === "none") return;
  if (mode === "impact") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    return;
  }
  Haptics.selectionAsync().catch(() => undefined);
};

export default function AnimatedPressable({
  children,
  style,
  containerStyle,
  disabledStyle,
  disabled,
  scaleTo = 0.97,
  haptic = "selection",
  onPress,
  ...rest
}: AnimatedPressableProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    if (disabled) return;
    scale.value = withSpring(scaleTo, { damping: 18, stiffness: 260 });
  }, [disabled, scale, scaleTo]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 16, stiffness: 220 });
  }, [scale]);

  const handlePress = useCallback(
    (event: GestureResponderEvent) => {
      if (disabled) return;
      runHaptic(haptic);
      onPress?.(event);
    },
    [disabled, haptic, onPress],
  );

  return (
    <Pressable
      {...rest}
      disabled={disabled}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={containerStyle}
    >
      <Animated.View style={[style, animatedStyle, disabled && disabledStyle]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
