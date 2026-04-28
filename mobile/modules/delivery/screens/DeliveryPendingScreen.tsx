import React, { useEffect } from 'react';
import { AppState, View, Text, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withDelay,
    Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useDeliveryLogout } from '../hooks/useDeliveryLogout';
import { useGetDeliveryProfile } from '../hooks/useGetDeliveryProfile';

const ease = Easing.out(Easing.cubic);

export default function DeliveryPendingScreen() {
    const { mutate: logout, isPending } = useDeliveryLogout();
    const { data: profile, refetch, isRefetching } = useGetDeliveryProfile();
    const queryClient = useQueryClient();

    const iconOpacity = useSharedValue(0);
    const iconScale = useSharedValue(0.7);
    const ring1 = useSharedValue(0.3);
    const ring2 = useSharedValue(0.2);
    const contentOpacity = useSharedValue(0);
    const contentY = useSharedValue(20);

    useEffect(() => {
        iconOpacity.value = withTiming(1, { duration: 600, easing: ease });
        iconScale.value = withTiming(1, { duration: 700, easing: ease });
        ring1.value = withDelay(300, withRepeat(withTiming(0.6, { duration: 1800, easing: Easing.inOut(Easing.sin) }), -1, true));
        ring2.value = withDelay(600, withRepeat(withTiming(0.4, { duration: 2200, easing: Easing.inOut(Easing.sin) }), -1, true));
        contentOpacity.value = withDelay(400, withTiming(1, { duration: 500, easing: ease }));
        contentY.value = withDelay(400, withTiming(0, { duration: 500, easing: ease }));
    }, [iconOpacity, iconScale, ring1, ring2, contentOpacity, contentY]);

    useEffect(() => {
        if (!profile?.status) return;

        if (profile.status === 'ACTIVE') {
            router.replace('/delivery/dashboard' as never);
            return;
        }

        if (profile.status === 'REJECTED') {
            router.replace('/delivery/rejected' as never);
            return;
        }

        if (profile.status === 'SUSPENDED') {
            router.replace('/delivery/application' as never);
        }
    }, [profile?.status]);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (state) => {
            if (state === 'active') {
                queryClient.invalidateQueries({ queryKey: ['deliveryProfile'] });
                refetch();
            }
        });

        return () => subscription.remove();
    }, [queryClient, refetch]);

    const iconStyle = useAnimatedStyle(() => ({ opacity: iconOpacity.value, transform: [{ scale: iconScale.value }] }));
    const ring1Style = useAnimatedStyle(() => ({ opacity: ring1.value }));
    const ring2Style = useAnimatedStyle(() => ({ opacity: ring2.value }));
    const contentStyle = useAnimatedStyle(() => ({ opacity: contentOpacity.value, transform: [{ translateY: contentY.value }] }));

    const handleRefresh = () => {
        queryClient.invalidateQueries({ queryKey: ['deliveryProfile'] });
        refetch();
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
                <View style={{ alignItems: 'center', justifyContent: 'center', width: 160, height: 160, marginBottom: 40 }}>
                    <Animated.View style={[ring2Style, {
                        position: 'absolute', width: 160, height: 160, borderRadius: 80,
                        backgroundColor: 'rgba(245, 89, 5, 0.08)',
                    }]} />
                    <Animated.View style={[ring1Style, {
                        position: 'absolute', width: 120, height: 120, borderRadius: 60,
                        backgroundColor: 'rgba(245, 89, 5, 0.12)',
                    }]} />
                    <Animated.View style={[iconStyle, {
                        width: 88, height: 88, borderRadius: 44,
                        backgroundColor: '#FFF5F0',
                        alignItems: 'center', justifyContent: 'center',
                        borderWidth: 2, borderColor: '#F55905',
                    }]}>
                        <Ionicons name="time" size={40} color="#F55905" />
                    </Animated.View>
                </View>

                <Animated.View style={[contentStyle, { alignItems: 'center', width: '100%' }]}>
                    <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 26, color: '#1E1E1E', textAlign: 'center', marginBottom: 12 }}>
                        Application Submitted!
                    </Text>
                    <Text style={{ fontFamily: 'Tajawal_400Regular', fontSize: 15, color: '#767777', textAlign: 'center', lineHeight: 24, marginBottom: 32 }}>
                        Your application is currently under review. Our team will verify your information and get back to you soon.
                    </Text>

                    <View style={{
                        flexDirection: 'row', alignItems: 'center', gap: 8,
                        backgroundColor: '#FFF5F0', borderRadius: 20,
                        paddingHorizontal: 20, paddingVertical: 10, marginBottom: 36,
                        borderWidth: 1.5, borderColor: '#FFD4B8',
                    }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#F55905' }} />
                        <Text style={{ fontFamily: 'Tajawal_500Medium', fontSize: 14, color: '#F55905' }}>
                            {isRefetching ? 'Checking Status...' : 'Pending Approval'}
                        </Text>
                    </View>

                    {[
                        { icon: 'checkmark-circle-outline' as const, text: 'Documents verified successfully' },
                        { icon: 'shield-checkmark-outline' as const, text: 'Background check in progress' },
                        { icon: 'notifications-outline' as const, text: 'You will be notified when approved' },
                    ].map((item, i) => (
                        <View key={i} style={{
                            flexDirection: 'row', alignItems: 'center', gap: 12,
                            width: '100%', backgroundColor: '#F7F7F7', borderRadius: 14,
                            padding: 14, marginBottom: 10,
                        }}>
                            <Ionicons name={item.icon} size={20} color="#F55905" />
                            <Text style={{ flex: 1, fontFamily: 'Tajawal_400Regular', fontSize: 14, color: '#767777' }}>
                                {item.text}
                            </Text>
                        </View>
                    ))}

                    <TouchableOpacity
                        onPress={handleRefresh}
                        style={{
                            flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8,
                            paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20,
                            borderWidth: 1.5, borderColor: '#e5e5e5',
                        }}
                    >
                        <Ionicons name="refresh-outline" size={16} color="#767777" />
                        <Text style={{ fontFamily: 'Tajawal_500Medium', fontSize: 14, color: '#767777' }}>
                            Refresh Status
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => logout()} disabled={isPending} style={{ marginTop: 16 }}>
                        <Text style={{ fontFamily: 'Tajawal_400Regular', fontSize: 13, color: '#c0c0c0', textDecorationLine: 'underline' }}>
                            {isPending ? 'Logging out...' : 'Logout'}
                        </Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </SafeAreaView>
    );
}
