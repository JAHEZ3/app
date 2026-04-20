import { useGetProfile } from "@/modules/Profile/hooks/useGetProfile";
import React from "react";
import { View, Text, Button } from "react-native";
import { ProtectedRoute } from "@/hooks/useProtectedRoute";
import { useLogout } from "@/modules/Auth/hooks/useLogout";

function HomeScreen() {
    const { data } = useGetProfile();
    const { mutate: logout, isPending } = useLogout();

    return (
        <View className="text-4xl text-red-300 flex-1 justify-center items-center">
            <Text className="font-bold">Hello from home page !</Text>
            <Text className="font-bold">Home Page - {data?.firstName}</Text>
            <Text className="font-bold">Home Page - {data?.locationLat}</Text>
            <Text className="font-bold">Home Page - {data?.locationLng}</Text>
            <Text className="font-bold">Home Page - {data?.dateOfBirth}</Text>
            <Button title={isPending ? "Logging out..." : "Logout"} onPress={() => logout()} disabled={isPending} />
        </View>
    );
}

export default function Home() {
    return (
        <ProtectedRoute redirectTo="/auth/login" requireAuth={true}>
            <HomeScreen />
        </ProtectedRoute>
    );
}
