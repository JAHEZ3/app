import React from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useDeliveryT } from '@/hooks/useAppTranslation';
import { useRTL } from '@/hooks/useRTL';
import { useGetDeliveryProfile } from '../hooks/useGetDeliveryProfile';
import { DashboardSkeleton } from '../components/SkeletonCard';

export default function DeliveryWalletScreen() {
    const { t } = useDeliveryT();
    const isRTL = useRTL();
    const { data: profile, isLoading } = useGetDeliveryProfile();

    if (isLoading || !profile) return <DashboardSkeleton />;

    const balance = profile.walletBalance ?? 0;
    const totalDeliveries = profile.totalDeliveries ?? 0;
    const payment = profile.paymentInfo;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F7F7F7' }} edges={['top']}>
            <StatusBar barStyle="light-content" backgroundColor="#1a7a4a" />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
                <LinearGradient
                    colors={['#1a7a4a', '#0f5a35']}
                    style={{ paddingTop: 20, paddingBottom: 56, paddingHorizontal: 20 }}
                >
                    <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 18, color: '#fff', textAlign: isRTL ? 'right' : 'left', marginBottom: 22 }}>
                        {t('wallet.title')}
                    </Text>

                    <View style={styles.balanceCard}>
                        <Text style={{ fontFamily: 'Tajawal_500Medium', fontSize: 12, color: '#767777', textAlign: isRTL ? 'right' : 'left' }}>
                            {t('wallet.currentBalance')}
                        </Text>
                        <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 32, color: '#1a7a4a', marginTop: 4, textAlign: isRTL ? 'right' : 'left' }}>
                            ILS {balance.toFixed(2)}
                        </Text>
                        <Text style={{ fontFamily: 'Tajawal_400Regular', fontSize: 12, color: '#767777', marginTop: 8, textAlign: isRTL ? 'right' : 'left' }}>
                            {t('wallet.fromDeliveries', { count: totalDeliveries })}
                        </Text>
                    </View>
                </LinearGradient>

                <View style={{ paddingHorizontal: 20, marginTop: -28 }}>
                    <View style={styles.card}>
                        <Text style={[styles.cardTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                            {t('wallet.payoutMethod')}
                        </Text>

                        <View style={[styles.payoutRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                            <View style={styles.payoutIcon}>
                                <Ionicons
                                    name={payment?.type === 'wallet' ? 'phone-portrait-outline' : 'card-outline'}
                                    size={20}
                                    color="#1a7a4a"
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.payoutLabel, { textAlign: isRTL ? 'right' : 'left' }]}>
                                    {payment?.type === 'wallet'
                                        ? payment?.walletType || t('wallet.walletGeneric')
                                        : payment?.bankName || t('wallet.bankGeneric')}
                                </Text>
                                <Text style={[styles.payoutValue, { textAlign: isRTL ? 'right' : 'left' }]}>
                                    {payment?.type === 'wallet'
                                        ? payment?.phone || payment?.accountNumber || '—'
                                        : payment?.iban || payment?.accountNumber || '—'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.card}>
                        <Text style={[styles.cardTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                            {t('wallet.transactions')}
                        </Text>
                        <View style={styles.emptyState}>
                            <Ionicons name="receipt-outline" size={42} color="#c0c0c0" />
                            <Text style={[styles.emptyTitle, { textAlign: 'center' }]}>
                                {t('wallet.transactionsEmptyTitle')}
                            </Text>
                            <Text style={[styles.emptySubtitle, { textAlign: 'center' }]}>
                                {t('wallet.transactionsEmptySubtitle')}
                            </Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    balanceCard: {
        backgroundColor: '#fff',
        borderRadius: 18,
        padding: 18,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 6,
    },
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
    cardTitle: { fontFamily: 'Cairo_700Bold', fontSize: 15, color: '#1E1E1E', marginBottom: 14 },
    payoutRow: { alignItems: 'center', gap: 14 },
    payoutIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#E8F5E9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    payoutLabel: { fontFamily: 'Tajawal_500Medium', fontSize: 13, color: '#1E1E1E' },
    payoutValue: { fontFamily: 'Tajawal_400Regular', fontSize: 12, color: '#767777', marginTop: 2 },
    emptyState: { alignItems: 'center', gap: 8, paddingVertical: 18 },
    emptyTitle: { fontFamily: 'Cairo_700Bold', fontSize: 14, color: '#1E1E1E' },
    emptySubtitle: { fontFamily: 'Tajawal_400Regular', fontSize: 12, color: '#767777', lineHeight: 17 },
});
