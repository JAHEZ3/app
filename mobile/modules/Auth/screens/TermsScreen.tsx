import React, { useEffect } from "react";
import { ScrollView, StatusBar, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import AppButton from "@/components/ui/AppButton";
import { useAuthT } from "@/hooks/useAppTranslation";
import { useRTL } from "@/hooks/useRTL";

const ease = Easing.out(Easing.cubic);

function Entry({
  children,
  delay,
}: {
  children: React.ReactNode;
  delay: number;
}) {
  const opacity = useSharedValue(0);
  const y = useSharedValue(18);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 380, easing: ease }));
    y.value = withDelay(delay, withTiming(0, { duration: 380, easing: ease }));
  }, [delay, opacity, y]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}

function AmbientGlow() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.45);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 2800, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
    opacity.value = withRepeat(
      withSequence(withTiming(0.28, { duration: 2800 }), withTiming(0.5, { duration: 2800 })),
      -1,
      true
    );
  }, [opacity, scale]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        style,
        {
          position: "absolute",
          width: 180,
          height: 180,
          borderRadius: 90,
          backgroundColor: "rgba(255,255,255,0.12)",
        },
      ]}
    />
  );
}

export default function TermsScreen() {
  const { t } = useAuthT();
  const isRTL = useRTL();
  const textAlign = isRTL ? "right" : "left";
  const rowDirection = isRTL ? "row-reverse" : "row";
  const termsHighlights = t("terms.highlights", { returnObjects: true }) as string[];
  const sections = t("terms.sections", { returnObjects: true }) as {
    title: string;
    body: string;
  }[];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF8F3" }} edges={["top", "bottom"]}>
      <StatusBar barStyle="light-content" backgroundColor="#1C120D" />

      <LinearGradient
        colors={["#1C120D", "#4A2410", "#F55905"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 320,
        }}
      />

      <View
        style={{
          position: "absolute",
          top: 70,
          alignSelf: "center",
          width: 180,
          height: 180,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <AmbientGlow />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
      >
        <Entry delay={60}>
          <View
            style={{
              flexDirection: rowDirection,
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 26,
            }}
          >
            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.85}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: "rgba(255,255,255,0.16)",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.18)",
              }}
            >
              <Ionicons
                name={isRTL ? "arrow-forward" : "arrow-back"}
                size={20}
                color="#FFFFFF"
              />
            </TouchableOpacity>

            <View style={{ flex: 1, alignItems: isRTL ? "flex-start" : "flex-end" }}>
              <Text
                style={{
                  fontFamily: "Tajawal_400Regular",
                  fontSize: 12,
                  color: "rgba(255,255,255,0.76)",
                  marginBottom: 2,
                }}
              >
                {t("terms.badge")}
              </Text>
              <Text
                style={{
                  fontFamily: "Tajawal_500Medium",
                  fontSize: 12,
                  color: "#FFE1D1",
                }}
              >
                {t("terms.updated")}
              </Text>
            </View>
          </View>
        </Entry>

        <Entry delay={120}>
          <View style={{ marginBottom: 28 }}>
            <Text
              style={{
                fontFamily: "Cairo_700Bold",
                fontSize: 30,
                lineHeight: 40,
                color: "#FFFFFF",
                textAlign,
                marginBottom: 8,
              }}
            >
              {t("terms.title")}
            </Text>
            <Text
              style={{
                fontFamily: "Tajawal_400Regular",
                fontSize: 15,
                lineHeight: 24,
                color: "rgba(255,255,255,0.86)",
                textAlign,
                marginBottom: 14,
              }}
            >
              {t("terms.subtitle")}
            </Text>
            <Text
              style={{
                fontFamily: "Tajawal_500Medium",
                fontSize: 13,
                lineHeight: 22,
                color: "#FFE9DE",
                textAlign,
              }}
            >
              {t("terms.intro")}
            </Text>
          </View>
        </Entry>

        <Entry delay={180}>
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 28,
              padding: 18,
              marginBottom: 18,
              shadowColor: "#24140D",
              shadowOffset: { width: 0, height: 14 },
              shadowOpacity: 0.08,
              shadowRadius: 24,
              elevation: 10,
            }}
          >
            <View
              style={{
                flexDirection: rowDirection,
                alignItems: "center",
                marginBottom: 14,
                gap: 10,
              }}
            >
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  backgroundColor: "#FFF1E8",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="shield-checkmark-outline" size={20} color="#F55905" />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: "Cairo_700Bold",
                    fontSize: 18,
                    color: "#1F1A17",
                    textAlign,
                  }}
                >
                  {t("terms.highlightsTitle")}
                </Text>
              </View>
            </View>

            <View style={{ gap: 12 }}>
              {termsHighlights.map((item, index) => (
                <View
                  key={`${item}-${index}`}
                  style={{
                    flexDirection: rowDirection,
                    alignItems: "flex-start",
                    gap: 12,
                    backgroundColor: "#FFF9F5",
                    borderRadius: 18,
                    paddingHorizontal: 14,
                    paddingVertical: 13,
                  }}
                >
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: "#F55905",
                      alignItems: "center",
                      justifyContent: "center",
                      marginTop: 1,
                    }}
                  >
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  </View>
                  <Text
                    style={{
                      flex: 1,
                      fontFamily: "Tajawal_400Regular",
                      fontSize: 14,
                      lineHeight: 22,
                      color: "#4D4038",
                      textAlign,
                    }}
                  >
                    {item}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </Entry>

        {sections.map((section, index) => (
          <Entry key={section.title} delay={240 + index * 60}>
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 24,
                padding: 18,
                marginBottom: 14,
                borderWidth: 1,
                borderColor: "#F6E7DD",
              }}
            >
              <View
                style={{
                  flexDirection: rowDirection,
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 10,
                }}
              >
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    backgroundColor: "#1F1A17",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Cairo_700Bold",
                      fontSize: 14,
                      color: "#FFFFFF",
                      lineHeight: 18,
                    }}
                  >
                    {index + 1}
                  </Text>
                </View>
                <Text
                  style={{
                    flex: 1,
                    fontFamily: "Cairo_700Bold",
                    fontSize: 17,
                    color: "#1F1A17",
                    textAlign,
                  }}
                >
                  {section.title}
                </Text>
              </View>

              <Text
                style={{
                  fontFamily: "Tajawal_400Regular",
                  fontSize: 14,
                  lineHeight: 24,
                  color: "#5D514B",
                  textAlign,
                }}
              >
                {section.body}
              </Text>
            </View>
          </Entry>
        ))}

        <Entry delay={560}>
          <View
            style={{
              backgroundColor: "#1F1A17",
              borderRadius: 24,
              padding: 18,
              marginTop: 6,
              marginBottom: 16,
            }}
          >
            <Text
              style={{
                fontFamily: "Cairo_700Bold",
                fontSize: 16,
                color: "#FFFFFF",
                textAlign,
                marginBottom: 8,
              }}
            >
              {t("terms.supportTitle")}
            </Text>
            <Text
              style={{
                fontFamily: "Tajawal_400Regular",
                fontSize: 14,
                lineHeight: 22,
                color: "#D9C7BC",
                textAlign,
              }}
            >
              {t("terms.supportBody")}
            </Text>
          </View>
        </Entry>

        <Entry delay={620}>
          <AppButton
            label={t("terms.cta")}
            onPress={() => router.back()}
            icon={
              <Ionicons
                name={isRTL ? "arrow-forward-circle-outline" : "arrow-back-circle-outline"}
                size={22}
                color="#fff"
              />
            }
            iconPosition={isRTL ? "right" : "left"}
          />
        </Entry>
      </ScrollView>
    </SafeAreaView>
  );
}
