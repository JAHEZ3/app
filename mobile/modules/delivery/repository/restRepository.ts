import { authApi, deliveryApi, orderApi } from '@/lib/api';
import { DeliveryAgent } from '../entities/DeliveryAgent';
import { ActiveAssignment, ApplicationQuestion, DeliveryApplicationFormData, PendingOrder } from '../types';
import { DeliveryTokensDTO } from '../dto/DeliveryAgent';
import { toDeliveryAdapter } from '../adapter/toDeliveryAdapter';
import { DeliveryRepository } from './DeliveryRepository';

const num = (v: unknown): number | undefined => {
    if (v === null || v === undefined) return undefined;
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : undefined;
};

const toOrderShape = (raw: unknown): Omit<ActiveAssignment, 'status'> & { status: string } | null => {
    if (!raw || typeof raw !== 'object') return null;
    const r = raw as Record<string, any>;
    const orderId = r.orderId ?? r.id;
    if (typeof orderId !== 'string') return null;

    // The customer's pinned location is stored on the backend as
    // `deliveryAddressSnapshot` / `delivery_address_snapshot` (same JSONB column
    // written by checkout). We check that first so agents always see the exact
    // lat/lng the customer selected, then fall back to other server shapes.
    const addrSnap =
        r.deliveryAddressSnapshot ??
        r.delivery_address_snapshot ??
        r.addressSnapshot ??
        r.address_snapshot ??
        null;

    const dropLat = num(
        r.dropoff?.lat ??
        addrSnap?.lat ??
        r.delivery?.latitude ??
        r.dropoffLat,
    );
    const dropLng = num(
        r.dropoff?.lng ??
        addrSnap?.lng ??
        r.delivery?.longitude ??
        r.dropoffLng,
    );

    // Build a human-readable address from the snapshot fields when present.
    const dropAddress: string | undefined =
        r.dropoff?.address ??
        (addrSnap
            ? [addrSnap.street, addrSnap.city].filter(Boolean).join(', ')
            : undefined) ??
        r.delivery?.addressLine ??
        r.delivery?.address;

    const pickLat = num(r.pickup?.lat ?? r.restaurant?.latitude ?? r.pickupLat);
    const pickLng = num(r.pickup?.lng ?? r.restaurant?.longitude ?? r.pickupLng);

    return {
        orderId,
        orderNumber: r.orderNumber ?? undefined,
        status: typeof r.status === 'string' ? r.status : 'ASSIGNED',
        dropoff: dropLat !== undefined && dropLng !== undefined ? {
            lat: dropLat,
            lng: dropLng,
            address: dropAddress,
        } : null,
        pickup: pickLat !== undefined && pickLng !== undefined ? {
            lat: pickLat,
            lng: pickLng,
            name: r.pickup?.name ?? r.restaurant?.name ?? r.restaurantName,
            address: r.pickup?.address ?? r.restaurant?.address,
        } : null,
        customerName:
            r.customerName ??
            r.customerNameSnapshot ??
            r.customer_name_snapshot ??
            r.customer?.name ??
            r.delivery?.contactName,
        customerPhone:
            r.customerPhone ??
            r.customerPhoneSnapshot ??
            r.customer_phone_snapshot ??
            r.customer?.phone ??
            r.delivery?.contactPhone,
        restaurantName: r.restaurantName ?? r.restaurant?.name,
        restaurantPhone: r.restaurantPhone ?? r.restaurant?.phone,
        total: num(r.total ?? r.totalAmount ?? r.total_amount),
        itemsCount: num(r.itemsCount ?? r.items?.length),
        notes:
            typeof r.notes === 'string' ? r.notes :
            typeof r.customerNotes === 'string' ? r.customerNotes :
            addrSnap?.notes ?? undefined,
    };
};

const toActiveAssignment = (raw: unknown): ActiveAssignment | null =>
    toOrderShape(raw) as ActiveAssignment | null;

const toPendingOrder = (raw: unknown): PendingOrder | null =>
    toOrderShape(raw) as PendingOrder | null;

