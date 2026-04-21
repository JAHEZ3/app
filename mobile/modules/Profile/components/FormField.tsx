import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, TextInputProps } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useRTL } from "@/hooks/useRTL";

interface FormFieldProps extends Omit<TextInputProps, "style"> {
  label: string;
  placeholder: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  onIconPress?: () => void;
}

export default function FormField({
  label,
  placeholder,
  iconName,
  onIconPress,
  value,
  onChangeText,
  keyboardType,
  ...rest
}: FormFieldProps) {
  const isRTL = useRTL();
  const [focused, setFocused] = useState(false);
  const borderAnim = useSharedValue(0);

  const containerStyle = useAnimatedStyle(() => ({
    borderColor: withTiming(borderAnim.value === 1 ? "#F55905" : "#eeeeee", { duration: 200 }),
    borderWidth: borderAnim.value === 1 ? 1.5 : 1,
  }));

  const textAlign = isRTL ? "right" : "left";

  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontFamily: "Cairo_700Bold", fontSize: 14, color: "#1E1E1E", textAlign }}>
        {label}
      </Text>

      <Animated.View
        style={[
          containerStyle,
          { borderRadius: 14, backgroundColor: "#F7F7F7", flexDirection: "row", alignItems: "center", overflow: "hidden" },
        ]}
      >
        {iconName && !isRTL && (
          <TouchableOpacity onPress={onIconPress} style={{ paddingLeft: 14 }} disabled={!onIconPress}>
            <Ionicons name={iconName} size={20} color={focused ? "#F55905" : "#b0b0b0"} />
          </TouchableOpacity>
        )}

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#b0b0b0"
          keyboardType={keyboardType}
          onFocus={() => { setFocused(true); borderAnim.value = 1; }}
          onBlur={() => { setFocused(false); borderAnim.value = 0; }}
          style={{
            flex: 1,
            fontFamily: "Tajawal_400Regular",
            fontSize: 15,
            color: "#1E1E1E",
            paddingVertical: 16,
            paddingHorizontal: 16,
            textAlign,
          }}
          {...rest}
        />

        {iconName && isRTL && (
          <TouchableOpacity onPress={onIconPress} style={{ paddingRight: 14 }} disabled={!onIconPress}>
            <Ionicons name={iconName} size={20} color={focused ? "#F55905" : "#b0b0b0"} />
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
}
