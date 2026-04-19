import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Carousel from "react-native-reanimated-carousel";
import type { ICarouselInstance } from "react-native-reanimated-carousel";
import { useSharedValue } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import OnboardingSlide from "../components/OnboardingSlide";
import PaginationDots from "../components/PaginationDots";
import AppButton from "../../../components/ui/AppButton";
import { OnboardingSlideData } from "../types";

const { width, height } = Dimensions.get("window");

const SLIDES: OnboardingSlideData[] = [
  {
    id: "1",
    title: "اطلب طعامكَ المفضل\nبكل سهولة",
    description:
      "استمتع بتجربة فريدة لاكتشاف أفضل المطاعم المحلية في غزة، بلمسة واحدة فقط.",
    badge: "أكثر من 50+ مطعم في خدمتك",
    images: {
      primary:
        "https://images.unsplash.com/photo-1526367790999-0150786686a2?w=900&h=1600&fit=crop&crop=center",
      secondary: "",
    },
  },
  {
    id: "2",
    title: "توصيل سريع\nلبابك مباشرة",
    description:
      "نوصّل طلباتك في أسرع وقت ممكن مع تتبّع لحظي لطلبك أينما كنت، في أي وقت تشاء.",
    badge: "توصيل خلال 30 دقيقة",
    images: {
      primary:
        "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=900&h=1600&fit=crop&crop=center",
      secondary: "",
    },
  },
  {
    id: "3",
    title: "أفضل المطاعم\nفي مكان واحد",
    description:
      "اكتشف أشهى الأطباق من أفضل مطاعم غزة، واستمتع بعروض حصرية ووجبات طازجة يومياً.",
    badge: "عروض حصرية كل يوم",
    images: {
      primary:
        "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=900&h=1600&fit=crop&crop=center",
      secondary: "",
    },
  },
];

export default function OnboardingScreen() {
  const carouselRef  = useRef<ICarouselInstance>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const progress     = useSharedValue<number>(0);
  const insets       = useSafeAreaInsets();

  const isLastSlide = currentIndex === SLIDES.length - 1;

  const handleNext = () => {
    if (isLastSlide) {
      router.replace("/login");
    } else {
      carouselRef.current?.scrollTo({ index: currentIndex + 1, animated: true });
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#050505" }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── Full-screen carousel ── */}
      <Carousel
        ref={carouselRef}
        data={SLIDES}
        width={width}
        height={height}
        loop={false}
        onProgressChange={progress}
        onSnapToItem={setCurrentIndex}
        renderItem={({ item, animationValue }) => (
          <OnboardingSlide
            item={item}
            animationValue={animationValue}
            slideHeight={height}
          />
        )}
      />

      {/* ── Floating header (safe area aware) ── */}
      <View
        style={{
          position: "absolute",
          top: insets.top + (Platform.OS === "android" ? 8 : 0),
          left: 0,
          right: 0,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 22,
          paddingVertical: 10,
        }}
      >
        {/* Skip */}
        <TouchableOpacity
          onPress={() => router.replace("/login")}
          style={{
            paddingVertical: 7,
            paddingHorizontal: 14,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.25)",
            backgroundColor: "rgba(0,0,0,0.25)",
          }}
          activeOpacity={0.7}
        >
          <Text
            style={{
              fontFamily: "Tajawal_500Medium",
              fontSize: 13,
              color: "rgba(255,255,255,0.8)",
            }}
          >
            تخطى
          </Text>
        </TouchableOpacity>

        {/* Logo */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text
            style={{ fontFamily: "Cairo_700Bold", fontSize: 24, color: "#ffffff" }}
          >
            جاهز
          </Text>
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: "#F55905",
              marginBottom: 2,
            }}
          />
        </View>
      </View>

      {/* ── Bottom bar ── */}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.92)"]}
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          paddingTop: 32,
          paddingBottom: insets.bottom + 20,
          paddingHorizontal: 24,
          gap: 20,
          alignItems: "center",
        }}
      >
        {/* Pagination */}
        <PaginationDots count={SLIDES.length} progress={progress} />

        {/* CTA button + slide counter */}
        <View style={{ width: "100%", flexDirection: "row", alignItems: "center", gap: 12 }}>
          {/* Slide counter */}
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.18)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                fontFamily: "Cairo_700Bold",
                fontSize: 13,
                color: "rgba(255,255,255,0.55)",
              }}
            >
              {currentIndex + 1}/{SLIDES.length}
            </Text>
          </View>

          {/* Main button */}
          <View style={{ flex: 1 }}>
            <AppButton
              label={isLastSlide ? "ابدأ الآن" : "التالي"}
              onPress={handleNext}
              icon={
                <Ionicons
                  name={isLastSlide ? "checkmark-circle-outline" : "arrow-back"}
                  size={20}
                  color="#fff"
                />
              }
              iconPosition="left"
            />
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}
