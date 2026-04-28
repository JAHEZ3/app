import React, { useCallback } from "react";
import { View, Text, Button, TouchableOpacity, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ProtectedRoute } from "@/hooks/useProtectedRoute";
import { useGetProfile } from "@/modules/Profile/hooks/useGetProfile";
import { useLogout } from "@/modules/Auth/hooks/useLogout";
import { useDeliveryStore } from "@/store/useDeliveryStore";

function HomeScreen() {
    const { data } = useGetProfile();
    const { mutate: logout, isPending } = useLogout();
    const { accessToken: deliveryToken } = useDeliveryStore();

    const handleDeliveryEntry = useCallback(() => {
        router.push("/delivery" as never);
    }, []);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#F7F7F7" }} edges={["top", "bottom"]}>
            <StatusBar barStyle="dark-content" backgroundColor="#F7F7F7" />

            <View style={{ flex: 1, padding: 20 }}>
                {/* Greeting */}
                <View style={{ marginBottom: 24 }}>
                    <Text style={{ fontFamily: "Tajawal_400Regular", fontSize: 14, color: "#767777" }}>
                        Welcome back,
                    </Text>
                    <Text style={{ fontFamily: "Cairo_700Bold", fontSize: 24, color: "#1E1E1E" }}>
                        {data?.firstName ?? "Guest"} 👋
                    </Text>
                </View>

                {/* Delivery Agent Banner */}
                <TouchableOpacity
                    onPress={handleDeliveryEntry}
                    activeOpacity={0.88}
                    style={{
                        borderRadius: 22,
                        overflow: "hidden",
                        marginBottom: 24,
                        shadowColor: "#F55905",
                        shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: 0.25,
                        shadowRadius: 18,
                        elevation: 10,
                    }}
                >
                    <View style={{
                        backgroundColor: "#F55905",
                        padding: 20,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 16,
                    }}>
                        <View style={{
                            width: 56, height: 56, borderRadius: 18,
                            backgroundColor: "rgba(255,255,255,0.2)",
                            alignItems: "center", justifyContent: "center",
                            borderWidth: 2, borderColor: "rgba(255,255,255,0.3)",
                        }}>
                            <Ionicons name="bicycle" size={28} color="#fff" />
                        </View>

                        <View style={{ flex: 1 }}>
                            <Text style={{ fontFamily: "Cairo_700Bold", fontSize: 17, color: "#fff", marginBottom: 2 }}>
                                Become a Delivery Agent
                            </Text>
                            <Text style={{ fontFamily: "Tajawal_400Regular", fontSize: 13, color: "rgba(255,255,255,0.8)", lineHeight: 18 }}>
                                {deliveryToken ? "Open your agent dashboard" : "Join our delivery team — earn on your schedule"}
                            </Text>
                        </View>

                        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
                            <Ionicons name="arrow-forward" size={18} color="#fff" />
                        </View>
                    </View>

                    {/* Bottom strip */}
                    <View style={{ backgroundColor: "#c94400", paddingHorizontal: 20, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Ionicons name={deliveryToken ? "checkmark-circle" : "flash"} size={14} color="rgba(255,255,255,0.8)" />
                        <Text style={{ fontFamily: "Tajawal_500Medium", fontSize: 12, color: "rgba(255,255,255,0.85)" }}>
                            {deliveryToken ? "Active agent account found" : "Quick registration · Flexible hours · Weekly payouts"}
                        </Text>
                    </View>
                </TouchableOpacity>

                {/* Placeholder content */}
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                    <Text style={{ fontFamily: "Tajawal_400Regular", fontSize: 14, color: "#c0c0c0" }}>
                        More features coming soon...
                    </Text>
                </View>
            </View>

            {/* Logout */}
            <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
                <Button title={isPending ? "Logging out..." : "Logout"} onPress={() => logout()} disabled={isPending} />
            </View>
        </SafeAreaView>
    );
}

export default function Home() {
    return (
        <ProtectedRoute redirectTo="/auth/login" requireAuth={true}>
            <HomeScreen />
        </ProtectedRoute>
    );
}
