import React, { useCallback } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useDeliveryT } from '@/hooks/useAppTranslation';
import { useRTL } from '@/hooks/useRTL';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import { useGetDeliveryProfile } from '../hooks/useGetDeliveryProfile';
import { useDeliveryLogout } from '../hooks/useDeliveryLogout';
import { DashboardSkeleton } from '../components/SkeletonCard';

function InfoRow({ icon, label, value, isRTL }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; isRTL: boolean }) {
    return (
        <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={styles.rowIcon}>
                <Ionicons name={icon} size={16} color="#F55905" />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={[styles.rowLabel, { textAlign: isRTL ? 'right' : 'left' }]}>{label}</Text>
                <Text style={[styles.rowValue, { textAlign: isRTL ? 'right' : 'left' }]}>{value}</Text>
            </View>
        </View>
    );
}

export default function DeliveryProfileScreen() {
    const { t } = useDeliveryT();
    const isRTL = useRTL();
    const { data: profile, isLoading } = useGetDeliveryProfile();
    const { mutate: logout, isPending: isLoggingOut } = useDeliveryLogout();

    const handleLogout = useCallback(() => logout(), [logout]);

    if (isLoading || !profile) return <DashboardSkeleton />;

    const empty = t('dashboard.fields.empty');
    const vehicleLabel = profile.vehicleType
        ? t(`application.vehicles.${profile.vehicleType === 'on_foot' ? 'onFoot' : profile.vehicleType}` as const)
        : empty;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F7F7F7' }} edges={['top']}>
            <StatusBar barStyle="dark-content" backgroundColor="#F7F7F7" />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 140 }}>
                <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 22, color: '#1E1E1E', textAlign: isRTL ? 'right' : 'left' }}>
                    {t('profile.title')}
                </Text>

                <View style={styles.profileCard}>
                    <View style={styles.avatar}>
                        {profile.profilePictureUrl ? (
                            <Image
                                source={{ uri: profile.profilePictureUrl }}
                                style={{ width: '100%', height: '100%' }}
                                contentFit="cover"
                                transition={250}
                            />
                        ) : (
                            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                                <Ionicons name="person" size={36} color="#c0c0c0" />
                            </View>
                        )}
                    </View>
                    <Text style={[styles.fullName, { textAlign: isRTL ? 'right' : 'left' }]}>{profile.fullName}</Text>
                    <Text style={[styles.phone, { textAlign: isRTL ? 'right' : 'left' }]}>{profile.phone}</Text>
                </View>

                <View style={styles.card}>
                    <Text style={[styles.cardTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                        {t('profile.personalInfo')}
                    </Text>
                    <InfoRow icon="person-outline" label={t('dashboard.fields.city')} value={profile.city || empty} isRTL={isRTL} />
                    <InfoRow icon="car-outline" label={t('dashboard.fields.vehicle')} value={vehicleLabel} isRTL={isRTL} />
                    <InfoRow icon="card-outline" label={t('dashboard.fields.nationalId')} value={profile.idNumber || empty} isRTL={isRTL} />
                </View>

                <View style={styles.card}>
                    <Text style={[styles.cardTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                        {t('profile.documents')}
                    </Text>
                    <View style={[styles.docRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Ionicons name="image-outline" size={18} color="#F55905" />
                        <Text style={[styles.docLabel, { textAlign: isRTL ? 'right' : 'left' }]}>
                            {t('profile.profilePhoto')}
                        </Text>
                        <Ionicons
                            name={profile.profilePictureUrl ? 'checkmark-circle' : 'close-circle'}
                            size={18}
                            color={profile.profilePictureUrl ? '#1a7a4a' : '#c0c0c0'}
                        />
                    </View>
                    <View style={[styles.docRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Ionicons name="card-outline" size={18} color="#F55905" />
                        <Text style={[styles.docLabel, { textAlign: isRTL ? 'right' : 'left' }]}>
                            {t('profile.idPhoto')}
                        </Text>
                        <Ionicons
                            name={profile.idPictureUrl ? 'checkmark-circle' : 'close-circle'}
                            size={18}
                            color={profile.idPictureUrl ? '#1a7a4a' : '#c0c0c0'}
                        />
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={[styles.cardTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                        {t('profile.language')}
                    </Text>
                    <LanguageSwitcher />
                </View>

                <TouchableOpacity
                    onPress={handleLogout}
                    disabled={isLoggingOut}
                    style={styles.logoutBtn}
                >
                    <Ionicons name="log-out-outline" size={18} color="#B91C1C" />
                    <Text style={styles.logoutText}>
                        {isLoggingOut ? t('dashboard.loggingOut') : t('dashboard.logout')}
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    profileCard: {
        backgroundColor: '#fff',
        borderRadius: 22,
        padding: 20,
        alignItems: 'center',
        marginTop: 18,
        marginBottom: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 4,
    },
    avatar: {
        width: 76,
        height: 76,
        borderRadius: 38,
        overflow: 'hidden',
        backgroundColor: '#F7F7F7',
        borderWidth: 3,
        borderColor: '#F55905',
        marginBottom: 10,
    },
    fullName: { fontFamily: 'Cairo_700Bold', fontSize: 17, color: '#1E1E1E' },
    phone: { fontFamily: 'Tajawal_500Medium', fontSize: 13, color: '#767777', marginTop: 4 },
    card: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 18,
        marginBottom: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    cardTitle: { fontFamily: 'Cairo_700Bold', fontSize: 15, color: '#1E1E1E', marginBottom: 12 },
    row: { alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f5f5f5', gap: 12 },
    rowIcon: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: '#FFF5F0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    rowLabel: { fontFamily: 'Tajawal_400Regular', fontSize: 11, color: '#767777' },
    rowValue: { fontFamily: 'Tajawal_500Medium', fontSize: 13, color: '#1E1E1E', marginTop: 2 },
    docRow: { alignItems: 'center', gap: 12, paddingVertical: 10 },
    docLabel: { flex: 1, fontFamily: 'Tajawal_500Medium', fontSize: 13, color: '#1E1E1E' },
    logoutBtn: {
        marginTop: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#fff',
        borderRadius: 16,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: '#FEE2E2',
    },
    logoutText: { fontFamily: 'Cairo_700Bold', fontSize: 14, color: '#B91C1C' },
});
