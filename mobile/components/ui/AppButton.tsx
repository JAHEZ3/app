import React, { useEffect } from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  TouchableOpacityProps,
  View,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

type Variant = "primary" | "outline" | "ghost";

interface AppButtonProps extends TouchableOpacityProps {
  label: string;
  variant?: Variant;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
}

export default function AppButton({
  label,
  variant = "primary",
  loading = false,
  icon,
  iconPosition = "right",
  fullWidth = true,
  style,
  disabled,
  onPress,
  ...rest
}: AppButtonProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  // Reactively update opacity when disabled/loading changes
  useEffect(() => {
    opacity.value = withTiming(disabled || loading ? 0.4 : 1, { duration: 200 });
  }, [disabled, loading, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    if (disabled || loading) return;
    scale.value = withSpring(0.96, { damping: 15 });
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  const containerClass = [
    "flex-row items-center justify-center rounded-full py-4 px-8",
    fullWidth ? "w-full" : "",
    variant === "primary"
      ? "bg-primary"
      : variant === "outline"
        ? "border-2 border-primary bg-transparent"
        : "bg-transparent",
  ]
    .filter(Boolean)
    .join(" ");

  const textClass = [
    "font-body-medium text-base",
    variant === "primary" ? "text-on-primary" : "text-primary",
  ].join(" ");

  return (
    <AnimatedTouchable
      style={[animatedStyle, style]}
      className={containerClass}
      onPress={disabled || loading ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      activeOpacity={1}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "primary" ? "#ffffff" : "#F55905"}
          size="small"
        />
      ) : (
        <View className="flex-row items-center gap-x-2">
          {icon && iconPosition === "left" && icon}
          <Text className={textClass}>{label}</Text>
          {icon && iconPosition === "right" && icon}
        </View>
      )}
    </AnimatedTouchable>
  );
}
