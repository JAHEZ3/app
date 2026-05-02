import React, { memo, useCallback } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import AppText from '@/components/ui/AppText';
import { Meal } from '../entities/Meal';

const MEAL_BLURHASH = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

interface MealCardProps {
    meal: Meal;
    onPress: (meal: Meal) => void;
    currency?: string;
}

const MealCard = ({ meal, onPress, currency = 'SAR' }: MealCardProps) => {
    const handlePress = useCallback(() => onPress(meal), [meal, onPress]);

    return (
        <Pressable
            onPress={handlePress}
            android_ripple={{ color: 'rgba(245,89,5,0.07)' }}
            style={({ pressed }) => [
                styles.card,
                !meal.isAvailable && styles.cardUnavailable,
                pressed && { opacity: 0.94 },
            ]}
        >
            <View style={styles.info}>
                <AppText variant="body-md" align="left" style={styles.name} numberOfLines={2}>
                    {meal.name}
                </AppText>
                {meal.description ? (
                    <AppText variant="body-sm" align="left" style={styles.description} numberOfLines={2}>
                        {meal.description}
                    </AppText>
                ) : null}
                <View style={styles.footer}>
                    <AppText variant="body-md" align="left" style={styles.price}>
                        {meal.price.toFixed(2)} {currency}
                    </AppText>
                    {meal.optionGroups.length > 0 && (
                        <AppText variant="body-sm" align="left" style={styles.customizable}>
                            Customizable
                        </AppText>
                    )}
                </View>
            </View>

            <View style={styles.imageWrap}>
                {meal.imageUrl ? (
                    <Image
                        source={{ uri: meal.imageUrl }}
                        placeholder={MEAL_BLURHASH}
                        contentFit="cover"
                        transition={150}
                        style={styles.image}
                    />
                ) : (
                    <View style={styles.imageFallback}>
                        <Ionicons name="fast-food-outline" size={24} color="#CBD5E1" />
                    </View>
                )}
                {!meal.isAvailable && (
                    <View style={styles.unavailableOverlay}>
                        <AppText variant="body-sm" align="center" style={styles.unavailableText}>
                            Unavailable
                        </AppText>
                    </View>
                )}
                <View style={styles.addBtn}>
                    <Ionicons name="add" size={16} color="#fff" />
                </View>
            </View>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    cardUnavailable: { opacity: 0.55 },
    info: { flex: 1, gap: 4 },
    name: { color: '#0F172A', fontWeight: '700', fontSize: 14 },
    description: { color: '#6B7280', lineHeight: 18 },
    footer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
    price: { color: '#F55905', fontWeight: '700' },
    customizable: {
        color: '#94A3B8',
        fontSize: 11,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 999,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    imageWrap: { width: 88, height: 88, borderRadius: 12, overflow: 'hidden', position: 'relative' },
    image: { width: '100%', height: '100%' },
    imageFallback: {
        width: '100%',
        height: '100%',
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
        justifyContent: 'center',
    },
    unavailableOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.7)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    unavailableText: { color: '#94A3B8', fontWeight: '700', fontSize: 11 },
    addBtn: {
        position: 'absolute',
        bottom: 6,
        right: 6,
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: '#F55905',
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default memo(MealCard);
