import React, { memo, useCallback } from 'react';
import {
    Modal,
    View,
    ScrollView,
    Pressable,
    StyleSheet,
    StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import AppText from '@/components/ui/AppText';
import { Meal, MealOption, MealOptionGroup } from '../entities/Meal';
import {
    useMealOptionsSelection,
    MealSelectionResult,
} from '../hooks/useMealOptionsSelection';

const MEAL_BLURHASH = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

interface MealOptionsModalProps {
    visible: boolean;
    meal: Meal | null;
    onClose: () => void;
    onConfirm: (result: MealSelectionResult) => void;
    confirmLabel?: string;
    currency?: string;
}

interface OptionRowProps {
    option: MealOption;
    selected: boolean;
    selectionType: 'single' | 'multiple';
    disabled: boolean;
    onToggle: (optionId: string) => void;
}

const OptionRow = memo(({ option, selected, selectionType, disabled, onToggle }: OptionRowProps) => {
    const handlePress = useCallback(() => {
        if (!disabled) onToggle(option.id);
    }, [disabled, onToggle, option.id]);

    const indicatorContent =
        selectionType === 'single' ? (
            <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
                {selected && <View style={styles.radioInner} />}
            </View>
        ) : (
            <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                {selected && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
        );

    return (
        <Pressable
            onPress={handlePress}
            disabled={disabled || !option.isAvailable}
            android_ripple={{ color: 'rgba(245,89,5,0.08)' }}
            style={({ pressed }) => [
                styles.optionRow,
                selected && styles.optionRowSelected,
                (disabled || !option.isAvailable) && styles.optionRowDisabled,
                pressed && !disabled && { opacity: 0.92 },
            ]}
        >
            {indicatorContent}
            <View style={{ flex: 1 }}>
                <AppText
                    variant="body-md"
                    align="left"
                    style={[
                        styles.optionName,
                        !option.isAvailable && styles.optionNameMuted,
                    ]}
                    numberOfLines={2}
                >
                    {option.name}
                </AppText>
                {!option.isAvailable && (
                    <AppText variant="body-sm" align="left" style={styles.unavailableText}>
                        Unavailable
                    </AppText>
                )}
            </View>
            {option.extraPrice > 0 && (
                <AppText variant="body-sm" align="left" style={styles.extraPrice}>
                    +{option.extraPrice.toFixed(2)}
                </AppText>
            )}
        </Pressable>
    );
});
OptionRow.displayName = 'OptionRow';

interface OptionGroupBlockProps {
    group: MealOptionGroup;
    isOptionSelected: (groupId: string, optionId: string) => boolean;
    onToggle: (group: MealOptionGroup, optionId: string) => void;
    selectedCount: number;
    errorMessage?: string;
    showError: boolean;
}

const OptionGroupBlock = memo(
    ({ group, isOptionSelected, onToggle, selectedCount, errorMessage, showError }: OptionGroupBlockProps) => {
        const handleToggle = useCallback(
            (optionId: string) => onToggle(group, optionId),
            [group, onToggle],
        );

        const reachedMax =
            group.selectionType === 'multiple' && selectedCount >= group.maxSelections;

        const helperText =
            group.selectionType === 'single'
                ? group.isRequired
                    ? 'Choose one (required)'
                    : 'Choose one'
                : group.maxSelections > 1
                    ? `Choose up to ${group.maxSelections}`
                    : 'Choose any';

        return (
            <View style={styles.groupBlock}>
                <View style={styles.groupHeader}>
                    <View style={{ flex: 1 }}>
                        <AppText variant="headline-sm" align="left" style={styles.groupTitle}>
                            {group.name}
                        </AppText>
                        <AppText variant="body-sm" align="left" style={styles.groupHelper}>
                            {helperText}
                        </AppText>
                    </View>
                    {group.isRequired ? (
                        <View style={styles.requiredBadge}>
                            <AppText variant="body-sm" align="left" style={styles.requiredText}>
                                Required
                            </AppText>
                        </View>
                    ) : (
                        <View style={styles.optionalBadge}>
                            <AppText variant="body-sm" align="left" style={styles.optionalText}>
                                Optional
                            </AppText>
                        </View>
                    )}
                </View>

                {showError && errorMessage && (
                    <View style={styles.errorRow}>
                        <Ionicons name="alert-circle" size={14} color="#DC2626" />
                        <AppText variant="body-sm" align="left" style={styles.errorText}>
                            {errorMessage}
                        </AppText>
                    </View>
                )}

                <View style={styles.optionsList}>
                    {group.options.map((option) => {
                        const selected = isOptionSelected(group.id, option.id);
                        const disabled =
                            !selected && reachedMax && group.selectionType === 'multiple';
                        return (
                            <OptionRow
                                key={option.id}
                                option={option}
                                selected={selected}
                                selectionType={group.selectionType}
                                disabled={disabled}
                                onToggle={handleToggle}
                            />
                        );
                    })}
                </View>
            </View>
        );
    },
);
OptionGroupBlock.displayName = 'OptionGroupBlock';

const QtyStepper = ({
    quantity,
    onIncrement,
    onDecrement,
}: {
    quantity: number;
    onIncrement: () => void;
    onDecrement: () => void;
}) => (
    <View style={styles.qtyWrap}>
        <Pressable
            onPress={onDecrement}
            style={({ pressed }) => [styles.qtyBtn, pressed && { opacity: 0.6 }]}
            hitSlop={6}
            disabled={quantity <= 1}
        >
            <Ionicons name="remove" size={16} color={quantity <= 1 ? '#CBD5E1' : '#0F172A'} />
        </Pressable>
        <AppText variant="body-md" align="center" style={styles.qtyValue}>
            {quantity}
        </AppText>
        <Pressable
            onPress={onIncrement}
            style={({ pressed }) => [styles.qtyBtn, pressed && { opacity: 0.6 }]}
            hitSlop={6}
        >
            <Ionicons name="add" size={16} color="#0F172A" />
        </Pressable>
    </View>
);

const MealOptionsModal = ({
    visible,
    meal,
    onClose,
    onConfirm,
    confirmLabel = 'Add to cart',
    currency = 'SAR',
}: MealOptionsModalProps) => {
    const {
        quantity,
        increment,
        decrement,
        isOptionSelected,
        toggleOption,
        groupValidations,
        isValid,
        totalPrice,
        firstInvalidGroupId,
        buildResult,
    } = useMealOptionsSelection({ meal });

    const [showErrors, setShowErrors] = React.useState(false);

    React.useEffect(() => {
        if (!visible) setShowErrors(false);
    }, [visible]);

    const handleConfirm = useCallback(() => {
        if (!isValid) {
            setShowErrors(true);
            return;
        }
        const result = buildResult();
        if (result) onConfirm(result);
    }, [isValid, buildResult, onConfirm]);

    const validationByGroupId = React.useMemo(() => {
        const map: Record<string, (typeof groupValidations)[number]> = {};
        for (const v of groupValidations) map[v.groupId] = v;
        return map;
    }, [groupValidations]);

    if (!meal) return null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            <View style={styles.modalRoot}>
                <View style={styles.handleBar} />

                <View style={styles.headerBar}>
                    <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={10}>
                        <Ionicons name="close" size={20} color="#0F172A" />
                    </Pressable>
                    <AppText variant="headline-sm" align="center" style={styles.headerTitle} numberOfLines={1}>
                        Customize
                    </AppText>
                    <View style={styles.closeBtnPlaceholder} />
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {meal.imageUrl ? (
                        <View style={styles.heroImageWrap}>
                            <Image
                                source={{ uri: meal.imageUrl }}
                                placeholder={MEAL_BLURHASH}
                                contentFit="cover"
                                transition={200}
                                style={styles.heroImage}
                            />
                        </View>
                    ) : null}

                    <View style={styles.titleBlock}>
                        <AppText variant="headline-md" align="left" style={styles.mealName}>
                            {meal.name}
                        </AppText>
                        {meal.description ? (
                            <AppText variant="body-md" align="left" style={styles.mealDescription}>
                                {meal.description}
                            </AppText>
                        ) : null}
                        <View style={styles.basePriceRow}>
                            <AppText variant="body-sm" align="left" style={styles.basePriceLabel}>
                                Base price
                            </AppText>
                            <AppText variant="body-md" align="left" style={styles.basePrice}>
                                {meal.price.toFixed(2)} {currency}
                            </AppText>
                        </View>
                    </View>

                    {meal.optionGroups.length === 0 ? (
                        <View style={styles.emptyOptionsWrap}>
                            <Ionicons name="checkmark-circle-outline" size={20} color="#94A3B8" />
                            <AppText variant="body-sm" align="left" style={styles.emptyOptionsText}>
                                No customizations for this meal.
                            </AppText>
                        </View>
                    ) : (
                        meal.optionGroups.map((group) => {
                            const v = validationByGroupId[group.id];
                            return (
                                <OptionGroupBlock
                                    key={group.id}
                                    group={group}
                                    isOptionSelected={isOptionSelected}
                                    onToggle={toggleOption}
                                    selectedCount={v?.selectedCount ?? 0}
                                    errorMessage={v?.message}
                                    showError={showErrors && v != null && !v.valid}
                                />
                            );
                        })
                    )}
                </ScrollView>

                <View style={styles.footer}>
                    <QtyStepper
                        quantity={quantity}
                        onIncrement={increment}
                        onDecrement={decrement}
                    />

                    <Pressable
                        onPress={handleConfirm}
                        android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
                        style={({ pressed }) => [
                            styles.confirmBtn,
                            !isValid && showErrors && styles.confirmBtnInvalid,
                            pressed && { opacity: 0.92 },
                        ]}
                    >
                        <AppText variant="body-md" align="left" style={styles.confirmLabel}>
                            {confirmLabel}
                        </AppText>
                        <View style={styles.confirmDivider} />
                        <AppText variant="body-md" align="left" style={styles.confirmPrice}>
                            {totalPrice.toFixed(2)} {currency}
                        </AppText>
                    </Pressable>
                </View>

                {showErrors && firstInvalidGroupId && (
                    <View style={styles.toast} pointerEvents="none">
                        <Ionicons name="alert-circle" size={16} color="#fff" />
                        <AppText variant="body-sm" align="left" style={styles.toastText}>
                            Please complete required selections.
                        </AppText>
                    </View>
                )}
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalRoot: { flex: 1, backgroundColor: '#fff' },
    handleBar: {
        alignSelf: 'center',
        width: 44,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#E5E7EB',
        marginTop: 8,
    },
    headerBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 8,
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeBtnPlaceholder: { width: 36, height: 36 },
    headerTitle: { color: '#0F172A', flex: 1 },

    scrollContent: { paddingBottom: 24 },

    heroImageWrap: {
        width: '100%',
        aspectRatio: 16 / 10,
        backgroundColor: '#F3F4F6',
        marginBottom: 4,
    },
    heroImage: { width: '100%', height: '100%' },

    titleBlock: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, gap: 6 },
    mealName: { color: '#0F172A' },
    mealDescription: { color: '#6B7280', lineHeight: 20 },
    basePriceRow: {
        marginTop: 6,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    basePriceLabel: { color: '#94A3B8' },
    basePrice: { color: '#0F172A', fontWeight: '700' },

    emptyOptionsWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 20,
        paddingVertical: 24,
    },
    emptyOptionsText: { color: '#94A3B8' },

    groupBlock: {
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 6,
        gap: 8,
    },
    groupHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    groupTitle: { color: '#0F172A' },
    groupHelper: { color: '#6B7280', marginTop: 2 },
    requiredBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    requiredText: { color: '#B91C1C', fontWeight: '700', fontSize: 11 },
    optionalBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: '#F1F5F9',
    },
    optionalText: { color: '#475569', fontWeight: '700', fontSize: 11 },

    errorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#FEF2F2',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    errorText: { color: '#B91C1C', fontWeight: '600' },

    optionsList: { gap: 8, marginTop: 4 },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 14,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    optionRowSelected: {
        borderColor: '#F55905',
        backgroundColor: '#FFF8F2',
    },
    optionRowDisabled: { opacity: 0.55 },
    optionName: { color: '#0F172A', fontWeight: '600' },
    optionNameMuted: { color: '#94A3B8' },
    unavailableText: { color: '#94A3B8', marginTop: 2 },
    extraPrice: { color: '#F55905', fontWeight: '700' },

    radioOuter: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: '#CBD5E1',
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioOuterSelected: { borderColor: '#F55905' },
    radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#F55905' },

    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#CBD5E1',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxSelected: {
        borderColor: '#F55905',
        backgroundColor: '#F55905',
    },

    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 20,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        backgroundColor: '#fff',
    },
    qtyWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#F1F5F9',
        borderRadius: 999,
        paddingHorizontal: 4,
    },
    qtyBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    qtyValue: { minWidth: 24, color: '#0F172A', fontWeight: '700' },

    confirmBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        backgroundColor: '#F55905',
        paddingVertical: 14,
        borderRadius: 999,
        shadowColor: '#F55905',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 6,
    },
    confirmBtnInvalid: { backgroundColor: '#94A3B8', shadowOpacity: 0 },
    confirmLabel: { color: '#fff', fontWeight: '700' },
    confirmDivider: { width: 1, height: 16, backgroundColor: 'rgba(255,255,255,0.4)' },
    confirmPrice: { color: '#fff', fontWeight: '700' },

    toast: {
        position: 'absolute',
        bottom: 96,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: 'rgba(15,23,42,0.92)',
    },
    toastText: { color: '#fff', fontWeight: '600' },
});

export default memo(MealOptionsModal);
