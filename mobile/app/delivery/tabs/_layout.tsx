import React from 'react';
import { View } from 'react-native';
import { Slot } from 'expo-router';
import DeliveryTabBar from '@/modules/delivery/components/DeliveryTabBar';

export default function DeliveryTabsLayout() {
    return (
        <View style={{ flex: 1, backgroundColor: '#F7F7F7' }}>
            <View style={{ flex: 1 }}>
                <Slot />
            </View>
            <DeliveryTabBar />
        </View>
    );
}
