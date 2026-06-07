import React, { memo, useCallback, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AnimatedPressable from '@/components/ui/AnimatedPressable';
import { colors, radii, screen, shadows, typography } from '@/components/ui/theme';
import { Toast, useToast } from '@/modules/delivery/components/Toast';
import { useAddToCart, getAddToCartErrorMessage } from '@/modules/Cart/hooks/useAddToCart';
import { useLanguageStore } from '@/store/useLanguageStore';
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
    restaurantId: string;
    restaurantName: string;
    currency?: string;
    showSectionHeaders?: boolean;
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
    restaurantId,
    restaurantName,
    currency = 'ILS',
    showSectionHeaders = true,
}: MealsListProps) => {
    const [activeMeal, setActiveMeal] = useState<Meal | null>(null);
    const [pendingMealId, setPendingMealId] = useState<string | null>(null);
    const { toast, show, hide } = useToast();
    const addToCart = useAddToCart();
    const isRTL = useLanguageStore((s) => s.isRTL);

    const handleMealPress = useCallback((meal: Meal) => {
        if (meal.isAvailable) setActiveMeal(meal);
    }, []);

    const handleModalClose = useCallback(() => setActiveMeal(null), []);

    const handleConfirm = useCallback(
        (result: MealSelectionResult) => {
            setActiveMeal(null);
            setPendingMealId(result.meal.id);
            addToCart.mutate(
                {
                    restaurantId,
                    restaurantName,
                    mealId: result.meal.id,
                    mealName: result.meal.name,
                    mealImage: result.meal.imageUrl,
                    basePrice: result.meal.price,
                    quantity: result.quantity,
                    options: result.selectedOptions.map(({ option }) => ({
                        optionId: option.id,
                        optionName: option.name,
                        extraPrice: option.extraPrice,
                    })),
                },
                {
                    onSuccess: () => {
                        onAddToCart?.(result);
                        show('تمت إضافة الوجبة إلى السلة', 'success');
                    },
                    onError: (err) => {
                        const msg = getAddToCartErrorMessage(err) ?? 'تعذر إضافة الوجبة إلى السلة';
                        show(msg, 'error');
                    },
                    onSettled: () => setPendingMealId(null),
                },
            );
        },
        [addToCart, onAddToCart, restaurantId, restaurantName, show],
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
                <Ionicons name="alert-circle-outline" size={20} color={colors.primary} />
                <Text style={styles.errorText}>Couldn&apos;t load meals.</Text>
                {onRetry && (
                    <AnimatedPressable onPress={onRetry} style={styles.retryBtn}>
                        <Ionicons name="refresh" size={14} color={colors.primary} />
                        <Text style={styles.retryText}>Retry</Text>
                    </AnimatedPressable>
                )}
            </View>
        );
    }

    if (!sections.length) {
        return (
            <View style={styles.emptyWrap}>
                <View style={styles.emptyIcon}>
                    <Ionicons name="fast-food-outline" size={20} color={colors.primary} />
                </View>
                <Text style={styles.emptyText}>No meals in this menu yet.</Text>
            </View>
        );
    }

    return (
        <View style={styles.wrap}>
            {sections.map((section) => (
                <View key={section.id} style={styles.section}>
                    {showSectionHeaders ? (
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionName}>{section.name}</Text>
                            <View style={styles.countPill}>
                                <Text style={styles.countText}>{section.meals.length}</Text>
                            </View>
                        </View>
                    ) : null}
                    <View style={styles.mealsList}>
                        {section.meals.map((meal, index) => (
                            <MealCard
                                key={meal.id}
                                meal={meal}
                                onPress={handleMealPress}
                                currency={currency}
                                isAdding={pendingMealId === meal.id}
                                isRTL={isRTL}
                                index={index}
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

            <Toast
                message={toast.message}
                type={toast.type}
                visible={toast.visible}
                onHide={hide}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    wrap: { paddingHorizontal: screen.horizontal, paddingTop: 4, gap: 24 },
    section: { gap: 10 },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sectionName: {
        color: colors.onSurface,
        fontFamily: typography.headlineSemi,
        fontSize: 18,
    },
    countPill: {
        backgroundColor: colors.surfaceContainer,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: radii.pill,
    },
    countText: {
        color: colors.outline,
        fontFamily: typography.bodyBold,
        fontSize: 11,
    },
    mealsList: { gap: 10 },

    skeletonSection: { gap: 10 },
    skeletonTitle: {
        width: 120,
        height: 18,
        borderRadius: radii.sm,
        backgroundColor: colors.surfaceContainerHighest,
    },
    skeletonCard: {
        height: 118,
        borderRadius: radii.xl,
        backgroundColor: colors.surfaceContainerHighest,
    },

    errorWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginHorizontal: screen.horizontal,
        marginVertical: 16,
        padding: 14,
        borderRadius: radii.xl,
        backgroundColor: colors.card,
        ...shadows.soft,
    },
    errorText: {
        color: colors.outline,
        flex: 1,
        fontFamily: typography.bodyMedium,
        fontSize: 12,
    },
    retryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: radii.pill,
        backgroundColor: colors.faintPrimary,
    },
    retryText: {
        color: colors.primary,
        fontFamily: typography.bodyBold,
        fontSize: 12,
    },

    emptyWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginHorizontal: screen.horizontal,
        marginVertical: 16,
        padding: 14,
        borderRadius: radii.xl,
        backgroundColor: colors.card,
        ...shadows.soft,
    },
    emptyIcon: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: colors.faintPrimary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        color: colors.outline,
        fontFamily: typography.bodyMedium,
        fontSize: 12,
        flex: 1,
    },
});

export default memo(MealsList);
