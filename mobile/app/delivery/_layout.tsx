import { Stack } from 'expo-router';

export default function DeliveryLayout() {
    return (
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="register" options={{ gestureEnabled: false }} />
            <Stack.Screen name="otp" options={{ gestureEnabled: false }} />
            <Stack.Screen name="application" options={{ gestureEnabled: false }} />
            <Stack.Screen name="pending" options={{ gestureEnabled: false }} />
            <Stack.Screen name="rejected" />
            <Stack.Screen name="dashboard" options={{ gestureEnabled: false }} />
        </Stack>
    );
}
