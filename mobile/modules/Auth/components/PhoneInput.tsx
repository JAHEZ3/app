import React, { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  Modal,
  Pressable,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useAuthT } from "@/hooks/useAppTranslation";
import { useRTL } from "@/hooks/useRTL";

const COUNTRIES = [
  { code: "+970", label: "فلسطين — غزة / الضفة", flag: "🇵🇸" },
  { code: "+972", label: "فلسطين — شبكات أخرى", flag: "🇵🇸" },
];

interface PhoneInputProps {
  value: string;
  onChangeText: (text: string) => void;
}

export default function PhoneInput({ value, onChangeText }: PhoneInputProps) {
  const { t } = useAuthT();
  const isRTL = useRTL();

  const [error, setError] = useState<string | null>(null);
  const [countryCode, setCountryCode] = useState("+970");
  const [pickerOpen, setPickerOpen] = useState(false);

  const borderAnim = useSharedValue(0);
  const chevronRot = useSharedValue(0);

  const openPicker = () => {
    setPickerOpen(true);
    chevronRot.value = withTiming(1, { duration: 200 });
  };

  const closePicker = () => {
    setPickerOpen(false);
    chevronRot.value = withTiming(0, { duration: 200 });
  };

  const selectCode = (code: string) => {
    setCountryCode(code);
    const cleaned = value.replace(/^\+\d+/, "").replace(/[^0-9]/g, "").replace(/^0+/, "");
    onChangeText(`${code}${cleaned}`);
    closePicker();
  };

  const toE164 = (phone: string) => {
    const cleaned = phone.replace(/[^0-9]/g, "").replace(/^0+/, "");
    return { cleaned, full: `${countryCode}${cleaned}` };
  };

  const validatePhone = (text: string) => {
    const { cleaned, full } = toE164(text);
    onChangeText(full);
    if (cleaned.length === 0) { setError(null); return; }
    if (cleaned.length !== 9) {
      setError(t("phone.error"));
    } else {
      setError(null);
    }
  };

  const handleFocus = () => {
    borderAnim.value = withTiming(1, { duration: 200 });
  };

  const handleBlur = () => {
    borderAnim.value = withTiming(0, { duration: 200 });
    const cleaned = value.replace(countryCode, "").replace(/[^0-9]/g, "");
    if (cleaned.length > 0 && cleaned.length !== 9) {
      setError(t("phone.error"));
    }
  };

  const containerStyle = useAnimatedStyle(() => ({
    borderColor: error ? "#FF3B30" : borderAnim.value === 1 ? "#F55905" : "#eeeeee",
    borderWidth: error ? 1.5 : borderAnim.value === 1 ? 1.5 : 1,
  }));

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRot.value * 180}deg` }],
  }));

  const displayValue = value.replace(countryCode, "").replace(/[^0-9]/g, "");
  const textAlign = isRTL ? "right" : "left";

  return (
    <View>
      <Animated.View
        style={[
          containerStyle,
          {
            borderRadius: 14,
            backgroundColor: "#F7F7F7",
            flexDirection: "row",
            alignItems: "center",
            overflow: "hidden",
          },
        ]}
      >
        <TextInput
          value={displayValue}
          onChangeText={validatePhone}
          placeholder={t("phone.placeholder")}
          placeholderTextColor="#b0b0b0"
          keyboardType="phone-pad"
          onFocus={handleFocus}
          onBlur={handleBlur}
          maxLength={10}
          style={{
            flex: 1,
            fontFamily: "Tajawal_400Regular",
            fontSize: 16,
            color: "#1E1E1E",
            paddingVertical: 16,
            paddingHorizontal: 16,
            textAlign,
          }}
        />

        <View style={{ width: 1, height: 28, backgroundColor: "#e5e5e5", marginHorizontal: 2 }} />

        <TouchableOpacity
          onPress={openPicker}
          activeOpacity={0.7}
          style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, gap: 5 }}
        >
          <Text style={{ fontSize: 22 }}>🇵🇸</Text>
          <Animated.View style={chevronStyle}>
            <Ionicons name="chevron-down" size={12} color="#767777" />
          </Animated.View>
          <Ionicons name="call-outline" size={14} color="#F55905" />
          <Animated.Text style={{ fontFamily: "Tajawal_500Medium", fontSize: 14, color: "#1E1E1E" }}>
            {countryCode}
          </Animated.Text>
        </TouchableOpacity>
      </Animated.View>

      {error && (
        <Text
          style={{
            color: "#FF3B30",
            fontSize: 12,
            marginTop: 6,
            fontFamily: "Tajawal_400Regular",
            textAlign,
          }}
        >
          {error}
        </Text>
      )}

      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={closePicker}>
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}
          onPress={closePicker}
        >
          <Pressable
            style={{
              backgroundColor: "#fff",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingTop: 14,
              paddingBottom: 36,
              paddingHorizontal: 20,
            }}
            onPress={() => {}}
          >
            <View style={{ alignItems: "center", marginBottom: 16 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "#e5e5e5" }} />
            </View>

            <Text
              style={{
                fontFamily: "Cairo_700Bold",
                fontSize: 16,
                color: "#1E1E1E",
                textAlign: "center",
                marginBottom: 18,
              }}
            >
              {t("phone.countryPickerTitle")}
            </Text>

            {COUNTRIES.map((c) => {
              const selected = c.code === countryCode;
              return (
                <TouchableOpacity
                  key={c.code}
                  onPress={() => selectCode(c.code)}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    borderRadius: 14,
                    marginBottom: 8,
                    backgroundColor: selected ? "#FFF3EE" : "#F7F7F7",
                    borderWidth: selected ? 1.5 : 1,
                    borderColor: selected ? "#F55905" : "#eeeeee",
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Text style={{ fontSize: 26 }}>🇵🇸</Text>
                    <View>
                      <Text style={{ fontFamily: "Cairo_700Bold", fontSize: 15, color: selected ? "#F55905" : "#1E1E1E" }}>
                        {c.code}
                      </Text>
                      <Text style={{ fontFamily: "Tajawal_400Regular", fontSize: 12, color: "#767777" }}>
                        {c.label}
                      </Text>
                    </View>
                  </View>
                  {selected && <Ionicons name="checkmark-circle" size={20} color="#F55905" />}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
