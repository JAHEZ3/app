import React, { memo, useCallback } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import AppText from '@/components/ui/AppText';
import { Restaurant } from '../entities/Restaurant';

const COVER_BLURHASH = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

interface RestaurantCardProps {
    restaurant: Restaurant;
    onPress?: (restaurant: Restaurant) => void;
}

const RestaurantCardComponent = ({ restaurant, onPress }: RestaurantCardProps) => {
    const handlePress = useCallback(() => onPress?.(restaurant), [onPress, restaurant]);

    const {
        name,
        coverUrl,
        logoUrl,
        cuisineType,
        city,
        rating,
        totalRatings,
        minOrderAmount,
        isOpen,
    } = restaurant;

    return (
        <Pressable
            onPress={handlePress}
            android_ripple={{ color: 'rgba(245,89,5,0.08)' }}
            style={({ pressed }) => [
                styles.card,
                pressed && { transform: [{ scale: 0.99 }], opacity: 0.95 },
            ]}
        >
            <View style={styles.coverWrap}>
                <Image
                    source={{ uri: coverUrl }}
                    placeholder={COVER_BLURHASH}
                    contentFit="cover"
                    transition={200}
                    style={styles.cover}
                />

                <View
                    style={[
                        styles.statusBadge,
                        { backgroundColor: isOpen ? '#16A34A' : '#9CA3AF' },
                    ]}
                >
                    <View style={styles.statusDot} />
                    <AppText
                        variant="body-sm"
                        align="left"
                        style={styles.statusText}
                    >
                        {isOpen ? 'Open' : 'Closed'}
                    </AppText>
                </View>

                <View style={styles.logoWrap}>
                    <Image
                        source={{ uri: logoUrl }}
                        contentFit="cover"
                        transition={150}
                        style={styles.logo}
                    />
                </View>
            </View>

            <View style={styles.body}>
                <View style={styles.titleRow}>
                    <AppText variant="headline-sm" align="left" numberOfLines={1} style={styles.title}>
                        {name}
                    </AppText>

                    <View style={styles.ratingPill}>
                        <Ionicons name="star" size={12} color="#F59E0B" />
                        <AppText variant="body-sm" align="left" style={styles.ratingText}>
                            {rating.toFixed(1)}
                        </AppText>
                        <AppText variant="body-sm" align="left" style={styles.ratingCount}>
                            ({totalRatings})
                        </AppText>
                    </View>
                </View>

                <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                        <Ionicons name="restaurant-outline" size={13} color="#6B7280" />
                        <AppText variant="body-sm" align="left" style={styles.metaText} numberOfLines={1}>
                            {cuisineType}
                        </AppText>
                    </View>

                    <View style={styles.metaDivider} />

                    <View style={styles.metaItem}>
                        <Ionicons name="location-outline" size={13} color="#6B7280" />
                        <AppText variant="body-sm" align="left" style={styles.metaText} numberOfLines={1}>
                            {city}
                        </AppText>
                    </View>
                </View>

                <View style={styles.footer}>
                    <View style={styles.minOrderPill}>
                        <Ionicons name="cart-outline" size={13} color="#F55905" />
                        <AppText variant="body-sm" align="left" style={styles.minOrderText}>
                            Min {minOrderAmount.toFixed(0)} SAR
                        </AppText>
                    </View>

                    <View style={styles.cta}>
                        <AppText variant="body-sm" align="left" style={styles.ctaText}>
                            View menu
                        </AppText>
                        <Ionicons name="chevron-forward" size={14} color="#F55905" />
                    </View>
                </View>
            </View>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        borderRadius: 20,
        marginHorizontal: 16,
        marginBottom: 16,
        overflow: 'hidden',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 14,
        elevation: 4,
    },
    coverWrap: { position: 'relative', width: '100%', aspectRatio: 16 / 9, backgroundColor: '#F3F4F6' },
    cover: { width: '100%', height: '100%' },
    statusBadge: {
        position: 'absolute',
        top: 12,
        left: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
    },
    statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
    statusText: { color: '#fff', fontSize: 11, fontWeight: '600' },
    logoWrap: {
        position: 'absolute',
        bottom: -22,
        right: 16,
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: '#fff',
        padding: 3,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 8,
        elevation: 5,
    },
    logo: { width: '100%', height: '100%', borderRadius: 13 },
    body: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14, gap: 8 },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        paddingRight: 70,
    },
    title: { flex: 1, color: '#0F172A', fontSize: 17 },
    ratingPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
    },
    ratingText: { color: '#92400E', fontWeight: '700', fontSize: 12 },
    ratingCount: { color: '#A16207', fontSize: 11 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
    metaText: { color: '#6B7280', fontSize: 12 },
    metaDivider: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#D1D5DB' },
    footer: {
        marginTop: 6,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    minOrderPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#FFF3EC',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
    },
    minOrderText: { color: '#F55905', fontWeight: '600', fontSize: 12 },
    cta: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    ctaText: { color: '#F55905', fontWeight: '600', fontSize: 12 },
});

export const RestaurantCard = memo(RestaurantCardComponent);
export default RestaurantCard;
