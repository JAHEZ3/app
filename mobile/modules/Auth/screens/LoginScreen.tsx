import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import PhoneInput from "../components/PhoneInput";
import AppButton from "../../../components/ui/AppButton";
import { LinearGradient } from "expo-linear-gradient";
import { useRegister } from "../hooks/useRegister";
import { usePhoneNumber } from "@/store/usePhoneNumber";
import { mapAuthError } from "../utils/mapAuthError";

const { height } = Dimensions.get("window");

const HERO =
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=900&h=700&fit=crop&crop=center";

const ease = Easing.out(Easing.cubic);

/* ─── Fade + tiny slide-up row ─── */
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

export default function LoginScreen() {
  const [phone, setPhone] = useState("");
  const { mutateAsync: register, isPending, isError, error } = useRegister();
  const isPhoneValid = phone.replace(/^\+\d{3}/, "").length === 9;
  const { setPhoneNumber, phoneNumber } = usePhoneNumber();

  async function handleThePhoneRegister() {
    try {
      await register(phone);
      setPhoneNumber(phone);
      router.push("/auth/otp");
    } catch {
      // error displayed via isError state below
    }
  }

  const heroOpacity = useSharedValue(0);
  const cardY = useSharedValue(40);
  const cardOpacity = useSharedValue(0);


  useEffect(() => {
    heroOpacity.value = withTiming(1, { duration: 500, easing: ease });
    cardOpacity.value = withDelay(180, withTiming(1, { duration: 380, easing: ease }));
    cardY.value = withDelay(180, withTiming(0, { duration: 380, easing: ease }));
  }, []);

  const heroStyle = useAnimatedStyle(() => ({ opacity: heroOpacity.value }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardY.value }],
  }));

  return (
    <View style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── Hero ── */}
      <Animated.View style={[heroStyle, { height: height * 0.5, overflow: "hidden" }]}>
        <Image
          source={{ uri: HERO }}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
          transition={500}
        />
        {/* Overlay */}
        <View
          style={{
            position: "absolute",
            inset: 0,
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(10,10,10,0.35)",
          }}
        />
        {/* Bottom fade */}
        {/* Smooth multi-stop bottom shadow */}
        <LinearGradient
          colors={[
            "transparent",
            "rgba(0,0,0,0.04)",
            "rgba(0,0,0,0.12)",
            "rgba(0,0,0,0.26)",
            "rgba(0,0,0,0.44)",
            "rgba(0,0,0,0.62)",
            "rgba(0,0,0,0.78)",
          ]}
          locations={[0, 0.15, 0.32, 0.50, 0.68, 0.84, 1]}
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 220,
          }}
        />

        {/* Logo */}
        <View
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0, bottom: 80,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Circle mark */}
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: "#F55905",
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#F55905",
              shadowOffset: { width: 0, height: 14 },
              shadowOpacity: 0.5,
              shadowRadius: 22,
              elevation: 14,
              marginBottom: 14,
            }}
          >
            <Text
              style={{
                fontFamily: "Cairo_700Bold",
                fontSize: 36,
                color: "#fff",
                lineHeight: 42,
                marginTop: 4,
              }}
            >
              ج
            </Text>
          </View>

          {/* App name */}
          <Text style={{ fontFamily: "Cairo_700Bold", fontSize: 48, color: "#fff", lineHeight: 54 }}>
            جاهز
          </Text>

          {/* Orange accent dot */}
          <View
            style={{
              width: 7,
              height: 7,
              borderRadius: 3.5,
              backgroundColor: "#F55905",
              marginTop: 2,
              marginBottom: 10,
            }}
          />

          <Text
            style={{
              fontFamily: "Tajawal_400Regular",
              fontSize: 10,
              color: "rgba(255,255,255,0.55)",
              letterSpacing: 4,
              textTransform: "uppercase",
            }}
          >
            CULINARY · DELIVERY
          </Text>
        </View>
      </Animated.View>

      {/* ── Card ── */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <Animated.View
          style={[
            cardStyle,
            {
              flex: 1,
              backgroundColor: "#fff",
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.07,
              shadowRadius: 20,
              elevation: 16,
            },
          ]}
        >
          {/* Handle */}
          <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 4 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "#e5e5e5" }} />
          </View>

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 36 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Title */}
            <Row delay={260}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: 10,
                  marginTop: 8,
                  marginBottom: 4,
                }}
              >
                <Text
                  style={{ fontFamily: "Cairo_700Bold", fontSize: 24, color: "#1E1E1E" }}
                >
                  تسجيل الدخول
                </Text>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: "#F55905",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="arrow-back" size={18} color="#fff" />
                </View>
              </View>
            </Row>

            {/* Subtitle */}
            <Row delay={320}>
              <Text
                style={{
                  fontFamily: "Tajawal_400Regular",
                  fontSize: 14,
                  color: "#767777",
                  textAlign: "right",
                  lineHeight: 22,
                  marginBottom: 22,
                }}
              >
                أدخل رقم جوالك لإرسال رمز التحقق
              </Text>
            </Row>

            {/* Label */}
            <Row delay={380}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: 5,
                  marginBottom: 10,
                }}
              >
                <Text
                  style={{ fontFamily: "Cairo_700Bold", fontSize: 14, color: "#1E1E1E" }}
                >
                  رقم الجوال
                </Text>
                <Ionicons name="phone-portrait-outline" size={15} color="#F55905" />
              </View>
            </Row>

            {/* Input */}
            <Row delay={420}>
              <PhoneInput value={phone} onChangeText={setPhone} />
              {isError && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: 4,
                    marginTop: 6,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Tajawal_400Regular",
                      fontSize: 12,
                      color: "#E53935",
                      textAlign: "right",
                    }}
                  >
                    {mapAuthError(error as Error)}
                  </Text>
                  <Ionicons name="alert-circle" size={14} color="#E53935" />
                </View>
              )}
            </Row>

            {/* CTA */}
            <Row delay={480}>
              <View style={{ marginTop: 18 }}>
                <AppButton
                  label="إرسال رمز التحقق"
                  icon={
                    <Ionicons name="arrow-back-circle-outline" size={22} color="#fff" />
                  }
                  iconPosition="left"
                  onPress={handleThePhoneRegister}
                  disabled={isPending || !isPhoneValid}
                />
              </View>
            </Row>

            {/* Security row */}
            <Row delay={540}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  marginVertical: 18,
                }}
              >
                <View style={{ flex: 1, height: 1, backgroundColor: "#eeeeee" }} />
                <Ionicons name="lock-closed-outline" size={13} color="#c0c0c0" />
                <Text
                  style={{
                    fontFamily: "Tajawal_400Regular",
                    fontSize: 12,
                    color: "#c0c0c0",
                  }}
                >
                  بياناتك محمية وآمنة
                </Text>
                <View style={{ flex: 1, height: 1, backgroundColor: "#eeeeee" }} />
              </View>
            </Row>

            {/* Terms */}
            <Row delay={580}>
              <Text
                style={{
                  fontFamily: "Tajawal_400Regular",
                  fontSize: 12,
                  color: "#767777",
                  textAlign: "center",
                  lineHeight: 20,
                }}
              >
                بإنشاء حساب، أنت توافق على{" "}
                <Text style={{ color: "#F55905", textDecorationLine: "underline" }}>
                  الشروط والأحكام
                </Text>
              </Text>
            </Row>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}
