import React, { useCallback, useMemo } from 'react';
import {
    View,
    ScrollView,
    StyleSheet,
    StatusBar,
    Pressable,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import AppText from '@/components/ui/AppText';
import { useRestaurantDetails } from '../hooks/useRestaurantDetails';
import { useRestaurantMenus } from '../hooks/useRestaurantMenus';
import { useMenuSections } from '../hooks/useMenuSections';
import { RestaurantDetails } from '../entities/RestaurantDetails';
import DetailsHeroSkeleton from '../components/DetailsHeroSkeleton';
import ListErrorState from '../components/ListErrorState';
import MenuTabs from '../components/MenuTabs';
import MealsList from '../components/MealsList';

const COVER_BLURHASH = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

const formatAddress = (r: RestaurantDetails) => {
    if (r.address) return r.address;
    const parts = [r.street, r.city].filter(Boolean);
    return parts.length ? parts.join(', ') : r.city;
};

const InfoRow = ({
    icon,
    label,
    value,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: string;
}) => (
    <View style={styles.infoRow}>
        <View style={styles.infoIcon}>
            <Ionicons name={icon} size={16} color="#F55905" />
        </View>
        <View style={{ flex: 1 }}>
            <AppText variant="body-sm" align="left" style={styles.infoLabel}>
                {label}
            </AppText>
            <AppText variant="body-md" align="left" style={styles.infoValue} numberOfLines={2}>
                {value}
            </AppText>
        </View>
    </View>
);

const RestaurantDetailsScreen = () => {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { data, isLoading, isError, error, refetch, isRefetching } =
        useRestaurantDetails(id);
    const {
        menus,
        selectedMenuId,
        selectMenu,
        isLoading: menusLoading,
        isError: menusError,
        refetch: refetchMenus,
    } = useRestaurantMenus(id);

    const {
        data: sections = [],
        isLoading: sectionsLoading,
        isError: sectionsError,
        refetch: refetchSections,
    } = useMenuSections(id, selectedMenuId ?? undefined);

    const handleBack = useCallback(() => {
        if (router.canGoBack()) router.back();
        else router.replace('/restaurants' as never);
    }, []);

    const address = useMemo(() => (data ? formatAddress(data) : ''), [data]);

    if (isLoading) {
        return (
            <SafeAreaView style={styles.safe} edges={['top']}>
                <StatusBar barStyle="dark-content" backgroundColor="#F7F7F7" />
                <View style={styles.topBar}>
                    <Pressable onPress={handleBack} style={styles.backBtn} hitSlop={10}>
                        <Ionicons name="chevron-back" size={22} color="#0F172A" />
                    </Pressable>
                </View>
                <DetailsHeroSkeleton />
            </SafeAreaView>
        );
    }

    if (isError || !data) {
        return (
            <SafeAreaView style={styles.safe} edges={['top']}>
                <StatusBar barStyle="dark-content" backgroundColor="#F7F7F7" />
                <View style={styles.topBar}>
                    <Pressable onPress={handleBack} style={styles.backBtn} hitSlop={10}>
                        <Ionicons name="chevron-back" size={22} color="#0F172A" />
                    </Pressable>
                </View>
                <ListErrorState
                    title="Couldn’t load restaurant"
                    message={error?.message ?? 'Please try again in a moment.'}
                    onRetry={refetch}
                    loading={isRefetching}
                />
            </SafeAreaView>
        );
    }

    const {
        name,
        coverUrl,
        logoUrl,
        cuisineType,
        rating,
        totalRatings,
        minOrderAmount,
        isOpen,
        description,
        phone,
        deliveryFee,
        estimatedDeliveryTime,
        openingHours,
    } = data;

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

            <ScrollView
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefetching}
                        onRefresh={refetch}
                        tintColor="#F55905"
                        colors={['#F55905']}
                    />
                }
            >
                <View style={styles.heroWrap}>
                    <Image
                        source={{ uri: coverUrl }}
                        placeholder={COVER_BLURHASH}
                        contentFit="cover"
                        transition={250}
                        style={styles.cover}
                    />
                    <View style={styles.coverScrim} />

                    <View style={styles.topBarOverlay}>
                        <Pressable onPress={handleBack} style={styles.backBtnDark} hitSlop={10}>
                            <Ionicons name="chevron-back" size={22} color="#fff" />
                        </Pressable>
                        <View
                            style={[
                                styles.statusBadge,
                                { backgroundColor: isOpen ? '#16A34A' : '#9CA3AF' },
                            ]}
                        >
                            <View style={styles.statusDot} />
                            <AppText variant="body-sm" align="left" style={styles.statusText}>
                                {isOpen ? 'Open now' : 'Closed'}
                            </AppText>
                        </View>
                    </View>

                    <View style={styles.logoWrap}>
                        <Image source={{ uri: logoUrl }} contentFit="cover" style={styles.logo} />
                    </View>
                </View>

                <View style={styles.titleBlock}>
                    <AppText variant="headline-lg" align="left" style={styles.name}>
                        {name}
                    </AppText>
                    <View style={styles.metaRow}>
                        <View style={styles.ratingPill}>
                            <Ionicons name="star" size={13} color="#F59E0B" />
                            <AppText variant="body-sm" align="left" style={styles.ratingText}>
                                {rating.toFixed(1)}
                            </AppText>
                            <AppText variant="body-sm" align="left" style={styles.ratingCount}>
                                ({totalRatings} reviews)
                            </AppText>
                        </View>
                        <View style={styles.cuisinePill}>
                            <Ionicons name="restaurant-outline" size={13} color="#F55905" />
                            <AppText variant="body-sm" align="left" style={styles.cuisineText}>
                                {cuisineType}
                            </AppText>
                        </View>
                    </View>
                </View>

                <View style={styles.menusBlock}>
                    <View style={styles.menusHeader}>
                        <AppText variant="headline-sm" align="left" style={styles.sectionTitle}>
                            Menus
                        </AppText>
                        {menus.length > 0 && (
                            <AppText variant="body-sm" align="left" style={styles.menusCount}>
                                {menus.length} {menus.length === 1 ? 'menu' : 'menus'}
                            </AppText>
                        )}
                    </View>
                    <MenuTabs
                        menus={menus}
                        selectedMenuId={selectedMenuId}
                        onSelect={selectMenu}
                        isLoading={menusLoading}
                        isError={menusError}
                        onRetry={refetchMenus}
                    />
                </View>

                <MealsList
                    sections={sections}
                    isLoading={sectionsLoading}
                    isError={sectionsError}
                    onRetry={refetchSections}
                />

                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Ionicons name="cart-outline" size={18} color="#F55905" />
                        <AppText variant="body-sm" align="center" style={styles.statLabel}>
                            Min order
                        </AppText>
                        <AppText variant="body-md" align="center" style={styles.statValue}>
                            {minOrderAmount.toFixed(0)} SAR
                        </AppText>
                    </View>
                    {deliveryFee != null && (
                        <View style={styles.statCard}>
                            <Ionicons name="bicycle-outline" size={18} color="#F55905" />
                            <AppText variant="body-sm" align="center" style={styles.statLabel}>
                                Delivery
                            </AppText>
                            <AppText variant="body-md" align="center" style={styles.statValue}>
                                {deliveryFee.toFixed(0)} SAR
                            </AppText>
                        </View>
                    )}
                    {estimatedDeliveryTime != null && (
                        <View style={styles.statCard}>
                            <Ionicons name="time-outline" size={18} color="#F55905" />
                            <AppText variant="body-sm" align="center" style={styles.statLabel}>
                                ETA
                            </AppText>
                            <AppText variant="body-md" align="center" style={styles.statValue}>
                                {estimatedDeliveryTime} min
                            </AppText>
                        </View>
                    )}
                </View>

                {description ? (
                    <View style={styles.section}>
                        <AppText variant="headline-sm" align="left" style={styles.sectionTitle}>
                            About
                        </AppText>
                        <AppText variant="body-md" align="left" style={styles.description}>
                            {description}
                        </AppText>
                    </View>
                ) : null}

                <View style={styles.section}>
                    <AppText variant="headline-sm" align="left" style={styles.sectionTitle}>
                        Information
                    </AppText>
                    <View style={styles.infoCard}>
                        <InfoRow icon="location-outline" label="Address" value={address} />
                        <View style={styles.divider} />
                        <InfoRow
                            icon={isOpen ? 'checkmark-circle-outline' : 'close-circle-outline'}
                            label="Status"
                            value={isOpen ? 'Open now' : 'Currently closed'}
                        />
                        {openingHours ? (
                            <>
                                <View style={styles.divider} />
                                <InfoRow icon="time-outline" label="Hours" value={openingHours} />
                            </>
                        ) : null}
                        {phone ? (
                            <>
                                <View style={styles.divider} />
                                <InfoRow icon="call-outline" label="Phone" value={phone} />
                            </>
                        ) : null}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F7F7F7' },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 2,
    },
    backBtnDark: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(15,23,42,0.55)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    scroll: { paddingBottom: 32 },
    heroWrap: { width: '100%', aspectRatio: 16 / 10, position: 'relative', backgroundColor: '#E5E7EB' },
    cover: { width: '100%', height: '100%' },
    coverScrim: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(15,23,42,0.18)',
    },
    topBarOverlay: {
        position: 'absolute',
        top: 12,
        left: 16,
        right: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
    },
    statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
    statusText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    logoWrap: {
        position: 'absolute',
        bottom: -28,
        left: 20,
        width: 76,
        height: 76,
        borderRadius: 20,
        backgroundColor: '#fff',
        padding: 4,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 10,
        elevation: 6,
    },
    logo: { width: '100%', height: '100%', borderRadius: 16 },
    titleBlock: { paddingHorizontal: 20, paddingTop: 40, paddingBottom: 8, gap: 10 },
    name: { color: '#0F172A', fontSize: 26 },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    ratingPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
    },
    ratingText: { color: '#92400E', fontWeight: '700', fontSize: 12 },
    ratingCount: { color: '#A16207', fontSize: 11 },
    cuisinePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#FFF3EC',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
    },
    cuisineText: { color: '#F55905', fontWeight: '600', fontSize: 12 },
    menusBlock: { marginTop: 18, gap: 10 },
    menusHeader: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
    },
    menusCount: { color: '#6B7280' },
    statsRow: {
        flexDirection: 'row',
        gap: 10,
        paddingHorizontal: 20,
        marginTop: 18,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 8,
        alignItems: 'center',
        gap: 4,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 1,
    },
    statLabel: { color: '#6B7280', fontSize: 11 },
    statValue: { color: '#0F172A', fontWeight: '700' },
    section: { paddingHorizontal: 20, marginTop: 22, gap: 10 },
    sectionTitle: { color: '#0F172A' },
    description: { color: '#475569', lineHeight: 22 },
    infoCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 4,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 1,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    infoIcon: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: '#FFF3EC',
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoLabel: { color: '#6B7280', fontSize: 11, marginBottom: 2 },
    infoValue: { color: '#0F172A', fontWeight: '600' },
    divider: { height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 14 },
});

export default RestaurantDetailsScreen;
