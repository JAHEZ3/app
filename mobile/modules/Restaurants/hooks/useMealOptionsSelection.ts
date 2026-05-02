import { useCallback, useEffect, useMemo, useState } from 'react';
import { Meal, MealOption, MealOptionGroup } from '../entities/Meal';

export type SelectionsByGroup = Record<string, string[]>;

export interface MealSelectionResult {
    meal: Meal;
    quantity: number;
    selections: SelectionsByGroup;
    selectedOptions: { groupId: string; option: MealOption }[];
    totalPrice: number;
    unitPrice: number;
}

export interface GroupValidation {
    groupId: string;
    valid: boolean;
    selectedCount: number;
    minSelections: number;
    maxSelections: number;
    message?: string;
}

interface UseMealOptionsSelectionOptions {
    meal: Meal | null;
    initialQuantity?: number;
}

interface UseMealOptionsSelectionResult {
    quantity: number;
    setQuantity: (q: number) => void;
    increment: () => void;
    decrement: () => void;
    selections: SelectionsByGroup;
    isOptionSelected: (groupId: string, optionId: string) => boolean;
    toggleOption: (group: MealOptionGroup, optionId: string) => void;
    selectedOptions: { groupId: string; option: MealOption }[];
    extrasTotal: number;
    unitPrice: number;
    totalPrice: number;
    groupValidations: GroupValidation[];
    isValid: boolean;
    firstInvalidGroupId: string | null;
    reset: () => void;
    buildResult: () => MealSelectionResult | null;
}

const buildInitialSelections = (meal: Meal | null): SelectionsByGroup => {
    if (!meal) return {};
    const result: SelectionsByGroup = {};
    for (const group of meal.optionGroups) {
        result[group.id] = [];
    }
    return result;
};

export const useMealOptionsSelection = ({
    meal,
    initialQuantity = 1,
}: UseMealOptionsSelectionOptions): UseMealOptionsSelectionResult => {
    const [quantity, setQuantityState] = useState(initialQuantity);
    const [selections, setSelections] = useState<SelectionsByGroup>(() =>
        buildInitialSelections(meal),
    );

    useEffect(() => {
        setQuantityState(initialQuantity);
        setSelections(buildInitialSelections(meal));
    }, [meal, initialQuantity]);

    const setQuantity = useCallback((q: number) => {
        setQuantityState(Math.max(1, Math.floor(q)));
    }, []);

    const increment = useCallback(() => setQuantityState((q) => q + 1), []);
    const decrement = useCallback(
        () => setQuantityState((q) => (q > 1 ? q - 1 : q)),
        [],
    );

    const isOptionSelected = useCallback(
        (groupId: string, optionId: string) =>
            (selections[groupId] ?? []).includes(optionId),
        [selections],
    );

    const toggleOption = useCallback(
        (group: MealOptionGroup, optionId: string) => {
            setSelections((prev) => {
                const current = prev[group.id] ?? [];
                const alreadySelected = current.includes(optionId);

                if (group.selectionType === 'single') {
                    if (alreadySelected && !group.isRequired) {
                        return { ...prev, [group.id]: [] };
                    }
                    return { ...prev, [group.id]: [optionId] };
                }

                if (alreadySelected) {
                    return {
                        ...prev,
                        [group.id]: current.filter((id) => id !== optionId),
                    };
                }

                if (current.length >= group.maxSelections) {
                    return prev;
                }
                return { ...prev, [group.id]: [...current, optionId] };
            });
        },
        [],
    );

    const selectedOptions = useMemo(() => {
        if (!meal) return [];
        const result: { groupId: string; option: MealOption }[] = [];
        for (const group of meal.optionGroups) {
            const ids = selections[group.id] ?? [];
            for (const id of ids) {
                const option = group.options.find((o) => o.id === id);
                if (option) result.push({ groupId: group.id, option });
            }
        }
        return result;
    }, [meal, selections]);

    const extrasTotal = useMemo(
        () => selectedOptions.reduce((sum, { option }) => sum + option.extraPrice, 0),
        [selectedOptions],
    );

    const unitPrice = (meal?.price ?? 0) + extrasTotal;
    const totalPrice = unitPrice * quantity;

    const groupValidations = useMemo<GroupValidation[]>(() => {
        if (!meal) return [];
        return meal.optionGroups.map((group) => {
            const selectedCount = (selections[group.id] ?? []).length;
            const minOk = selectedCount >= group.minSelections;
            const maxOk = selectedCount <= group.maxSelections;
            const valid = minOk && maxOk;
            let message: string | undefined;
            if (!minOk) {
                message =
                    group.minSelections === 1
                        ? 'Required'
                        : `Select at least ${group.minSelections}`;
            } else if (!maxOk) {
                message = `Select at most ${group.maxSelections}`;
            }
            return {
                groupId: group.id,
                valid,
                selectedCount,
                minSelections: group.minSelections,
                maxSelections: group.maxSelections,
                message,
            };
        });
    }, [meal, selections]);

    const isValid = groupValidations.every((g) => g.valid);
    const firstInvalidGroupId =
        groupValidations.find((g) => !g.valid)?.groupId ?? null;

    const reset = useCallback(() => {
        setQuantityState(initialQuantity);
        setSelections(buildInitialSelections(meal));
    }, [meal, initialQuantity]);

    const buildResult = useCallback((): MealSelectionResult | null => {
        if (!meal || !isValid) return null;
        return {
            meal,
            quantity,
            selections,
            selectedOptions,
            unitPrice,
            totalPrice,
        };
    }, [meal, isValid, quantity, selections, selectedOptions, unitPrice, totalPrice]);

    return {
        quantity,
        setQuantity,
        increment,
        decrement,
        selections,
        isOptionSelected,
        toggleOption,
        selectedOptions,
        extrasTotal,
        unitPrice,
        totalPrice,
        groupValidations,
        isValid,
        firstInvalidGroupId,
        reset,
        buildResult,
    };
};
