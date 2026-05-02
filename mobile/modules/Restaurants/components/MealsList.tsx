import React, { memo, useCallback, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppText from '@/components/ui/AppText';
import { Meal } from '../entities/Meal';
import { MenuSection } from '../entities/MenuSection';
import { MealSelectionResult } from '../hooks/useMealOptionsSelection';
import MealCard from './MealCard';
import MealOptionsModal from './MealOptionsModal';

interface MealsListProps {
    sections: MenuSection[];
    isLoading: boolean;
    isError: boolean;
    onRetry?: () => void;
    onAddToCart?: (result: MealSelectionResult) => void;
    currency?: string;
}

const SectionSkeleton = () => (
    <View style={styles.skeletonSection}>
        <View style={styles.skeletonTitle} />
        {[0, 1, 2].map((i) => (
            <View key={i} style={styles.skeletonCard} />
        ))}
    </View>
);

const MealsList = ({
    sections,
    isLoading,
    isError,
    onRetry,
    onAddToCart,
    currency = 'SAR',
}: MealsListProps) => {
    const [activeMeal, setActiveMeal] = useState<Meal | null>(null);

    const handleMealPress = useCallback((meal: Meal) => {
        if (meal.isAvailable) setActiveMeal(meal);
    }, []);

    const handleModalClose = useCallback(() => setActiveMeal(null), []);

    const handleConfirm = useCallback(
        (result: MealSelectionResult) => {
            onAddToCart?.(result);
            setActiveMeal(null);
        },
        [onAddToCart],
    );

    if (isLoading) {
        return (
            <View style={styles.wrap}>
                <SectionSkeleton />
            </View>
        );
    }

    if (isError) {
        return (
            <View style={styles.errorWrap}>
                <Ionicons name="alert-circle-outline" size={20} color="#F55905" />
                <AppText variant="body-sm" align="left" style={styles.errorText}>
                    Couldn't load meals.
                </AppText>
                {onRetry && (
                    <AppText
                        variant="body-sm"
                        align="left"
                        style={styles.retryText}
                        onPress={onRetry}
                    >
                        Retry
                    </AppText>
                )}
            </View>
        );
    }

    if (!sections.length) {
        return (
            <View style={styles.emptyWrap}>
                <Ionicons name="fast-food-outline" size={20} color="#CBD5E1" />
                <AppText variant="body-sm" align="left" style={styles.emptyText}>
                    No meals in this menu yet.
                </AppText>
            </View>
        );
    }

    return (
        <View style={styles.wrap}>
            {sections.map((section) => (
                <View key={section.id} style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <AppText variant="headline-sm" align="left" style={styles.sectionName}>
                            {section.name}
                        </AppText>
                        <View style={styles.countPill}>
                            <AppText variant="body-sm" align="left" style={styles.countText}>
                                {section.meals.length}
                            </AppText>
                        </View>
                    </View>
                    <View style={styles.mealsList}>
                        {section.meals.map((meal) => (
                            <MealCard
                                key={meal.id}
                                meal={meal}
                                onPress={handleMealPress}
                                currency={currency}
                            />
                        ))}
                    </View>
                </View>
            ))}

            <MealOptionsModal
                visible={!!activeMeal}
                meal={activeMeal}
                onClose={handleModalClose}
                onConfirm={handleConfirm}
                currency={currency}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    wrap: { paddingHorizontal: 20, paddingTop: 4, gap: 24 },
    section: { gap: 10 },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sectionName: { color: '#0F172A' },
    countPill: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 999,
    },
    countText: { color: '#475569', fontWeight: '700', fontSize: 11 },
    mealsList: { gap: 10 },

    skeletonSection: { gap: 10 },
    skeletonTitle: {
        width: 120,
        height: 18,
        borderRadius: 8,
        backgroundColor: '#E5E7EB',
    },
    skeletonCard: {
        height: 108,
        borderRadius: 16,
        backgroundColor: '#F1F5F9',
    },

    errorWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    errorText: { color: '#6B7280', flex: 1 },
    retryText: { color: '#F55905', fontWeight: '700' },

    emptyWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 20,
        paddingVertical: 20,
    },
    emptyText: { color: '#94A3B8' },
});

export default memo(MealsList);
