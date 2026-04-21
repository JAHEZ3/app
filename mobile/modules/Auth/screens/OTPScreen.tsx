import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import OTPInput from "../components/OTPInput";
import AppButton from "../../../components/ui/AppButton";
import { useVerify } from "../hooks/useVerify";
import { useVerifyLogin } from "../hooks/useVerifyLogin";
import { useResendOtp } from "../hooks/useResendOtp";
import { usePhoneNumber } from "@/store/usePhoneNumber";
import { mapAuthError } from "../utils/mapAuthError";
import { useAuthT } from "@/hooks/useAppTranslation";
import { useRTL } from "@/hooks/useRTL";

const RESEND_SECONDS = 120;
const ease = Easing.bezier(0.22, 1, 0.36, 1);
const gentleLoop = Easing.inOut(Easing.sin);

function Row({ children, delay }: { children: React.ReactNode; delay: number }) {
  const opacity = useSharedValue(0);
  const y = useSharedValue(14);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 520, easing: ease }));
    y.value = withDelay(delay, withTiming(0, { duration: 520, easing: ease }));
  }, [opacity, y, delay]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

function OTPIcon() {
  const glowOpacity = useSharedValue(0.18);
  const glowScale = useSharedValue(0.92);
  const iconOpacity = useSharedValue(0);
  const iconScale = useSharedValue(0.92);

  useEffect(() => {
    iconOpacity.value = withTiming(1, { duration: 520, easing: ease });
    iconScale.value = withTiming(1, { duration: 620, easing: ease });
    glowOpacity.value = withDelay(
      250,
      withRepeat(withTiming(0.3, { duration: 2400, easing: gentleLoop }), -1, true)
    );
    glowScale.value = withDelay(
      250,
      withRepeat(withTiming(1.04, { duration: 2400, easing: gentleLoop }), -1, true)
    );
  }, [glowOpacity, glowScale, iconOpacity, iconScale]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));
  const iconStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity.value,
    transform: [{ scale: iconScale.value }],
  }));

  return (
    <View style={{ alignItems: "center", justifyContent: "center", width: 88, height: 88 }}>
      <Animated.View
        style={[glowStyle, { position: "absolute", width: 88, height: 88, borderRadius: 44, backgroundColor: "#F55905" }]}
      />
      <Animated.View
        style={[
          iconStyle,
          {
            width: 72, height: 72, borderRadius: 36,
            backgroundColor: "#F55905",
            alignItems: "center", justifyContent: "center",
            shadowColor: "#F55905",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
          },
        ]}
      >
        <Ionicons name="chatbubble-ellipses" size={30} color="#fff" />
      </Animated.View>
    </View>
  );
}

function Countdown({ seconds, onExpire, label }: { seconds: number; onExpire: () => void; label: string }) {
  const [left, setLeft] = useState(seconds);

  useEffect(() => {
    if (left <= 0) { onExpire(); return; }
    const timer = setTimeout(() => setLeft((p) => p - 1), 1000);
    return () => clearTimeout(timer);
  }, [left, onExpire]);

  const m = useMemo(() => Math.floor(left / 60), [left]);
  const s = useMemo(() => left % 60, [left]);

  if (left <= 0) return null;

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
      <Ionicons name="time-outline" size={14} color="#767777" />
      <Text style={{ fontFamily: "Tajawal_400Regular", fontSize: 13, color: "#767777" }}>
        {label}{" "}
        <Text style={{ fontFamily: "Cairo_700Bold", color: "#F55905" }}>
          {m}:{String(s).padStart(2, "0")}
        </Text>
      </Text>
    </View>
  );
}

