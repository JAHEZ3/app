import React from 'react';
import { Stack } from 'expo-router';
import { useDeliveryRealtime } from '@/hooks/useDeliveryRealtime';

// Keeps the delivery socket alive for the entire delivery section — not just
// the active-agent tabs — so status updates reach pending/rejected screens too.
function DeliveryRealtimeBridge() {
    useDeliveryRealtime();
    return null;
}

export default function DeliveryLayout() {
    return (
        <>
            <DeliveryRealtimeBridge />
            <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="register" options={{ gestureEnabled: false }} />
                <Stack.Screen name="otp" options={{ gestureEnabled: false }} />
                <Stack.Screen name="application" options={{ gestureEnabled: false }} />
                <Stack.Screen name="pending" options={{ gestureEnabled: false }} />
                <Stack.Screen name="rejected" />
                <Stack.Screen name="dashboard" options={{ gestureEnabled: false }} />
                <Stack.Screen name="tabs" options={{ gestureEnabled: false, animation: 'fade' }} />
                <Stack.Screen name="order/[id]" options={{ animation: 'slide_from_right' }} />
            </Stack>
        </>
    );
}
