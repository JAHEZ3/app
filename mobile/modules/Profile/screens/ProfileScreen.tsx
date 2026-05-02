import React, { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { ProtectedRoute } from "@/hooks/useProtectedRoute";
import { useProfileT } from "@/hooks/useAppTranslation";
import { useGetProfile } from "../hooks/useGetProfile";
import { useLogout } from "@/modules/Auth/hooks/useLogout";
import { decodeJwtPayload } from "@/modules/Auth/utils/decodeToken";
import { useAuthStore } from "@/store/useAuthStore";
import { useLanguageStore } from "@/store/useLanguageStore";
import AnimatedPressable from "@/components/ui/AnimatedPressable";
import FloatingTabBar from "@/components/ui/FloatingTabBar";
import { colors, radii, screen, shadows, typography } from "@/components/ui/theme";
import type { SupportedLanguage } from "@/lib/i18n";

function FadeInView({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);

  React.useEffect(() => {
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: 360, easing: Easing.out(Easing.cubic) }),
    );
    translateY.value = withDelay(
      delay,
      withTiming(0, { duration: 360, easing: Easing.out(Easing.cubic) }),
    );
  }, [delay, opacity, translateY]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}

function initialsForName(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "J";
}

function ActionRow({
  icon,
  label,
  value,
  tone = "default",
  loading,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  tone?: "default" | "danger";
  loading?: boolean;
  onPress: () => void;
}) {
  const iconColor = tone === "danger" ? colors.error : colors.primary;
  const iconBg = tone === "danger" ? "rgba(176,37,0,0.1)" : colors.faintPrimary;

  return (
    <AnimatedPressable onPress={onPress} disabled={loading} style={styles.actionRow}>
      <View style={[styles.actionIcon, { backgroundColor: iconBg }]}>
        {loading ? (
          <ActivityIndicator size="small" color={iconColor} />
        ) : (
          <Ionicons name={icon} size={19} color={iconColor} />
        )}
      </View>
      <View style={styles.actionCopy}>
        <Text style={[styles.actionLabel, tone === "danger" && styles.dangerText]}>
          {label}
        </Text>
        {value ? <Text style={styles.actionValue}>{value}</Text> : null}
      </View>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={tone === "danger" ? colors.error : colors.outline}
      />
    </AnimatedPressable>
  );
}

