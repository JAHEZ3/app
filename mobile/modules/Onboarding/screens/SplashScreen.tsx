import React, { useEffect } from "react";
import { View, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  Easing,
  withSequence,
  withRepeat,
} from "react-native-reanimated";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import SplashLoadingDots from "../components/SplashLoadingDots";

export default function SplashScreen() {
  const iconScale = useSharedValue(0);
  const iconRotate = useSharedValue(-20);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(30);
  const subtitleOpacity = useSharedValue(0);
  const bottomOpacity = useSharedValue(0);
  const iconFloat = useSharedValue(0);

  useEffect(() => {
    iconScale.value = withDelay(200, withSpring(1, { damping: 12, stiffness: 100 }));
    iconRotate.value = withDelay(200, withSpring(0, { damping: 10, stiffness: 80 }));

    titleOpacity.value = withDelay(600, withTiming(1, { duration: 600 }));
    titleTranslateY.value = withDelay(600, withSpring(0, { damping: 15, stiffness: 120 }));

    subtitleOpacity.value = withDelay(900, withTiming(1, { duration: 500 }));
    bottomOpacity.value = withDelay(1100, withTiming(1, { duration: 500 }));

    iconFloat.value = withDelay(
      800,
      withRepeat(
        withSequence(
          withTiming(-10, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.sin) })
        ),
        -1
      )
    );

    const timer = setTimeout(() => {
      router.replace("/onboarding");
    }, 3000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: iconScale.value },
      { rotate: `${iconRotate.value}deg` },
      { translateY: iconFloat.value },
    ],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));

  const bottomStyle = useAnimatedStyle(() => ({
    opacity: bottomOpacity.value,
  }));

  return (
    <View style={{ flex: 1, backgroundColor: "#FAF8F5", alignItems: "center", justifyContent: "center" }}>

      {/* Icon */}
      <Animated.View style={[iconStyle, { marginBottom: 32 }]}>
        <View
          style={{
            width: 112,
            height: 112,
            borderRadius: 28,
            backgroundColor: "#F55905",
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#F55905",
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.4,
            shadowRadius: 22,
            elevation: 16,
          }}
        >
          <Ionicons name="rocket" size={54} color="#fff" />
        </View>
      </Animated.View>

      {/* Logo text */}
      <Animated.View style={[titleStyle, { alignItems: "center" }]}>
        <Text
          style={{
            fontFamily: "Cairo_700Bold",
            fontSize: 72,
            color: "#F55905",
            lineHeight: 80,
          }}
        >
          جَهَز
        </Text>
        <View
          style={{
            width: 48,
            height: 4,
            borderRadius: 2,
            backgroundColor: "#F55905",
            marginTop: 4,
            marginBottom: 16,
          }}
        />
      </Animated.View>

      {/* Tagline */}
      <Animated.View style={subtitleStyle}>
        <Text
          style={{
            fontFamily: "Tajawal_400Regular",
            fontSize: 11,
            color: "#767777",
            letterSpacing: 4,
            textTransform: "uppercase",
          }}
        >
          CULINARY EDITORIAL DELIVERY
        </Text>
      </Animated.View>

      {/* Bottom section */}
      <Animated.View
        style={[
          bottomStyle,
          { position: "absolute", bottom: 60, alignItems: "center", gap: 12 },
        ]}
      >
        <SplashLoadingDots />

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <MaterialCommunityIcons name="silverware-fork-knife" size={18} color="#b0b0b0" />
          <Text
            style={{
              fontFamily: "Tajawal_400Regular",
              fontSize: 14,
              color: "#767777",
            }}
          >
            جاري التحميل...
          </Text>
        </View>

        <Text
          style={{
            fontFamily: "Cairo_700Bold",
            fontSize: 28,
            color: "#E8E4E0",
            letterSpacing: 8,
          }}
        >
          GAZA
        </Text>
      </Animated.View>
    </View>
  );
}
