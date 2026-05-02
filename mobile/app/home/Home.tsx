import React, { useCallback } from "react";
import {
    View,
    Text,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ProtectedRoute } from "@/hooks/useProtectedRoute";
import { useGetProfile } from "@/modules/Profile/hooks/useGetProfile";
import { useLogout } from "@/modules/Auth/hooks/useLogout";
import { useDeliveryStore } from "@/store/useDeliveryStore";

const PRIMARY = "#F55905";
const PRIMARY_DARK = "#c94400";
const TEXT = "#0F172A";
const MUTED = "#6B7280";
const BG = "#F7F7F7";

interface QuickActionProps {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    sublabel: string;
    onPress: () => void;
    tint?: string;
    bg?: string;
}

const QuickAction = ({ icon, label, sublabel, onPress, tint = PRIMARY, bg = "#FFF3EC" }: QuickActionProps) => (
    <Pressable
        onPress={onPress}
        android_ripple={{ color: "rgba(0,0,0,0.05)" }}
        style={({ pressed }) => [styles.quickAction, pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] }]}
    >
        <View style={[styles.quickIcon, { backgroundColor: bg }]}>
            <Ionicons name={icon} size={22} color={tint} />
        </View>
        <View style={{ flex: 1 }}>
            <Text style={styles.quickLabel}>{label}</Text>
            <Text style={styles.quickSublabel} numberOfLines={1}>
                {sublabel}
            </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
    </Pressable>
);