function ProfileScreenContent() {
  const { t } = useProfileT();
  const { data: profile, isLoading } = useGetProfile();
  const accessToken = useAuthStore((state) => state.accessToken);
  const { language, isChanging, setLanguage } = useLanguageStore();
  const { mutate: logout, isPending: isLoggingOut } = useLogout();

  const payload = useMemo(() => {
    if (!accessToken) return null;
    try {
      return decodeJwtPayload(accessToken);
    } catch {
      return null;
    }
  }, [accessToken]);

  const fullName = useMemo(() => {
    const parts = [profile?.firstName, profile?.lastName]
      .map((part) => part?.trim())
      .filter(Boolean);
    return parts.length ? parts.join(" ") : t("user.fallbackName");
  }, [profile?.firstName, profile?.lastName, t]);

  const subInfo = payload?.phone ?? t("user.fallbackInfo");
  const initials = initialsForName(fullName);
  const nextLanguage: SupportedLanguage = language === "ar" ? "en" : "ar";
  const currentLanguageLabel = language === "ar" ? t("language.arabic") : t("language.english");

  const handleLanguagePress = useCallback(async () => {
    if (isChanging) return;
    await setLanguage(nextLanguage);
  }, [isChanging, nextLanguage, setLanguage]);

  const handleLogout = useCallback(() => {
    Alert.alert(t("logout.confirmTitle"), t("logout.confirmMessage"), [
      { text: t("logout.cancel"), style: "cancel" },
      {
        text: t("logout.confirm"),
        style: "destructive",
        onPress: () => logout(),
      },
    ]);
  }, [logout, t]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <FadeInView>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{t("title")}</Text>
              <Text style={styles.subtitle}>{t("subtitle")}</Text>
            </View>
            <View style={styles.headerIcon}>
              <Ionicons name="person-outline" size={20} color={colors.primary} />
            </View>
          </View>
        </FadeInView>

        <FadeInView delay={80}>
          <View style={styles.profileCard}>
            <View style={styles.profileShape} />
            <LinearGradient
              colors={["#FF7A1A", colors.primary]}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>{initials}</Text>
            </LinearGradient>

            <View style={styles.profileCopy}>
              {isLoading ? (
                <>
                  <View style={styles.nameSkeleton} />
                  <View style={styles.infoSkeleton} />
                </>
              ) : (
                <>
                  <Text style={styles.profileName} numberOfLines={1}>
                    {fullName}
                  </Text>
                  <View style={styles.profileSubRow}>
                    <Ionicons name="call-outline" size={14} color={colors.outline} />
                    <Text style={styles.profileSubInfo} numberOfLines={1}>
                      {subInfo}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>
        </FadeInView>

        <FadeInView delay={150}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("settings.title")}</Text>
            <View style={styles.actionsCard}>
              <ActionRow
                icon="language-outline"
                label={t("settings.language")}
                value={`${t("language.current")}: ${currentLanguageLabel}`}
                loading={isChanging}
                onPress={handleLanguagePress}
              />
            </View>
          </View>
        </FadeInView>

        <FadeInView delay={220}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("account.title")}</Text>
            <View style={styles.actionsCard}>
              <ActionRow
                icon="log-out-outline"
                label={t("account.logout")}
                tone="danger"
                loading={isLoggingOut}
                onPress={handleLogout}
              />
            </View>
          </View>
        </FadeInView>
      </ScrollView>

      <FloatingTabBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scroll: {
    paddingBottom: screen.bottomTabSpace + 20,
  },
  header: {
    paddingHorizontal: screen.horizontal,
    paddingTop: 10,
    paddingBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    fontFamily: typography.headline,
    color: colors.onSurface,
    fontSize: 28,
    lineHeight: 35,
  },
  subtitle: {
    marginTop: 2,
    fontFamily: typography.bodyMedium,
    color: colors.outline,
    fontSize: 13,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.faintPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  profileCard: {
    marginHorizontal: screen.horizontal,
    minHeight: 168,
    borderRadius: 30,
    backgroundColor: colors.card,
    overflow: "hidden",
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    ...shadows.card,
  },
  profileShape: {
    position: "absolute",
    width: 158,
    height: 88,
    borderRadius: 26,
    backgroundColor: colors.faintPrimary,
    right: -42,
    top: -10,
    transform: [{ rotate: "-18deg" }],
  },
  avatar: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: colors.card,
    ...shadows.primary,
  },
  avatarText: {
    fontFamily: typography.headline,
    color: colors.onPrimary,
    fontSize: 26,
  },
  profileCopy: {
    flex: 1,
    gap: 8,
  },
  profileName: {
    fontFamily: typography.headlineSemi,
    color: colors.onSurface,
    fontSize: 21,
    lineHeight: 27,
  },
  profileSubRow: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
  },
  profileSubInfo: {
    fontFamily: typography.bodyMedium,
    color: colors.outline,
    fontSize: 12,
  },
  nameSkeleton: {
    width: "70%",
    height: 23,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceContainerHighest,
  },
  infoSkeleton: {
    width: "54%",
    height: 28,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceContainer,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: screen.horizontal,
    gap: 10,
  },
  sectionTitle: {
    fontFamily: typography.headlineSemi,
    color: colors.onSurface,
    fontSize: 18,
  },
  actionsCard: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: 4,
    ...shadows.soft,
  },
  actionRow: {
    minHeight: 68,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  actionCopy: {
    flex: 1,
    gap: 3,
  },
  actionLabel: {
    fontFamily: typography.bodyBold,
    color: colors.onSurface,
    fontSize: 14,
  },
  actionValue: {
    fontFamily: typography.body,
    color: colors.outline,
    fontSize: 12,
  },
  dangerText: {
    color: colors.error,
  },
});

export default function ProfileScreen() {
  return (
    <ProtectedRoute redirectTo="/auth/login" requireAuth>
      <ProfileScreenContent />
    </ProtectedRoute>
  );
}
