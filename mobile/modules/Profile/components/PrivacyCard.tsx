import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function PrivacyCard() {
  return (
    <View
      style={{
        borderRadius: 16,
        padding: 16,
        backgroundColor: "#FFF3EC",
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
      }}
    >
      {/* Shield icon */}
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          backgroundColor: "#FFE0CC",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Ionicons name="shield-checkmark" size={22} color="#F55905" />
      </View>

      {/* Text */}
      <View style={{ flex: 1, gap: 4 }}>
        <Text
          style={{
            fontFamily: "Cairo_700Bold",
            fontSize: 14,
            color: "#1E1E1E",
            textAlign: "right",
          }}
        >
          خصوصيتك تهمنا
        </Text>
        <Text
          style={{
            fontFamily: "Tajawal_400Regular",
            fontSize: 12,
            color: "#767777",
            textAlign: "right",
            lineHeight: 20,
          }}
        >
          نستخدم هذه المعلومات لتحسين تجربة التسوق الخاصة بك وتقديم عروض
          مخصصة تليق بذائقتك الفريدة.
        </Text>
      </View>
    </View>
  );
}
