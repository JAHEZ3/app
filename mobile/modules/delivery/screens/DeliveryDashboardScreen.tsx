import React, { useCallback, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    StatusBar,
    TouchableOpacity,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withDelay,
    Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQueryClient } from '@tanstack/react-query';
import { useGetDeliveryProfile } from '../hooks/useGetDeliveryProfile';
import { useDeliveryLogout } from '../hooks/useDeliveryLogout';
import { DashboardSkeleton } from '../components/SkeletonCard';

const ease = Easing.out(Easing.cubic);

function StatCard({ icon, label, value, color = '#F55905', delay }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: string | number;
    color?: string;
    delay: number;
}) {
    const opacity = useSharedValue(0);
    const y = useSharedValue(16);
    useEffect(() => {
        opacity.value = withDelay(delay, withTiming(1, { duration: 450, easing: ease }));
        y.value = withDelay(delay, withTiming(0, { duration: 450, easing: ease }));
    }, [opacity, y, delay]);
    const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: y.value }] }));

    return (
        <Animated.View style={[style, {
            flex: 1, backgroundColor: '#fff', borderRadius: 18,
            padding: 16, alignItems: 'center', gap: 8,
            shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
        }]}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: `${color}15`, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={icon} size={20} color={color} />
            </View>
            <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 20, color: '#1E1E1E' }}>
                {value}
            </Text>
            <Text style={{ fontFamily: 'Tajawal_400Regular', fontSize: 11, color: '#767777', textAlign: 'center' }}>
                {label}
            </Text>
        </Animated.View>
    );
}

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' }}>
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#FFF5F0', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Ionicons name={icon} size={17} color="#F55905" />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'Tajawal_400Regular', fontSize: 12, color: '#767777', marginBottom: 1 }}>{label}</Text>
                <Text style={{ fontFamily: 'Tajawal_500Medium', fontSize: 14, color: '#1E1E1E' }}>{value || '—'}</Text>
            </View>
        </View>
    );
}

