import { useGetProfile } from "@/modules/Profile/hooks/useGetProfile";
import {  useRouter } from "expo-router";
import React, { useEffect } from "react";
import { View, Text, Button } from "react-native";
import * as SecureStore from 'expo-secure-store';


function HomeScreen() {
    const { data } = useGetProfile();

    useEffect(() => {
        async function fetchProfile() {
           const ref = await SecureStore.getItemAsync('refreshToken');
           console.log(ref);
           
        }
        fetchProfile();
    }, [])

    return (
        <View className="text-4xl text-red-300 flex-1 justify-center items-center">
        <Text className="font-bold">Home Page - {data?.firstName}</Text>
        <Text className="font-bold">Home Page - {data?.locationLat}</Text>
        <Text className="font-bold">Home Pageg - {data?.locationLng}</Text>
        <Text className="font-bold">Home Page - {data?.dateOfBirth}</Text>
        </View>
    );
}

export default function Home() {
    return (
        <HomeScreen />
    );
}
