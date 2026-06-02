import { AxiosError } from 'axios';
import { customerApi } from '@/lib/api';
import type {
    CustomerAddress,
    CustomerAddressInput,
    CustomerAddressListResponse,
    CustomerAddressResponse,
} from '../types';
import { CustomerRepository } from './CustomerRepository';

const BASE = '/api/customer/addresses';

const asObject = (v: unknown): Record<string, unknown> | null =>
    v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

const str = (v: unknown): string | undefined =>
    typeof v === 'string' && v.length > 0 ? v : undefined;

const num = (v: unknown): number | undefined => {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string') {
        const n = parseFloat(v);
        return Number.isFinite(n) ? n : undefined;
    }
    return undefined;
};

const adaptAddress = (raw: unknown): CustomerAddress | null => {
    const o = asObject(raw);
    if (!o) return null;
    const id = str(o.id) ?? str(o.addressId);
    if (!id) return null;
    return {
        id,
        label: str(o.label),
        street: str(o.street),
        city: str(o.city),
        building: str(o.building),
        floor: str(o.floor),
        notes: str(o.notes),
        latitude: num(o.latitude) ?? num(o.lat),
        longitude: num(o.longitude) ?? num(o.lng),
        isDefault: Boolean(o.isDefault ?? o.is_default ?? false),
    };
};

const adaptList = (raw: unknown): CustomerAddress[] => {
    if (!Array.isArray(raw)) return [];
    return raw.map(adaptAddress).filter(Boolean) as CustomerAddress[];
};

const logError = (label: string, err: unknown) => {
    if (err instanceof AxiosError) {
        console.log(`[customer] ✗ ${label}`, {
            status: err.response?.status,
            data: err.response?.data,
            url: err.config?.url,
        });
    } else {
        console.log(`[customer] ✗ ${label} (non-axios)`, err);
    }
};

export const restRepository = (): CustomerRepository => ({
    getAddresses: async (): Promise<CustomerAddress[]> => {
        console.log(`[customer] → GET ${BASE}`);
        try {
            const res = await customerApi.get<CustomerAddressListResponse>(BASE);
            return adaptList(res.data?.data ?? []);
        } catch (err) {
            logError('getAddresses', err);
            throw err;
        }
    },

    createAddress: async (input: CustomerAddressInput): Promise<CustomerAddress> => {
        console.log(`[customer] → POST ${BASE}`, input);
        try {
            const res = await customerApi.post<CustomerAddressResponse>(BASE, input);
            const adapted = adaptAddress(res.data?.data);
            if (!adapted) throw new Error('createAddress: empty response');
            return adapted;
        } catch (err) {
            logError('createAddress', err);
            throw err;
        }
    },

    updateAddress: async (id: string, input: CustomerAddressInput): Promise<CustomerAddress> => {
        const url = `${BASE}/${id}`;
        console.log(`[customer] → PATCH ${url}`, input);
        try {
            const res = await customerApi.patch<CustomerAddressResponse>(url, input);
            const adapted = adaptAddress(res.data?.data);
            if (!adapted) throw new Error('updateAddress: empty response');
            return adapted;
        } catch (err) {
            logError('updateAddress', err);
            throw err;
        }
    },

    deleteAddress: async (id: string): Promise<void> => {
        const url = `${BASE}/${id}`;
        console.log(`[customer] → DELETE ${url}`);
        try {
            await customerApi.delete(url);
        } catch (err) {
            logError('deleteAddress', err);
            throw err;
        }
    },
});
