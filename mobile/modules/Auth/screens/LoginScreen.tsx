import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
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
import LanguageSwitcher from "@/components/ui/LanguageSwitcher";
import { LinearGradient } from "expo-linear-gradient";
import { useRegister } from "../hooks/useRegister";
import { useLogin } from "../hooks/useLogin";
import { mapAuthError } from "../utils/mapAuthError";
import type { AuthMode } from "@/store/usePhoneNumber";
import { useAuthT } from "@/hooks/useAppTranslation";
import { useRTL } from "@/hooks/useRTL";

const { height } = Dimensions.get("window");

const HERO =
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=900&h=700&fit=crop&crop=center";

const ease = Easing.out(Easing.cubic);

function Row({ children, delay }: { children: React.ReactNode; delay: number }) {
  const opacity = useSharedValue(0);
  const y = useSharedValue(10);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 320, easing: ease }));
    y.value = withDelay(delay, withTiming(0, { duration: 320, easing: ease }));
  }, [opacity, y, delay]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

export default function LoginScreen() {
  const { t } = useAuthT();
  const isRTL = useRTL();

  const [phone, setPhone] = useState("");
  const [mode, setMode] = useState<AuthMode>("login");

  const { mutateAsync: register, isPending: isRegistering, isError: isRegisterError, error: registerError } = useRegister();
  const { mutateAsync: login, isPending: isLoggingIn, isError: isLoginError, error: loginError } = useLogin();

  const isPending = mode === "login" ? isLoggingIn : isRegistering;
  const isError = mode === "login" ? isLoginError : isRegisterError;
  const error = mode === "login" ? loginError : registerError;

  const isPhoneValid = phone.replace(/^\+\d{3}/, "").length === 9;

  async function handleSubmit() {
    try {
      if (mode === "login") {
        await login(phone);
      } else {
        await register(phone);
      }
    } catch {
      // error state handled via isError
    }
  }

  const heroOpacity = useSharedValue(0);
  const cardY = useSharedValue(40);
  const cardOpacity = useSharedValue(0);

  useEffect(() => {
    heroOpacity.value = withTiming(1, { duration: 500, easing: ease });
    cardOpacity.value = withDelay(180, withTiming(1, { duration: 380, easing: ease }));
    cardY.value = withDelay(180, withTiming(0, { duration: 380, easing: ease }));
  }, [heroOpacity, cardOpacity, cardY]);

  const heroStyle = useAnimatedStyle(() => ({ opacity: heroOpacity.value }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardY.value }],
  }));

  const align = isRTL ? "flex-end" : "flex-start";
  const textAlign = isRTL ? "right" : "left";

  return (
    <View style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <Animated.View style={[heroStyle, { height: height * 0.5, overflow: "hidden" }]}>
        <Image
          source={{ uri: HERO }}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
          transition={500}
        />
        <View
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(10,10,10,0.35)",
          }}
        />
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
          style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 220 }}
        />

        <View
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0, bottom: 80,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
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
            <Text style={{ fontFamily: "Cairo_700Bold", fontSize: 36, color: "#fff", lineHeight: 42, marginTop: 4 }}>
              ج
            </Text>
          </View>

          <Text style={{ fontFamily: "Cairo_700Bold", fontSize: 48, color: "#fff", lineHeight: 54 }}>
            جاهز
          </Text>

          <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#F55905", marginTop: 2, marginBottom: 10 }} />

          <Text style={{ fontFamily: "Tajawal_400Regular", fontSize: 10, color: "rgba(255,255,255,0.55)", letterSpacing: 4, textTransform: "uppercase" }}>
            CULINARY · DELIVERY
          </Text>
        </View>

        <View style={{ position: "absolute", top: 52, right: 20 }}>
          <LanguageSwitcher />
        </View>
      </Animated.View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
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
          <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 4 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "#e5e5e5" }} />
          </View>

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 36 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Mode tabs */}
            <Row delay={200}>
              <View
                style={{
                  flexDirection: "row",
                  backgroundColor: "#F5F5F5",
                  borderRadius: 16,
                  padding: 4,
                  marginTop: 14,
                  marginBottom: 20,
                }}
              >
                {(["login", "register"] as AuthMode[]).map((tab) => {
                  const active = mode === tab;
                  return (
                    <TouchableOpacity
                      key={tab}
                      onPress={() => setMode(tab)}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 13,
                        alignItems: "center",
                        backgroundColor: active ? "#fff" : "transparent",
                        shadowColor: active ? "#000" : "transparent",
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: active ? 0.06 : 0,
                        shadowRadius: 4,
                        elevation: active ? 2 : 0,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: active ? "Cairo_700Bold" : "Tajawal_400Regular",
                          fontSize: 14,
                          color: active ? "#F55905" : "#767777",
                        }}
                      >
                        {t(`tabs.${tab}`)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Row>

            <Row delay={260}>
              <Text style={{ fontFamily: "Cairo_700Bold", fontSize: 24, color: "#1E1E1E", textAlign, marginBottom: 4 }}>
                {t(mode === "login" ? "phone.loginTitle" : "phone.registerTitle")}
              </Text>
            </Row>

            {/* Subtitle */}
            <Row delay={320}>
              <Text
                style={{
                  fontFamily: "Tajawal_400Regular",
                  fontSize: 14,
                  color: "#767777",
                  textAlign,
                  lineHeight: 22,
                  marginBottom: 22,
                }}
              >
                {t(mode === "login" ? "phone.loginSubtitle" : "phone.registerSubtitle")}
              </Text>
            </Row>

            <Row delay={380}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: align, gap: 5, marginBottom: 10 }}>
                {!isRTL && <Ionicons name="phone-portrait-outline" size={15} color="#F55905" />}
                <Text style={{ fontFamily: "Cairo_700Bold", fontSize: 14, color: "#1E1E1E" }}>
                  {t("phone.label")}
                </Text>
                {isRTL && <Ionicons name="phone-portrait-outline" size={15} color="#F55905" />}
              </View>
            </Row>

            {/* Input */}
            <Row delay={420}>
              <PhoneInput value={phone} onChangeText={setPhone} />
              {isError && (
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: align, gap: 4, marginTop: 6 }}>
                  {!isRTL && <Ionicons name="alert-circle" size={14} color="#E53935" />}
                  <Text style={{ fontFamily: "Tajawal_400Regular", fontSize: 12, color: "#E53935", textAlign }}>
                    {mapAuthError(error as Error)}
                  </Text>
                  {isRTL && <Ionicons name="alert-circle" size={14} color="#E53935" />}
                </View>
              )}
            </Row>

            {/* CTA */}
            <Row delay={480}>
              <View style={{ marginTop: 18 }}>
                <AppButton
                  label={t("phone.sendCode")}
                  icon={<Ionicons name="arrow-back-circle-outline" size={22} color="#fff" />}
                  iconPosition="left"
                  onPress={handleSubmit}
                  disabled={isPending || !isPhoneValid}
                />
              </View>
            </Row>

            {/* Security row */}
            <Row delay={540}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 18 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: "#eeeeee" }} />
                <Ionicons name="lock-closed-outline" size={13} color="#c0c0c0" />
                <Text style={{ fontFamily: "Tajawal_400Regular", fontSize: 12, color: "#c0c0c0" }}>
                  {t("phone.security")}
                </Text>
                <View style={{ flex: 1, height: 1, backgroundColor: "#eeeeee" }} />
              </View>
            </Row>

            <Row delay={580}>
              <Text style={{ fontFamily: "Tajawal_400Regular", fontSize: 12, color: "#767777", textAlign: "center", lineHeight: 20 }}>
                {t("phone.termsPrefix")}
                <Text
                  onPress={() => router.push("/auth/terms")}
                  style={{ color: "#F55905", textDecorationLine: "underline" }}
                >
                  {t("phone.termsLink")}
                </Text>
              </Text>
            </Row>

            <Row delay={620}>
              <View style={{ marginTop: 16 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <View style={{ flex: 1, height: 1, backgroundColor: "#eeeeee" }} />
                  <Text style={{ fontFamily: "Tajawal_400Regular", fontSize: 12, color: "#c0c0c0" }}>
                    OR
                  </Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: "#eeeeee" }} />
                </View>

                <TouchableOpacity
                  onPress={() => router.push("/delivery" as never)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    borderWidth: 1.5,
                    borderColor: "#F55905",
                    borderRadius: 9999,
                    paddingVertical: 14,
                    paddingHorizontal: 20,
                  }}
                >
                  <Ionicons name="bicycle" size={20} color="#F55905" />
                  <Text style={{ fontFamily: "Tajawal_500Medium", fontSize: 15, color: "#F55905" }}>
                    {t("phone.becomeDeliveryAgent")}
                  </Text>
                </TouchableOpacity>
              </View>
            </Row>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}