export const restRepository = (): DeliveryRepository => ({
    register: async (phone) => {
        await authApi.post('/api/auth/delivery/register', { phone });
    },

    verifyOtp: async ({ phone, otp }) => {
        const res = await authApi.post('/api/auth/verify-otp', { phone, otp });
        return res.data.data as DeliveryTokensDTO;
    },

    login: async ({ phone, password }) => {
        const res = await deliveryApi.post('/api/delivery/login', { phone, password });
        return res.data.data as DeliveryTokensDTO;
    },

    getProfile: async (): Promise<DeliveryAgent> => {
        const res = await deliveryApi.get('/api/delivery/profile');
        return toDeliveryAdapter(res.data.data);
    },

    getQuestions: async (): Promise<ApplicationQuestion[]> => {
        const res = await deliveryApi.get('/api/delivery/profile/questions');
        const raw: Array<{ question: string }> = res.data.data ?? res.data;
        return raw.map((q) => ({ question: q.question, answer: '' }));
    },

    submitProfile: async (form: DeliveryApplicationFormData): Promise<void> => {
        const data = new FormData();

        data.append('firstName', form.firstName);
        data.append('lastName', form.lastName);
        data.append('dateOfBirth', form.dateOfBirth);
        data.append('nationalIdNumber', form.nationalIdNumber);
        data.append('city', form.city);
        data.append('vehicleType', form.vehicleType);
        if (form.vehicleLicenseNumber) {
            data.append('vehicleLicenseNumber', form.vehicleLicenseNumber);
        }
        data.append('emergencyContactName', form.emergencyContactName);
        data.append('emergencyContactPhone', form.emergencyContactPhone);
        // Shape matches the restaurant complete-profile payload so a single
        // backend `payment_info` jsonb column can store either flavour.
        const p = form.payment;
        const paymentPayload = p.type === 'bank_account'
            ? {
                type: 'bank_account',
                accountHolderName: p.accountHolderName,
                bankName: p.bankName,
                accountNumber: p.accountNumber,
                iban: p.iban,
            }
            : {
                type: 'wallet',
                accountHolderName: p.accountHolderName,
                walletType: p.walletType,
                accountNumber: p.accountNumber,
                phone: p.walletPhone,
            };
        data.append('paymentInfo', JSON.stringify(paymentPayload));
        data.append('password', form.password);
        data.append('termsAccepted', 'true');
        data.append('answers', JSON.stringify(form.answers));

        if (form.profilePicture) {
            data.append('profilePicture', {
                uri: form.profilePicture.uri,
                type: form.profilePicture.type,
                name: form.profilePicture.name,
            } as unknown as Blob);
        }

        if (form.idPicture) {
            data.append('idPicture', {
                uri: form.idPicture.uri,
                type: form.idPicture.type,
                name: form.idPicture.name,
            } as unknown as Blob);
        }

        await deliveryApi.post('/api/delivery/profile', data, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },

    logout: async (refreshToken) => {
        await authApi.delete('/api/auth/logout', { data: { refreshToken } });
    },

    getActiveAssignment: async (): Promise<ActiveAssignment | null> => {
        try {
            const res = await deliveryApi.get('/api/delivery/assignments/active');
            const raw = res.data?.data ?? res.data;
            return toActiveAssignment(raw);
        } catch (err: any) {
            if (err?.response?.status === 404) return null;
            throw err;
        }
    },

    getPendingOrders: async (): Promise<PendingOrder[]> => {
        try {
            const res = await deliveryApi.get('/api/delivery/orders/available');
            const raw: unknown[] = res.data?.data ?? res.data ?? [];
            return (Array.isArray(raw) ? raw : [])
                .map(toPendingOrder)
                .filter((o): o is PendingOrder => o !== null);
        } catch (err: any) {
            if (err?.response?.status === 404) return [];
            throw err;
        }
    },

    acceptOrder: async (orderId: string): Promise<ActiveAssignment> => {
        // POST hits the order-service (NOT delivery-service), where the
        // accept/reject endpoints live. orderApi falls back to the delivery
        // token when no customer token is in the store.
        await orderApi.post(`/api/order/orders/${orderId}/delivery/accept`);
        // The endpoint returns just `{ orderId, acceptance: 'accepted' }`;
        // refresh the active assignment so the UI gets the full pickup +
        // dropoff coords for the map.
        const res = await deliveryApi.get('/api/delivery/assignments/active');
        const assignment = toActiveAssignment(res.data?.data ?? res.data);
        if (!assignment) throw new Error('Invalid assignment response');
        return assignment;
    },

    rejectOrder: async (orderId: string, reason?: string): Promise<void> => {
        await orderApi.post(
            `/api/order/orders/${orderId}/delivery/reject`,
            reason ? { reason } : {},
        );
    },
});
