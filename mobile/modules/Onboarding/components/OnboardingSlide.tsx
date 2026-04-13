import React from "react";
import { View, Text, Dimensions, Image } from "react-native";
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { OnboardingSlideData } from "../types";

const { width, height } = Dimensions.get("window");

const SEC_SIZE = width * 0.42;
const PRI_SIZE = width * 0.52;

interface OnboardingSlideProps {
  item: OnboardingSlideData;
  animationValue: SharedValue<number>;
}

/* ─── Image with detached shadow ─── */
function CircularImage({
  uri,
  size,
  shadowOpacity = 0.2,
}: {
  uri: string;
  size: number;
  shadowOpacity?: number;
}) {
  return (
    /* Shadow lives here — no overflow:hidden */
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity,
        shadowRadius: 20,
        elevation: 14,
        backgroundColor: "#fff", // required for Android elevation
      }}
    >
      {/* Clip lives here — separate from shadow */}
      <View
        style={{
          width: "100%",
          height: "100%",
          borderRadius: size / 2,
          overflow: "hidden",
        }}
      >
        <Image
          source={{ uri }}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
        />
      </View>
    </View>
  );
}

export default function OnboardingSlide({ item, animationValue }: OnboardingSlideProps) {
  const containerStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      animationValue.value,
      [-1, 0, 1],
      [0.93, 1, 0.93],
      Extrapolation.CLAMP
    );
    const opacity = interpolate(
      animationValue.value,
      [-0.7, 0, 0.7],
      [0.65, 1, 0.65],
      Extrapolation.CLAMP
    );
    return { transform: [{ scale }], opacity };
  });

  const primaryStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      animationValue.value,
      [-1, 0, 1],
      [50, 0, -50],
      Extrapolation.CLAMP
    );
    return { transform: [{ translateX }] };
  });

  const secondaryStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      animationValue.value,
      [-1, 0, 1],
      [-50, 0, 50],
      Extrapolation.CLAMP
    );
    return { transform: [{ translateX }] };
  });

  const textStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      animationValue.value,
      [-1, 0, 1],
      [20, 0, 20],
      Extrapolation.CLAMP
    );
    const opacity = interpolate(
      animationValue.value,
      [-0.4, 0, 0.4],
      [0, 1, 0],
      Extrapolation.CLAMP
    );
    return { transform: [{ translateY }], opacity };
  });

  return (
    <Animated.View style={[containerStyle, { width, flex: 1 }]}>

      {/* ── Images area ── */}
      <View style={{ height: height * 0.44, position: "relative" }}>

        {/* Secondary (back-left) */}
        <Animated.View
          style={[
            secondaryStyle,
            {
              position: "absolute",
              left: width * 0.04,
              bottom: 24,
              zIndex: 1,
            },
          ]}
        >
          <CircularImage uri={item.images.secondary} size={SEC_SIZE} shadowOpacity={0.16} />
        </Animated.View>

        {/* Primary (front-right) */}
        <Animated.View
          style={[
            primaryStyle,
            {
              position: "absolute",
              right: width * 0.04,
              top: 16,
              zIndex: 2,
            },
          ]}
        >
          <CircularImage uri={item.images.primary} size={PRI_SIZE} shadowOpacity={0.22} />
        </Animated.View>

        {/* Badge */}
        <Animated.View
          style={[
            primaryStyle,
            {
              position: "absolute",
              bottom: 10,
              right: width * 0.06,
              zIndex: 3,
            },
          ]}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#fff",
              borderRadius: 999,
              paddingHorizontal: 12,
              paddingVertical: 8,
              gap: 8,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 10,
              elevation: 6,
            }}
          >
            {/* Avatar dots */}
            <View style={{ flexDirection: "row" }}>
              {["#FF9F43", "#54A0FF", "#5F27CD"].map((color, idx) => (
                <View
                  key={idx}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: color,
                    borderWidth: 1.5,
                    borderColor: "#fff",
                    marginLeft: idx > 0 ? -6 : 0,
                  }}
                />
              ))}
            </View>
            <Text
              style={{
                fontFamily: "Cairo_700Bold",
                fontSize: 11,
                color: "#1E1E1E",
              }}
            >
              {item.badge}
            </Text>
          </View>
        </Animated.View>
      </View>

      {/* ── Text ── */}
      <Animated.View style={[textStyle, { paddingHorizontal: 28, paddingTop: 20 }]}>
        <Text
          style={{
            fontFamily: "Cairo_700Bold",
            fontSize: 30,
            color: "#1E1E1E",
            textAlign: "right",
            lineHeight: 46,
          }}
        >
          {item.title}
        </Text>
        <Text
          style={{
            fontFamily: "Tajawal_400Regular",
            fontSize: 15,
            color: "#767777",
            textAlign: "right",
            lineHeight: 24,
            marginTop: 12,
          }}
        >
          {item.description}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}