function HomeScreen() {
    const { data } = useGetProfile();
    const { mutate: logout, isPending } = useLogout();
    const { accessToken: deliveryToken } = useDeliveryStore();

    const handleDeliveryEntry = useCallback(() => router.push("/delivery" as never), []);
    const handleRestaurants = useCallback(() => router.push("/restaurants" as never), []);

    const firstName = data?.firstName ?? "Guest";
    const initial = firstName.charAt(0).toUpperCase();

    return (
        <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
            <StatusBar barStyle="dark-content" backgroundColor={BG} />

            <ScrollView
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
            >
                {/* Greeting */}
                <View style={styles.greetingRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.eyebrow}>Welcome back</Text>
                        <Text style={styles.greeting} numberOfLines={1}>
                            {firstName} <Text style={{ fontSize: 22 }}>👋</Text>
                        </Text>
                    </View>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{initial}</Text>
                    </View>
                </View>

                {/* Hero — Restaurants */}
                <Pressable
                    onPress={handleRestaurants}
                    android_ripple={{ color: "rgba(255,255,255,0.15)" }}
                    style={({ pressed }) => [styles.hero, pressed && { transform: [{ scale: 0.99 }] }]}
                >
                    <View style={styles.heroTop}>
                        <View style={styles.heroIcon}>
                            <Ionicons name="storefront" size={26} color="#fff" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.heroEyebrow}>Discover</Text>
                            <Text style={styles.heroTitle}>Browse restaurants</Text>
                            <Text style={styles.heroSubtitle} numberOfLines={2}>
                                Find your next favorite meal — fresh picks near you, delivered fast.
                            </Text>
                        </View>
                        <View style={styles.heroArrow}>
                            <Ionicons name="arrow-forward" size={18} color="#fff" />
                        </View>
                    </View>
                    <View style={styles.heroFooter}>
                        <Ionicons name="flash" size={13} color="rgba(255,255,255,0.85)" />
                        <Text style={styles.heroFooterText}>Live menus · Real-time prices · Quick checkout</Text>
                    </View>
                </Pressable>

                {/* Section header */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Quick actions</Text>
                </View>

                {/* Quick actions */}
                <View style={styles.actionsCard}>
                    <QuickAction
                        icon="storefront-outline"
                        label="Restaurants"
                        sublabel="Browse all restaurants"
                        onPress={handleRestaurants}
                    />
                    <View style={styles.divider} />
                    <QuickAction
                        icon="bicycle-outline"
                        label={deliveryToken ? "Delivery dashboard" : "Become a delivery agent"}
                        sublabel={deliveryToken ? "Open your agent dashboard" : "Earn on your own schedule"}
                        onPress={handleDeliveryEntry}
                    />
                </View>

                {/* Promo strip */}
                <View style={styles.promo}>
                    <View style={styles.promoBadge}>
                        <Ionicons name="gift-outline" size={16} color={PRIMARY} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.promoTitle}>More features coming soon</Text>
                        <Text style={styles.promoText}>Orders, favorites, and offers — stay tuned.</Text>
                    </View>
                </View>
            </ScrollView>

            {/* Logout */}
            <View style={styles.logoutWrap}>
                <Pressable
                    onPress={() => logout()}
                    disabled={isPending}
                    android_ripple={{ color: "rgba(245,89,5,0.1)" }}
                    style={({ pressed }) => [
                        styles.logoutBtn,
                        (pressed || isPending) && { opacity: 0.7 },
                    ]}
                >
                    <Ionicons name="log-out-outline" size={18} color={PRIMARY} />
                    <Text style={styles.logoutText}>{isPending ? "Logging out…" : "Logout"}</Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: BG },
    scroll: { padding: 20, paddingBottom: 16, gap: 18 },

    greetingRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    eyebrow: { fontFamily: "Tajawal_400Regular", fontSize: 13, color: MUTED, marginBottom: 2 },
    greeting: { fontFamily: "Cairo_700Bold", fontSize: 24, color: TEXT },
    avatar: {
        width: 48, height: 48, borderRadius: 16,
        backgroundColor: "#FFF3EC",
        alignItems: "center", justifyContent: "center",
        borderWidth: 1, borderColor: "#FFE0CB",
    },
    avatarText: { fontFamily: "Cairo_700Bold", fontSize: 18, color: PRIMARY },

    hero: {
        borderRadius: 22,
        overflow: "hidden",
        backgroundColor: PRIMARY,
        shadowColor: PRIMARY,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 18,
        elevation: 10,
    },
    heroTop: {
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        padding: 18,
    },
    heroIcon: {
        width: 56, height: 56, borderRadius: 18,
        backgroundColor: "rgba(255,255,255,0.18)",
        borderWidth: 2, borderColor: "rgba(255,255,255,0.25)",
        alignItems: "center", justifyContent: "center",
    },
    heroEyebrow: {
        fontFamily: "Tajawal_500Medium",
        fontSize: 11,
        color: "rgba(255,255,255,0.85)",
        textTransform: "uppercase",
        letterSpacing: 1.2,
        marginBottom: 2,
    },
    heroTitle: {
        fontFamily: "Cairo_700Bold",
        fontSize: 18,
        color: "#fff",
        marginBottom: 4,
    },
    heroSubtitle: {
        fontFamily: "Tajawal_400Regular",
        fontSize: 13,
        color: "rgba(255,255,255,0.85)",
        lineHeight: 18,
    },
    heroArrow: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: "rgba(255,255,255,0.2)",
        alignItems: "center", justifyContent: "center",
    },
    heroFooter: {
        backgroundColor: PRIMARY_DARK,
        paddingHorizontal: 18,
        paddingVertical: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    heroFooterText: {
        fontFamily: "Tajawal_500Medium",
        fontSize: 12,
        color: "rgba(255,255,255,0.9)",
    },

    sectionHeader: { paddingHorizontal: 4 },
    sectionTitle: { fontFamily: "Cairo_700Bold", fontSize: 16, color: TEXT },

    actionsCard: {
        backgroundColor: "#fff",
        borderRadius: 18,
        paddingVertical: 4,
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    quickAction: {
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingHorizontal: 14,
        paddingVertical: 14,
    },
    quickIcon: {
        width: 44, height: 44, borderRadius: 14,
        alignItems: "center", justifyContent: "center",
    },
    quickLabel: { fontFamily: "Cairo_700Bold", fontSize: 14, color: TEXT, marginBottom: 2 },
    quickSublabel: { fontFamily: "Tajawal_400Regular", fontSize: 12, color: MUTED },
    divider: { height: 1, backgroundColor: "#F1F5F9", marginHorizontal: 14 },

    promo: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 14,
        borderRadius: 16,
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#F1F5F9",
        borderStyle: "dashed",
    },
    promoBadge: {
        width: 36, height: 36, borderRadius: 12,
        backgroundColor: "#FFF3EC",
        alignItems: "center", justifyContent: "center",
    },
    promoTitle: { fontFamily: "Cairo_700Bold", fontSize: 13, color: TEXT },
    promoText: { fontFamily: "Tajawal_400Regular", fontSize: 12, color: MUTED, marginTop: 2 },

    logoutWrap: { paddingHorizontal: 20, paddingBottom: 8 },
    logoutBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: "#FFF3EC",
        borderWidth: 1,
        borderColor: "#FFE0CB",
    },
    logoutText: { fontFamily: "Cairo_700Bold", fontSize: 14, color: PRIMARY },
});

export default function Home() {
    return (
        <ProtectedRoute redirectTo="/auth/login" requireAuth={true}>
            <HomeScreen />
        </ProtectedRoute>
    );
}
