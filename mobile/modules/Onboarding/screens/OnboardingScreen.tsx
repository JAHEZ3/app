import React, { useRef, useState } from "react";
import { View, Text, TouchableOpacity, Dimensions, StatusBar } from "react-native";
import Carousel from "react-native-reanimated-carousel";
import type { ICarouselInstance } from "react-native-reanimated-carousel";
import { useSharedValue } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
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
        "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&h=500&fit=crop&crop=center",
      secondary:
        "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=400&fit=crop&crop=center",
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
        "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&h=500&fit=crop&crop=center",
      secondary:
        "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=400&fit=crop&crop=center",
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
        "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500&h=500&fit=crop&crop=center",
      secondary:
        "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&h=400&fit=crop&crop=center",
    },
  },
];

export default function OnboardingScreen() {
  const carouselRef = useRef<ICarouselInstance>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const progress = useSharedValue<number>(0);

  const isLastSlide = currentIndex === SLIDES.length - 1;

  const handleNext = () => {
    if (isLastSlide) {
      router.replace("/login");
    } else {
      carouselRef.current?.scrollTo({
        index: currentIndex + 1,
        animated: true,
      });
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />

      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingTop: 4,
          paddingBottom: 8,
        }}
      >
        <TouchableOpacity
          onPress={() => router.replace("/login")}
          style={{ paddingVertical: 6, paddingHorizontal: 4 }}
        >
          <Text
            style={{
              fontFamily: "Tajawal_500Medium",
              fontSize: 15,
              color: "#767777",
            }}
          >
            تخطى
          </Text>
        </TouchableOpacity>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text
            style={{ fontFamily: "Cairo_700Bold", fontSize: 22, color: "#F55905" }}
          >
            جهز
          </Text>
          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              backgroundColor: "#F55905",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="close" size={16} color="#fff" />
          </View>
        </View>
      </View>

      {/* Carousel */}
      <View style={{ flex: 1 }}>
        <Carousel
          ref={carouselRef}
          data={SLIDES}
          width={width}
          height={height * 0.62}
          loop={false}
          onProgressChange={progress}
          onSnapToItem={(index) => setCurrentIndex(index)}
          renderItem={({ item, animationValue }) => (
            <OnboardingSlide item={item} animationValue={animationValue} />
          )}
        />
      </View>

      {/* Bottom */}
      <View style={{ paddingHorizontal: 24, paddingBottom: 32, gap: 20 }}>
        <View style={{ alignItems: "center" }}>
          <PaginationDots count={SLIDES.length} progress={progress} />
        </View>

        <AppButton
          label={isLastSlide ? "ابدأ الآن" : "التالي"}
          onPress={handleNext}
          icon={
            <Ionicons
              name={isLastSlide ? "rocket-outline" : "arrow-back"}
              size={20}
              color="#fff"
            />
          }
          iconPosition="left"
        />
      </View>
    </SafeAreaView>
  );
}
