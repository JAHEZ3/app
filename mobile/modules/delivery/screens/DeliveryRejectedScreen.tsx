import React, { useEffect } from 'react';
import { View, Text, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withDelay,
    Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AppButton from '@/components/ui/AppButton';
import { useDeliveryT } from '@/hooks/useAppTranslation';
import { useRTL } from '@/hooks/useRTL';
import { useDeliveryLogout } from '../hooks/useDeliveryLogout';
import { useGetDeliveryProfile } from '../hooks/useGetDeliveryProfile';

const ease = Easing.out(Easing.cubic);

export default function DeliveryRejectedScreen() {
    const { t } = useDeliveryT();
    const isRTL = useRTL();
    const { data: profile } = useGetDeliveryProfile();
    const { mutate: logout, isPending } = useDeliveryLogout();
    const textAlign = isRTL ? 'right' : 'left';

    const iconOpacity = useSharedValue(0);
    const iconScale = useSharedValue(0.6);
    const contentOpacity = useSharedValue(0);
    const contentY = useSharedValue(24);

    useEffect(() => {
        iconOpacity.value = withTiming(1, { duration: 500, easing: ease });
        iconScale.value = withTiming(1, { duration: 600, easing: ease });
        contentOpacity.value = withDelay(300, withTiming(1, { duration: 500, easing: ease }));
        contentY.value = withDelay(300, withTiming(0, { duration: 500, easing: ease }));
    }, [iconOpacity, iconScale, contentOpacity, contentY]);

    const iconStyle = useAnimatedStyle(() => ({ opacity: iconOpacity.value, transform: [{ scale: iconScale.value }] }));
    const contentStyle = useAnimatedStyle(() => ({ opacity: contentOpacity.value, transform: [{ translateY: contentY.value }] }));

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 }}>
                {/* Icon */}
                <Animated.View style={[iconStyle, {
                    width: 96, height: 96, borderRadius: 48,
                    backgroundColor: '#FFF0F0',
                    alignItems: 'center', justifyContent: 'center',
                    borderWidth: 2, borderColor: '#b02500',
                    marginBottom: 28,
                }]}>
                    <Ionicons name="close-circle" size={48} color="#b02500" />
                </Animated.View>

                <Animated.View style={[contentStyle, { alignItems: 'center', width: '100%' }]}>
                    <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 24, color: '#1E1E1E', textAlign: 'center', marginBottom: 10 }}>
                        {t('rejected.title')}
                    </Text>
                    <Text style={{ fontFamily: 'Tajawal_400Regular', fontSize: 14, color: '#767777', textAlign: 'center', lineHeight: 22, marginBottom: 24 }}>
                        {t('rejected.subtitle')}
                    </Text>

                    {/* Rejection reason card */}
                    {profile?.rejectionReason && (
                        <View style={{
                            width: '100%', backgroundColor: '#FFF0F0', borderRadius: 16,
                            padding: 16, marginBottom: 24, borderLeftWidth: 4, borderLeftColor: '#b02500',
                        }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                <Ionicons name="information-circle-outline" size={18} color="#b02500" />
                                <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 13, color: '#b02500' }}>
                                    {t('rejected.reasonTitle')}
                                </Text>
                            </View>
                            <Text style={{ fontFamily: 'Tajawal_400Regular', fontSize: 14, color: '#1E1E1E', lineHeight: 22, textAlign }}>
                                {profile.rejectionReason}
                            </Text>
                        </View>
                    )}

                    {/* What to do */}
                    <View style={{ width: '100%', backgroundColor: '#F7F7F7', borderRadius: 16, padding: 16, marginBottom: 28, gap: 10 }}>
                        <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 14, color: '#1E1E1E', marginBottom: 4 }}>
                            {t('rejected.nextTitle')}
                        </Text>
                        {[
                            t('rejected.tips.reviewReason'),
                            t('rejected.tips.documents'),
                            t('rejected.tips.support'),
                        ].map((tip, i) => (
                            <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#F55905', marginTop: 6 }} />
                                <Text style={{ flex: 1, fontFamily: 'Tajawal_400Regular', fontSize: 13, color: '#767777', lineHeight: 20, textAlign }}>
                                    {tip}
                                </Text>
                            </View>
                        ))}
                    </View>

                    <AppButton
                        label={t('rejected.reapply')}
                        onPress={() => router.replace('/delivery/application' as never)}
                        icon={<Ionicons name="refresh-circle-outline" size={22} color="#fff" />}
                        iconPosition="right"
                    />

                    <AppButton
                        label={isPending ? t('rejected.loggingOut') : t('rejected.logout')}
                        variant="ghost"
                        onPress={() => logout()}
                        disabled={isPending}
                        style={{ marginTop: 12 }}
                    />
                </Animated.View>
            </View>
        </SafeAreaView>
    );
}
