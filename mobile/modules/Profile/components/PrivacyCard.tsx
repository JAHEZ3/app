import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthT } from "@/hooks/useAppTranslation";
import { useRTL } from "@/hooks/useRTL";

export default function PrivacyCard() {
  const { t } = useAuthT();
  const isRTL = useRTL();

  return (
    <View
      style={{
        borderRadius: 16,
        padding: 16,
        backgroundColor: "#FFF3EC",
        flexDirection: isRTL ? "row" : "row-reverse",
        alignItems: "flex-start",
        gap: 12,
      }}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ fontFamily: "Cairo_700Bold", fontSize: 14, color: "#1E1E1E", textAlign: isRTL ? "right" : "left" }}>
          {t("completeProfile.privacy.title")}
        </Text>
        <Text style={{ fontFamily: "Tajawal_400Regular", fontSize: 12, color: "#767777", textAlign: isRTL ? "right" : "left", lineHeight: 20 }}>
          {t("completeProfile.privacy.body")}
        </Text>
      </View>

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
    </View>
  );
}
