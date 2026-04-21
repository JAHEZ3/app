import React, { useEffect, useState } from "react";
import { View, Text, Dimensions, StatusBar } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { router } from "expo-router";
import { useAuthStore } from "@/store/useAuthStore";
import { useOnboardingStore } from "@/store/useOnboardingStore";
import SplashLoadingDots from "../components/SplashLoadingDots";

const { width, height } = Dimensions.get("window");

const HERO =
  "https://images.unsplash.com/photo-1526367790999-0150786686a2?w=900&h=1600&fit=crop&crop=center";

const ease = Easing.out(Easing.cubic);
const gentleLoop = Easing.inOut(Easing.sin);

/* ─── Animated progress bar ─── */
function ProgressBar() {
  const w = useSharedValue(0);
  useEffect(() => {
    w.value = withDelay(800, withTiming(1, { duration: 2000, easing: Easing.out(Easing.quad) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const style = useAnimatedStyle(() => ({ width: `${w.value * 100}%` as any }));
  return (
    <View
      style={{
        width: 120,
        height: 2,
        backgroundColor: "rgba(255,255,255,0.12)",
        borderRadius: 1,
        overflow: "hidden",
      }}
    >
      <Animated.View
        style={[style, { height: "100%", backgroundColor: "#F55905", borderRadius: 1 }]}
      />
    </View>
  );
}

/* ─── Geometric logo mark (no icon libs) ─── */
function LogoMark({ style }: { style?: any }) {
  return (
    <Animated.View style={style}>
      {/* Outer glow ring */}
      <View
        style={{
          position: "absolute",
          width: 106,
          height: 106,
          borderRadius: 53,
          borderWidth: 1,
          borderColor: "rgba(245,89,5,0.35)",
          top: -7,
          left: -7,
        }}
      />
      {/* Main circle */}
      <View
        style={{
          width: 92,
          height: 92,
          borderRadius: 46,
          backgroundColor: "#F55905",
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#F55905",
          shadowOffset: { width: 0, height: 16 },
          shadowOpacity: 0.55,
          shadowRadius: 28,
          elevation: 20,
        }}
      >
        {/* Arabic letter ج styled as logo mark */}
        <Text
          style={{
            fontFamily: "Cairo_700Bold",
            fontSize: 46,
            color: "#fff",
            lineHeight: 52,
            marginTop: 4,
          }}
        >
          ج
        </Text>
      </View>
    </Animated.View>
  );
}

export default function SplashScreen() {
  const status = useAuthStore((state) => state.status);
  const accessToken = useAuthStore((state) => state.accessToken);
  const hasSeenOnboarding = useOnboardingStore((state) => state.hasSeenOnboarding);
  const [onboardingReady, setOnboardingReady] = useState(
    () => useOnboardingStore.persist.hasHydrated()
  );
  /* ── shared values ── */
  const imgOpacity    = useSharedValue(0);
  const markScale     = useSharedValue(0.6);
  const markOpacity   = useSharedValue(0);
  const markFloat     = useSharedValue(0);
  const lineW         = useSharedValue(0);
  const titleOpacity  = useSharedValue(0);
  const titleY        = useSharedValue(24);
  const tagOpacity    = useSharedValue(0);
  const bottomOpacity = useSharedValue(0);
  const dotScale      = useSharedValue(1);

  useEffect(() => {
    // 1. Image fades in
    imgOpacity.value = withTiming(1, { duration: 600, easing: ease });

    // 2. Logo mark pops in
    markOpacity.value = withDelay(300, withTiming(1, { duration: 400, easing: ease }));
    markScale.value   = withDelay(300, withSpring(1, { damping: 11, stiffness: 90 }));

    // 3. Separator line draws
    lineW.value = withDelay(600, withTiming(1, { duration: 420, easing: ease }));

    // 4. Title slides up
    titleOpacity.value = withDelay(720, withTiming(1, { duration: 480, easing: ease }));
    titleY.value       = withDelay(720, withSpring(0, { damping: 14, stiffness: 110 }));

    // 5. Tagline fades
    tagOpacity.value = withDelay(1000, withTiming(1, { duration: 400, easing: ease }));

    // 6. Bottom fades
    bottomOpacity.value = withDelay(1100, withTiming(1, { duration: 400, easing: ease }));

    // 7. Logo floats
    markFloat.value = withDelay(
      900,
      withRepeat(
        withSequence(
          withTiming(-8, { duration: 2000, easing: gentleLoop }),
          withTiming(0,  { duration: 2000, easing: gentleLoop })
        ),
        -1
      )
    );

    // 8. Dot pulse
    dotScale.value = withDelay(
      1200,
      withRepeat(
        withSequence(
          withTiming(1.15, { duration: 900, easing: gentleLoop }),
          withTiming(1,    { duration: 900, easing: gentleLoop })
        ),
        -1
      )
    );

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (useOnboardingStore.persist.hasHydrated()) {
      setOnboardingReady(true);
      return;
    }

    const unsub = useOnboardingStore.persist.onFinishHydration(() => {
      setOnboardingReady(true);
    });

    return unsub;
  }, []);

  useEffect(() => {
    if (!onboardingReady || status === "idle" || status === "loading") {
      return;
    }

    const nextRoute = !hasSeenOnboarding
      ? "/onboarding"
      : accessToken
        ? "/home/Home"
        : "/auth/login";

    const timer = setTimeout(() => router.replace(nextRoute), 3200);
    return () => clearTimeout(timer);
  }, [accessToken, hasSeenOnboarding, onboardingReady, status]);

  /* ── animated styles ── */
  const imgStyle     = useAnimatedStyle(() => ({ opacity: imgOpacity.value }));
  const markStyle    = useAnimatedStyle(() => ({
    opacity: markOpacity.value,
    transform: [{ scale: markScale.value }, { translateY: markFloat.value }],
  }));
  const lineStyle    = useAnimatedStyle(() => ({ width: `${lineW.value * 64}%` as any }));
  const titleStyle   = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));
  const tagStyle     = useAnimatedStyle(() => ({ opacity: tagOpacity.value }));
  const bottomStyle  = useAnimatedStyle(() => ({ opacity: bottomOpacity.value }));

  return (
    <View style={{ flex: 1, backgroundColor: "#050505" }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── Full-screen hero image ── */}
      <Animated.View style={[imgStyle, { ...StyleSheet.absoluteFillObject }]}>
        <Image
          source={{ uri: HERO }}
          style={{ width, height }}
          contentFit="cover"
        />
      </Animated.View>

      {/* ── Multi-stop dark overlay ── */}
      <LinearGradient
        colors={[
          "rgba(5,5,5,0.72)",
          "rgba(5,5,5,0.42)",
          "rgba(5,5,5,0.52)",
          "rgba(5,5,5,0.88)",
        ]}
        locations={[0, 0.28, 0.62, 1]}
        style={{ ...StyleSheet.absoluteFillObject }}
      />

      {/* ── Center content ── */}
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingBottom: 40,
        }}
      >
        {/* Logo mark */}
        <LogoMark style={markStyle} />

        {/* Separator line */}
        <Animated.View
          style={[
            lineStyle,
            {
              height: 1,
              backgroundColor: "rgba(255,255,255,0.2)",
              marginTop: 32,
              marginBottom: 20,
              alignSelf: "center",
            },
          ]}
        />

        {/* App name */}
        <Animated.View style={[titleStyle, { alignItems: "center" }]}>
          <Text
            style={{
              fontFamily: "Cairo_700Bold",
              fontSize: 88,
              color: "#ffffff",
              lineHeight: 96,
              letterSpacing: -1,
            }}
          >
            جاهز
          </Text>
          {/* Accent dot under name */}
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: "#F55905",
              marginTop: -8,
            }}
          />
        </Animated.View>

        {/* Tagline */}
        <Animated.View style={[tagStyle, { marginTop: 18, alignItems: "center", gap: 6 }]}>
          <Text
            style={{
              fontFamily: "Tajawal_400Regular",
              fontSize: 10,
              color: "rgba(255,255,255,0.45)",
              letterSpacing: 5,
              textTransform: "uppercase",
            }}
          >
            CULINARY · DELIVERY
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginTop: 2,
            }}
          >
            <View style={{ width: 20, height: 0.5, backgroundColor: "rgba(255,255,255,0.2)" }} />
            <Text
              style={{
                fontFamily: "Tajawal_400Regular",
                fontSize: 9,
                color: "rgba(255,255,255,0.25)",
                letterSpacing: 4,
                textTransform: "uppercase",
              }}
            >
              GAZA · PALESTINE
            </Text>
            <View style={{ width: 20, height: 0.5, backgroundColor: "rgba(255,255,255,0.2)" }} />
          </View>
        </Animated.View>
      </View>

      {/* ── Bottom bar ── */}
      <Animated.View
        style={[
          bottomStyle,
          {
            position: "absolute",
            bottom: 52,
            left: 0,
            right: 0,
            alignItems: "center",
            gap: 14,
          },
        ]}
      >
        <SplashLoadingDots />
        <ProgressBar />
      </Animated.View>
    </View>
  );
}

/* inline StyleSheet helper so no extra import needed */
const StyleSheet = {
  absoluteFillObject: {
    position: "absolute" as const,
    top: 0, left: 0, right: 0, bottom: 0,
  },
};
