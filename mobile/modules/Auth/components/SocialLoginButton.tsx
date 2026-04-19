import React from "react";
import { TouchableOpacity, Text, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export type SocialProvider = "google" | "apple" | "facebook";

interface SocialLoginButtonProps {
  provider: SocialProvider;
  onPress?: () => void;
}

const PROVIDER_CONFIG: Record<
  SocialProvider,
  { label: string; icon: string; bgColor: string; textColor: string; borderColor: string }
> = {
  google: {
    label: "جوجل",
    icon: "G",
    bgColor: "#ffffff",
    textColor: "#1E1E1E",
    borderColor: "#e5e5e5",
  },
  apple: {
    label: "آبل",
    icon: "",
    bgColor: "#ffffff",
    textColor: "#1E1E1E",
    borderColor: "#e5e5e5",
  },
  facebook: {
    label: "فيسبوك",
    icon: "f",
    bgColor: "#1877F2",
    textColor: "#ffffff",
    borderColor: "#1877F2",
  },
};

export default function SocialLoginButton({
  provider,
  onPress,
}: SocialLoginButtonProps) {
  const scale = useSharedValue(1);
  const config = PROVIDER_CONFIG[provider];

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedTouchable
      className="flex-1 items-center justify-center py-3.5 rounded-2xl flex-row gap-x-2"
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.94, { damping: 15 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15 });
      }}
      activeOpacity={1}
      style={[
        animStyle,
        {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 6,
          paddingVertical: 14,
          borderRadius: 14,
          backgroundColor: config.bgColor,
          borderWidth: 1,
          borderColor: config.borderColor,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 6,
          elevation: 2,
        },
      ]}
    >
      {/* Icon */}
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: 13,
          backgroundColor:
            provider === "google"
              ? "#F7F7F7"
              : provider === "apple"
                ? "#F7F7F7"
                : "transparent",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {provider === "google" && (
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#4285F4" }}>
            G
          </Text>
        )}
        {provider === "apple" && (
          <Text style={{ fontSize: 16, color: "#1E1E1E" }}>
          </Text>
        )}
        {provider === "facebook" && (
          <Text style={{ fontSize: 15, fontWeight: "900", color: "#ffffff" }}>
            f
          </Text>
        )}
      </View>

      <Text
        style={{
          fontFamily: "Tajawal_500Medium",
          fontSize: 14,
          color: config.textColor,
        }}
      >
        {config.label}
      </Text>
    </AnimatedTouchable>
  );
}
