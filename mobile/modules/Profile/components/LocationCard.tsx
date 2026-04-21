import React, { useMemo, useState } from "react";
import { Linking, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import AppButton from "@/components/ui/AppButton";
import { useAuthT } from "@/hooks/useAppTranslation";
import { useRTL } from "@/hooks/useRTL";

interface LocationCardProps {
  coords: { lat: number; lng: number } | null;
  hasPermission: boolean;
  canAskAgain: boolean;
  isLoading: boolean;
  onAllowLocation: () => void;
  onRefreshLocation: () => void;
}

export default function LocationCard({
  coords,
  hasPermission,
  canAskAgain,
  isLoading,
  onAllowLocation,
  onRefreshLocation,
}: LocationCardProps) {
  const { t } = useAuthT();
  const isRTL = useRTL();
  const textAlign = isRTL ? "right" : "left";
  const rowDirection = isRTL ? "row" : "row-reverse";
  const [mapFailed, setMapFailed] = useState(false);

  const mapUrl = useMemo(() => {
    if (!coords) return null;

    const lat = coords.lat.toFixed(6);
    const lng = coords.lng.toFixed(6);
    return `https://static-maps.yandex.ru/1.x/?lang=en_US&ll=${lng},${lat}&z=15&l=map&size=650,300&pt=${lng},${lat},pm2rdm`;
  }, [coords]);

  return (
    <View
      style={{
        borderRadius: 20,
        padding: 16,
        backgroundColor: "#FFF8F3",
        borderWidth: 1,
        borderColor: "#F6E7DD",
        gap: 14,
      }}
    >
      <View style={{ flexDirection: rowDirection, alignItems: "center", gap: 12 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontFamily: "Cairo_700Bold", fontSize: 15, color: "#1E1E1E", textAlign }}>
            {t("completeProfile.location.title")}
          </Text>
          <Text style={{ fontFamily: "Tajawal_400Regular", fontSize: 12, color: "#767777", textAlign, lineHeight: 20 }}>
            {hasPermission
              ? t("completeProfile.location.body")
              : t("completeProfile.location.permissionBody")}
          </Text>
        </View>

        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: 14,
            backgroundColor: "#FFE6D8",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Ionicons name="location" size={22} color="#F55905" />
        </View>
      </View>

      {coords && mapUrl ? (
        <>
          <View
            style={{
              height: 170,
              borderRadius: 18,
              overflow: "hidden",
              backgroundColor: "#F1E4DA",
              borderWidth: 1,
              borderColor: "#EAD8CC",
            }}
          >
            {!mapFailed ? (
              <Image
                source={{ uri: mapUrl }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
                transition={250}
                cachePolicy="memory-disk"
                onError={() => setMapFailed(true)}
              />
            ) : (
              <View
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: 18,
                  gap: 10,
                  backgroundColor: "#FFF1E8",
                }}
              >
                <Ionicons name="map-outline" size={28} color="#F55905" />
                <Text
                  style={{
                    fontFamily: "Tajawal_400Regular",
                    fontSize: 12,
                    color: "#8A6A58",
                    textAlign: "center",
                    lineHeight: 20,
                  }}
                >
                  {t("completeProfile.location.previewUnavailable")}
                </Text>
              </View>
            )}
          </View>

          <AppButton
            label={t("completeProfile.location.refresh")}
            variant="outline"
            onPress={() => {
              setMapFailed(false);
              onRefreshLocation();
            }}
            loading={isLoading}
            icon={<Ionicons name="locate-outline" size={18} color="#F55905" />}
            iconPosition={isRTL ? "right" : "left"}
          />
        </>
      ) : canAskAgain ? (
        <AppButton
          label={t("completeProfile.location.allow")}
          onPress={onAllowLocation}
          loading={isLoading}
          icon={<Ionicons name="navigate-circle-outline" size={20} color="#fff" />}
          iconPosition={isRTL ? "right" : "left"}
        />
      ) : (
        <View style={{ gap: 10 }}>
          <Text style={{ fontFamily: "Tajawal_400Regular", fontSize: 12, color: "#B45309", textAlign, lineHeight: 20 }}>
            {t("completeProfile.location.denied")}
          </Text>
          <AppButton
            label={t("completeProfile.location.openSettings")}
            variant="outline"
            onPress={() => Linking.openSettings()}
            icon={<Ionicons name="settings-outline" size={18} color="#F55905" />}
            iconPosition={isRTL ? "right" : "left"}
          />
        </View>
      )}
    </View>
  );
}
