import { useCallback, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useOrderRepository } from '..';
import type { PromoValidatePayload, PromoValidationResult } from '../types';
import { getCheckoutErrorMessage } from './useCheckout';

interface PromoState {
    applied: PromoValidationResult | null;
    error: string | null;
}

const initialState: PromoState = {
    applied: null,
    error: null,
};

export const usePromoValidate = () => {
    const { validatePromo } = useOrderRepository();
    const [state, setState] = useState<PromoState>(initialState);

    const mutation = useMutation<PromoValidationResult, AxiosError, PromoValidatePayload>({
        mutationFn: (payload) => validatePromo(payload),
        retry: 0,
        onSuccess: (result) => {
            if (result.isValid === false) {
                setState({
                    applied: null,
                    error: result.message ?? null,
                });
                return;
            }
            setState({ applied: result, error: null });
        },
        onError: (err) => {
            const message = getCheckoutErrorMessage(err);
            setState({ applied: null, error: message });
        },
    });

    const applyPromo = useCallback(
        (payload: PromoValidatePayload) => {
            if (!payload.code.trim()) return;
            mutation.mutate(payload);
        },
        [mutation],
    );

    const clearPromo = useCallback(() => {
        setState(initialState);
        mutation.reset();
    }, [mutation]);

    return useMemo(
        () => ({
            applyPromo,
            clearPromo,
            applied: state.applied,
            error: state.error,
            isValidating: mutation.isPending,
        }),
        [applyPromo, clearPromo, mutation.isPending, state.applied, state.error],
    );
};
