import React from "react";
import { View, Text, Dimensions } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { OnboardingSlideData } from "../types";

const { width } = Dimensions.get("window");

interface OnboardingSlideProps {
  item: OnboardingSlideData;
  animationValue: SharedValue<number>;
  slideHeight: number;
}

export default function OnboardingSlide({
  item,
  animationValue,
  slideHeight,
}: OnboardingSlideProps) {

  /* ── parallax: image drifts opposite to scroll direction ── */
  const imageStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      animationValue.value,
      [-1, 0, 1],
      [width * 0.14, 0, -width * 0.14],
      Extrapolation.CLAMP
    );
    return { transform: [{ translateX }] };
  });

  /* ── content fades + rises when the slide is active ── */
  const contentStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      animationValue.value,
      [-0.55, 0, 0.55],
      [0, 1, 0],
      Extrapolation.CLAMP
    );
    const translateY = interpolate(
      animationValue.value,
      [-1, 0, 1],
      [28, 0, 28],
      Extrapolation.CLAMP
    );
    return { opacity, transform: [{ translateY }] };
  });

  /* ── badge moves in from below ── */
  const badgeStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      animationValue.value,
      [-0.4, 0, 0.4],
      [0, 1, 0],
      Extrapolation.CLAMP
    );
    const translateY = interpolate(
      animationValue.value,
      [-1, 0, 1],
      [16, 0, 16],
      Extrapolation.CLAMP
    );
    return { opacity, transform: [{ translateY }] };
  });

  return (
    <View style={{ width, height: slideHeight, overflow: "hidden" }}>

      {/* ── Full-bleed parallax image ── */}
      <Animated.View
        style={[
          imageStyle,
          { position: "absolute", width: width * 1.28, height: "100%", left: -width * 0.14 },
        ]}
      >
        <Image
          source={{ uri: item.images.primary }}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
          transition={400}
        />
      </Animated.View>

      {/* ── Top vignette (header stays readable) ── */}
      <LinearGradient
        colors={["rgba(0,0,0,0.55)", "transparent"]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 160 }}
      />

      {/* ── Bottom gradient (content zone) ── */}
      <LinearGradient
        colors={[
          "transparent",
          "rgba(4,4,4,0.18)",
          "rgba(4,4,4,0.56)",
          "rgba(4,4,4,0.82)",
          "rgba(4,4,4,0.97)",
        ]}
        locations={[0, 0.38, 0.6, 0.78, 1]}
        style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: slideHeight * 0.58 }}
      />

      {/* ── Content ── */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: 28,
          paddingBottom: 170,
        }}
      >
        {/* Badge pill */}
        <Animated.View style={[badgeStyle, { marginBottom: 18 }]}>
          <View
            style={{
              alignSelf: "flex-end",
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "rgba(245,89,5,0.18)",
              borderWidth: 1,
              borderColor: "rgba(245,89,5,0.45)",
              borderRadius: 999,
              paddingHorizontal: 14,
              paddingVertical: 7,
              gap: 7,
            }}
          >
            <View
              style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#F55905" }}
            />
            <Text
              style={{
                fontFamily: "Cairo_700Bold",
                fontSize: 12,
                color: "rgba(255,255,255,0.9)",
              }}
            >
              {item.badge}
            </Text>
          </View>
        </Animated.View>

        {/* Title + description */}
        <Animated.View style={contentStyle}>
          <Text
            style={{
              fontFamily: "Cairo_700Bold",
              fontSize: 34,
              color: "#ffffff",
              textAlign: "right",
              lineHeight: 52,
            }}
          >
            {item.title}
          </Text>
          <Text
            style={{
              fontFamily: "Tajawal_400Regular",
              fontSize: 15,
              color: "rgba(255,255,255,0.62)",
              textAlign: "right",
              lineHeight: 26,
              marginTop: 10,
            }}
          >
            {item.description}
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}
