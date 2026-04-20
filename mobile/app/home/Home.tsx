import { useGetProfile } from "@/modules/Profile/hooks/useGetProfile";
import {  useRouter } from "expo-router";
import React from "react";
import { View, Text, Button } from "react-native";
import * as SecureStore from 'expo-secure-store';
import { ProtectedRoute } from "@/hooks/useProtectedRoute";
import { useLogout } from "@/modules/Auth/hooks/useLogout";

function HomeScreen() {
    const { data } = useGetProfile();
    const { mutateAsync: logout, isPending, error} = useLogout();
    const router = useRouter();

    async function handleLogout() {
        const refreshToken = await SecureStore.getItemAsync('refreshToken');
        console.log("refreshToken logout:", refreshToken);
        await logout(refreshToken);
        router.push('/auth/login');
    }

    if(isPending) {
        return <Text>Loading...</Text>
    }

    return (
        <View className="text-4xl text-red-300 flex-1 justify-center items-center">
        <Text className="font-bold">Hello from home page !</Text>
        <Text className="font-bold">Home Page - {data?.firstName}</Text>
        <Text className="font-bold">Home Page - {data?.locationLat}</Text>
        <Text className="font-bold">Home Pageg - {data?.locationLng}</Text>
        <Text className="font-bold">Home Page - {data?.dateOfBirth}</Text>
        <Text>{error?.message}</Text>
        <Button title="logout" onPress={handleLogout} />
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
