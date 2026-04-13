import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import FormField from "../components/FormField";
import PrivacyCard from "../components/PrivacyCard";
import AppButton from "../../../components/ui/AppButton";

const ease = Easing.out(Easing.cubic);

/* ─── Single subtle pulsing ring ─── */
function PhotoRing() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.45);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.07, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
        withTiming(1.0, { duration: 2400, easing: Easing.inOut(Easing.sin) })
      ),
      -1
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.18, { duration: 2400 }),
        withTiming(0.45, { duration: 2400 })
      ),
      -1
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        style,
        {
          position: "absolute",
          width: 116,
          height: 116,
          borderRadius: 58,
          borderWidth: 2,
          borderColor: "#F55905",
        },
      ]}
    />
  );
}

/* ─── Fade + subtle slide row ─── */
function Row({ children, delay }: { children: React.ReactNode; delay: number }) {
  const opacity = useSharedValue(0);
  const y = useSharedValue(10);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 320, easing: ease }));
    y.value = withDelay(delay, withTiming(0, { duration: 320, easing: ease }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

/* ─── Main screen ─── */
export default function CompleteProfileScreen() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthday, setBirthday] = useState("");

  const pageOpacity = useSharedValue(0);
  const photoScale = useSharedValue(0.9);

  useEffect(() => {
    pageOpacity.value = withTiming(1, { duration: 300, easing: ease });
    photoScale.value = withDelay(
      100,
      withTiming(1, { duration: 350, easing: ease })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pageStyle = useAnimatedStyle(() => ({ opacity: pageOpacity.value }));
  const photoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: photoScale.value }],
  }));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />

      {/* ── Header ── */}
      <Animated.View
        style={[
          pageStyle,
          {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingTop: 4,
            paddingBottom: 12,
          },
        ]}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text
            style={{ fontFamily: "Cairo_700Bold", fontSize: 16, color: "#1E1E1E" }}
          >
            إكمال الملف الشخصي
          </Text>
          <Ionicons name="arrow-forward" size={17} color="#F55905" />
        </View>
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Photo ── */}
          <View style={{ alignItems: "center", paddingTop: 20, paddingBottom: 24 }}>
            <View
              style={{
                width: 120,
                height: 120,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <PhotoRing />

              <Animated.View style={photoStyle}>
                {/* Shadow wrapper */}
                <View
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: 50,
                    shadowColor: "#F55905",
                    shadowOffset: { width: 0, height: 5 },
                    shadowOpacity: 0.2,
                    shadowRadius: 12,
                    elevation: 8,
                    backgroundColor: "#fff",
                  }}
                >
                  <View
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: 50,
                      overflow: "hidden",
                      borderWidth: 2.5,
                      borderColor: "#fff",
                    }}
                  >
                    <Image
                      source={{
                        uri: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face",
                      }}
                      style={{ width: "100%", height: "100%" }}
                      contentFit="cover"
                    />
                  </View>
                </View>

                {/* Edit badge */}
                <View
                  style={{
                    position: "absolute",
                    bottom: 2,
                    left: 2,
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: "#F55905",
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 2,
                    borderColor: "#fff",
                  }}
                >
                  <Ionicons name="pencil" size={12} color="#fff" />
                </View>
              </Animated.View>
            </View>

            {/* Change link */}
            <Row delay={280}>
              <TouchableOpacity
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  marginTop: 10,
                }}
              >
                <Ionicons name="camera-outline" size={13} color="#F55905" />
                <Text
                  style={{
                    fontFamily: "Tajawal_400Regular",
                    fontSize: 13,
                    color: "#F55905",
                    textDecorationLine: "underline",
                  }}
                >
                  تغيير الصورة الشخصية
                </Text>
              </TouchableOpacity>
            </Row>
          </View>

          {/* ── Form ── */}
          <View style={{ paddingHorizontal: 24, gap: 18 }}>
            <Row delay={340}>
              <FormField
                label="الاسم الأول"
                placeholder="أدخل اسمك الأول"
                value={firstName}
                onChangeText={setFirstName}
              />
            </Row>

            <Row delay={400}>
              <FormField
                label="اسم العائلة"
                placeholder="أدخل اسم العائلة"
                value={lastName}
                onChangeText={setLastName}
              />
            </Row>

            <Row delay={460}>
              <FormField
                label="تاريخ الميلاد"
                placeholder="يوم / شهر / سنة"
                value={birthday}
                onChangeText={setBirthday}
                keyboardType="numeric"
                iconName="calendar-outline"
                onIconPress={() => {}}
              />
            </Row>

            <Row delay={520}>
              <PrivacyCard />
            </Row>

            <Row delay={580}>
              <AppButton
                label="حفظ ومتابعة"
                onPress={() => {}}
                icon={
                  <Ionicons name="arrow-back-circle-outline" size={22} color="#fff" />
                }
                iconPosition="left"
              />
            </Row>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
