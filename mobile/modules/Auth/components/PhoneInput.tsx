import React, { useState } from "react";
import { View, TextInput, TouchableOpacity } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

interface PhoneInputProps {
  value: string;
  onChangeText: (text: string) => void;
}

export default function PhoneInput({ value, onChangeText }: PhoneInputProps) {
  const [focused, setFocused] = useState(false);
  const borderAnim = useSharedValue(0);

  const handleFocus = () => {
    setFocused(true);
    borderAnim.value = withTiming(1, { duration: 200 });
  };
  const handleBlur = () => {
    setFocused(false);
    borderAnim.value = withTiming(0, { duration: 200 });
  };

  const containerStyle = useAnimatedStyle(() => ({
    borderColor: borderAnim.value === 1 ? "#F55905" : "#eeeeee",
    borderWidth: borderAnim.value === 1 ? 1.5 : 1,
  }));

  return (
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
      {/* Phone number text input */}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="رقم الجوال"
        placeholderTextColor="#b0b0b0"
        keyboardType="phone-pad"
        onFocus={handleFocus}
        onBlur={handleBlur}
        style={{
          flex: 1,
          fontFamily: "Tajawal_400Regular",
          fontSize: 16,
          color: "#1E1E1E",
          paddingVertical: 16,
          paddingHorizontal: 16,
          textAlign: "right",
        }}
      />

      {/* Divider */}
      <View
        style={{ width: 1, height: 28, backgroundColor: "#e5e5e5", marginHorizontal: 2 }}
      />

      {/* Country code */}
      <TouchableOpacity
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 12,
          gap: 6,
        }}
        activeOpacity={0.7}
      >
        {/* Palestinian flag placeholder using colored square */}
        <View
          style={{
            width: 22,
            height: 16,
            borderRadius: 3,
            backgroundColor: "#239B56",
            overflow: "hidden",
            borderWidth: 0.5,
            borderColor: "#ddd",
          }}
        />
        <Ionicons name="chevron-down" size={12} color="#767777" />
        <Ionicons name="call-outline" size={14} color="#F55905" />
        <Animated.Text
          style={{
            fontFamily: "Tajawal_500Medium",
            fontSize: 14,
            color: "#1E1E1E",
          }}
        >
          +970
        </Animated.Text>
      </TouchableOpacity>
    </Animated.View>
  );
}