export default function DeliveryDashboardScreen() {
    const { data: profile, isLoading, refetch, isRefetching } = useGetDeliveryProfile();
    const { mutate: logout, isPending: isLoggingOut } = useDeliveryLogout();

    const headerOpacity = useSharedValue(0);
    const headerY = useSharedValue(-10);

    useEffect(() => {
        headerOpacity.value = withTiming(1, { duration: 500, easing: ease });
        headerY.value = withTiming(0, { duration: 500, easing: ease });
    }, [headerOpacity, headerY]);

    const headerStyle = useAnimatedStyle(() => ({
        opacity: headerOpacity.value,
        transform: [{ translateY: headerY.value }],
    }));

    const handleLogout = useCallback(() => { logout(); }, [logout]);

    if (isLoading) return <DashboardSkeleton />;
    if (!profile) return null;

    const ratingStars = Math.round(profile.rating ?? 0);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F7F7F7' }} edges={['top', 'bottom']}>
            <StatusBar barStyle="light-content" backgroundColor="#F55905" />

            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#F55905" />
                }
            >
                {/* Header gradient */}
                <LinearGradient
                    colors={['#F55905', '#c94400']}
                    style={{ paddingTop: 20, paddingBottom: 48, paddingHorizontal: 20 }}
                >
                    <Animated.View style={[headerStyle, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }]}>
                        <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 18, color: '#fff' }}>
                            My Dashboard
                        </Text>
                        <TouchableOpacity
                            onPress={handleLogout}
                            disabled={isLoggingOut}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 }}
                        >
                            <Ionicons name="log-out-outline" size={16} color="#fff" />
                            <Text style={{ fontFamily: 'Tajawal_500Medium', fontSize: 13, color: '#fff' }}>
                                {isLoggingOut ? 'Logging out...' : 'Logout'}
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Profile card (lifted by negative margin below) */}
                    <View style={{
                        backgroundColor: '#fff', borderRadius: 24, padding: 20,
                        alignItems: 'center', gap: 8,
                        shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
                        shadowOpacity: 0.1, shadowRadius: 16, elevation: 10,
                        marginBottom: -32,
                    }}>
                        {/* Avatar */}
                        <View style={{ width: 88, height: 88, borderRadius: 44, overflow: 'hidden', backgroundColor: '#F7F7F7', borderWidth: 3, borderColor: '#F55905' }}>
                            {profile.profilePictureUrl ? (
                                <Image
                                    source={{ uri: profile.profilePictureUrl }}
                                    style={{ width: '100%', height: '100%' }}
                                    contentFit="cover"
                                    transition={300}
                                />
                            ) : (
                                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                                    <Ionicons name="person" size={40} color="#c0c0c0" />
                                </View>
                            )}
                        </View>

                        <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 20, color: '#1E1E1E', textAlign: 'center' }}>
                            {profile.fullName}
                        </Text>

                        {/* Rating stars */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Ionicons key={i} name={i < ratingStars ? 'star' : 'star-outline'} size={16} color="#F55905" />
                            ))}
                            <Text style={{ fontFamily: 'Tajawal_500Medium', fontSize: 13, color: '#767777', marginLeft: 4 }}>
                                {(profile.rating ?? 0).toFixed(1)}
                            </Text>
                        </View>

                        {/* Active badge */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#E8F5E9', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 }}>
                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#2E7D32' }} />
                            <Text style={{ fontFamily: 'Tajawal_500Medium', fontSize: 13, color: '#2E7D32' }}>Active Agent</Text>
                        </View>
                    </View>
                </LinearGradient>

                {/* Content */}
                <View style={{ paddingHorizontal: 20, paddingTop: 48 }}>

                    {/* Stats row */}
                    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
                        <StatCard icon="bicycle-outline" label="Deliveries" value={profile.totalDeliveries ?? 0} delay={200} />
                        <StatCard icon="wallet-outline" label="Balance" value={`﷼${(profile.walletBalance ?? 0).toFixed(0)}`} color="#1a7a4a" delay={280} />
                        <StatCard icon="star-outline" label="Rating" value={(profile.rating ?? 0).toFixed(1)} color="#c94400" delay={360} />
                    </View>

                    {/* Info card */}
                    <View style={{
                        backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16,
                        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
                    }}>
                        <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 16, color: '#1E1E1E', marginBottom: 4 }}>
                            Profile Details
                        </Text>
                        <InfoRow icon="phone-portrait-outline" label="Phone" value={profile.phone} />
                        <InfoRow icon="location-outline" label="City" value={profile.city} />
                        <InfoRow icon="car-outline" label="Vehicle" value={profile.vehicleType?.replace('_', ' ')} />
                        <InfoRow icon="card-outline" label="National ID" value={profile.idNumber} />
                        <InfoRow icon="call-outline" label="Emergency Contact" value={`${profile.emergencyContactName} — ${profile.emergencyContactPhone}`} />
                    </View>

                    {/* Quick actions */}
                    <View style={{
                        backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 28,
                        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
                    }}>
                        <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 16, color: '#1E1E1E', marginBottom: 14 }}>
                            Quick Actions
                        </Text>
                        {[
                            { icon: 'receipt-outline' as const, label: 'View Deliveries', color: '#F55905' },
                            { icon: 'wallet-outline' as const, label: 'Wallet & Payouts', color: '#1a7a4a' },
                            { icon: 'headset-outline' as const, label: 'Contact Support', color: '#1E1E1E' },
                        ].map((item, i) => (
                            <TouchableOpacity key={i} style={{
                                flexDirection: 'row', alignItems: 'center', gap: 14,
                                paddingVertical: 14,
                                borderBottomWidth: i < 2 ? 1 : 0, borderBottomColor: '#f5f5f5',
                            }}>
                                <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: `${item.color}15`, alignItems: 'center', justifyContent: 'center' }}>
                                    <Ionicons name={item.icon} size={18} color={item.color} />
                                </View>
                                <Text style={{ flex: 1, fontFamily: 'Tajawal_500Medium', fontSize: 14, color: '#1E1E1E' }}>
                                    {item.label}
                                </Text>
                                <Ionicons name="chevron-forward" size={16} color="#c0c0c0" />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