export default function OTPScreen() {
  const { t } = useAuthT();
  const isRTL = useRTL();

  const [otpCode, setOtpCode] = useState("");
  const [canResend, setCanResend] = useState(false);
  const [resendKey, setResendKey] = useState(0);

  const { phoneNumber, authMode } = usePhoneNumber();

  const registerVerify = useVerify();
  const loginVerify = useVerifyLogin();
  const { mutateAsync: verify, isPending, isError, error } =
    authMode === "login" ? loginVerify : registerVerify;

  const { mutateAsync: resendOtp, isPending: isResending, error: resendError } = useResendOtp();

  const headerOpacity = useSharedValue(0);
  const headerY = useSharedValue(-8);

  useEffect(() => {
    headerOpacity.value = withTiming(1, { duration: 420, easing: ease });
    headerY.value = withTiming(0, { duration: 420, easing: ease });
  }, [headerOpacity, headerY]);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerY.value }],
  }));

  const handleVerify = useCallback(async (code?: string) => {
    try {
      await verify({ otp: code ?? otpCode, phone: phoneNumber });
    } catch {
      // error displayed via isError
    }
  }, [otpCode, phoneNumber, verify]);

  const handleResend = useCallback(async () => {
    try {
      await resendOtp(phoneNumber);
      setOtpCode("");
      setCanResend(false);
      setResendKey((k) => k + 1);
    } catch {
      // error displayed via resendError
    }
  }, [phoneNumber, resendOtp]);

  const backIcon = isRTL ? "arrow-forward" : "arrow-back";
  const align = isRTL ? "flex-end" : "flex-start";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <Animated.View
          style={[
            headerStyle,
            {
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 20,
              paddingTop: 8,
              paddingBottom: 12,
            },
          ]}
        >
          {!isRTL && (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#F7F7F7", alignItems: "center", justifyContent: "center" }}
            >
              <Ionicons name={backIcon} size={20} color="#1E1E1E" />
            </TouchableOpacity>
          )}

          <Text style={{ fontFamily: "Cairo_700Bold", fontSize: 17, color: "#1E1E1E" }}>
            {t("otp.headerTitle")}
          </Text>

          {isRTL ? (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#F7F7F7", alignItems: "center", justifyContent: "center" }}
            >
              <Ionicons name={backIcon} size={20} color="#1E1E1E" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </Animated.View>

        <View style={{ flex: 1, paddingHorizontal: 24 }}>
          <Row delay={80}>
            <View style={{ alignItems: "center", marginTop: 20, marginBottom: 24 }}>
              <OTPIcon />
            </View>
          </Row>

          <Row delay={150}>
            <Text style={{ fontFamily: "Cairo_700Bold", fontSize: 22, color: "#1E1E1E", textAlign: "center", marginBottom: 6 }}>
              {t("otp.title")}
            </Text>
          </Row>

          <Row delay={210}>
            <View style={{ alignItems: "center", marginBottom: 28 }}>
              <Text style={{ fontFamily: "Tajawal_400Regular", fontSize: 14, color: "#767777", textAlign: "center", lineHeight: 22 }}>
                {t("otp.subtitle")}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 }}>
                {!isRTL && <Ionicons name="phone-portrait" size={14} color="#F55905" />}
                <Text style={{ fontFamily: "Cairo_700Bold", fontSize: 15, color: "#1E1E1E" }}>
                  {phoneNumber}
                </Text>
                {isRTL && <Ionicons name="phone-portrait" size={14} color="#F55905" />}
              </View>
            </View>
          </Row>

          <Row delay={280}>
            <OTPInput key={resendKey} onComplete={handleVerify} onChangeValue={setOtpCode} />
            {isError && (
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, marginTop: 10 }}>
                <Ionicons name="alert-circle" size={14} color="#E53935" />
                <Text style={{ fontFamily: "Tajawal_400Regular", fontSize: 13, color: "#E53935" }}>
                  {mapAuthError(error)}
                </Text>
              </View>
            )}
          </Row>

          <Row delay={360}>
            <View style={{ alignItems: "center", marginTop: 20, minHeight: 30 }}>
              {canResend ? (
                <View style={{ alignItems: "center", gap: 8 }}>
                  <TouchableOpacity
                    onPress={handleResend}
                    disabled={isResending}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 20,
                      borderWidth: 1.5,
                      borderColor: isResending ? "#ccc" : "#F55905",
                      opacity: isResending ? 0.6 : 1,
                    }}
                  >
                    <Ionicons name="refresh" size={14} color={isResending ? "#ccc" : "#F55905"} />
                    <Text style={{ fontFamily: "Tajawal_500Medium", fontSize: 14, color: isResending ? "#ccc" : "#F55905" }}>
                      {isResending ? t("otp.sending") : t("otp.resend")}
                    </Text>
                  </TouchableOpacity>
                  {resendError && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                      <Ionicons name="alert-circle" size={13} color="#E53935" />
                      <Text style={{ fontFamily: "Tajawal_400Regular", fontSize: 12, color: "#E53935" }}>
                        {mapAuthError(resendError)}
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                <Countdown
                  key={resendKey}
                  seconds={RESEND_SECONDS}
                  onExpire={() => setCanResend(true)}
                  label={t("otp.resendPrefix")}
                />
              )}
            </View>
          </Row>

          <Row delay={420}>
            <View style={{ marginTop: 28 }}>
              <AppButton
                label={t("otp.submit")}
                onPress={() => handleVerify()}
                disabled={otpCode.length < 6 || isPending}
                icon={<Ionicons name="checkmark-circle-outline" size={22} color="#fff" />}
                iconPosition={isRTL ? "left" : "right"}
              />
            </View>
          </Row>

          <Row delay={480}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, marginTop: 14 }}>
              <Ionicons name="shield-checkmark-outline" size={13} color="#c0c0c0" />
              <Text style={{ fontFamily: "Tajawal_400Regular", fontSize: 12, color: "#c0c0c0" }}>
                {t("otp.securityNote")}
              </Text>
            </View>
          </Row>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
