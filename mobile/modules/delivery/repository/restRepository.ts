import { authApi, deliveryApi, orderApi } from '@/lib/api';
import { DeliveryAgent } from '../entities/DeliveryAgent';
import {
    ActiveAssignment,
    ApplicationQuestion,
    DeliveryApplicationFormData,
    DeliveryOrder,
    DeliveryOrderItem,
    DeliveryOrderStatus,
    PendingOrder,
} from '../types';
import { DeliveryTokensDTO } from '../dto/DeliveryAgent';
import { toDeliveryAdapter } from '../adapter/toDeliveryAdapter';
import { DeliveryLoginResult, DeliveryRepository } from './DeliveryRepository';

const num = (v: unknown): number | undefined => {
    if (v === null || v === undefined) return undefined;
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : undefined;
};

const str = (v: unknown): string | undefined =>
    typeof v === 'string' && v.length > 0 ? v : undefined;

const iso = (v: unknown): string | undefined => {
    if (typeof v === 'string' && v.length > 0) return v;
    if (v instanceof Date) return v.toISOString();
    return undefined;
};

/**
 * Map the backend OrderStatus + deliveryAcceptance into the driver-facing
 * canonical status. The backend is the source of truth; this is purely a view
 * label so the UI can render the 5-step lifecycle the spec asks for.
 */
const toDeliveryStatus = (
    rawStatus: string | undefined,
    acceptance: string | undefined,
): DeliveryOrderStatus => {
    const s = (rawStatus ?? '').toLowerCase();
    if (s === 'cancelled' || s === 'refunded') return 'CANCELLED';
    if (s === 'delivered') return 'DELIVERED';
    if (s === 'out_for_delivery') return 'ON_THE_WAY';
    // confirmed / preparing / ready_for_pickup with an accepted driver
    if ((acceptance ?? '').toLowerCase() === 'accepted') return 'ACCEPTED';
    return 'ASSIGNED';
};

const toOrderItems = (raw: unknown): DeliveryOrderItem[] => {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((it): DeliveryOrderItem | null => {
            if (!it || typeof it !== 'object') return null;
            const r = it as Record<string, any>;
            const id = str(r.id) ?? str(r.mealId) ?? str(r.meal_id);
            const name =
                str(r.name) ??
                str(r.mealNameSnapshot) ??
                str(r.meal_name_snapshot) ??
                str(r.mealName);
            if (!id && !name) return null;
            const quantity = num(r.quantity) ?? 1;
            const unitPrice =
                num(r.unitPrice) ??
                num(r.unitPriceSnapshot) ??
                num(r.unit_price_snapshot) ??
                0;
            const totalPrice =
                num(r.totalPrice) ?? num(r.total_price) ?? unitPrice * quantity;
            const optionsRaw = Array.isArray(r.options) ? r.options : [];
            const options: { name: string; price?: number }[] = [];
            for (const o of optionsRaw) {
                if (!o || typeof o !== 'object') continue;
                const oName =
                    str(o.name) ??
                    str(o.optionNameSnapshot) ??
                    str(o.option_name_snapshot);
                if (!oName) continue;
                const price = num(o.price) ?? num(o.priceSnapshot) ?? num(o.price_snapshot);
                options.push(price === undefined ? { name: oName } : { name: oName, price });
            }
            return {
                id: id ?? name ?? Math.random().toString(36).slice(2),
                name: name ?? '',
                quantity,
                unitPrice,
                totalPrice,
                specialInstructions:
                    str(r.specialInstructions) ?? str(r.special_instructions),
                options,
            };
        })
        .filter((it): it is DeliveryOrderItem => it !== null);
};

const toDeliveryOrder = (raw: unknown): DeliveryOrder | null => {
    if (!raw || typeof raw !== 'object') return null;
    const r = raw as Record<string, any>;
    const orderId = str(r.orderId) ?? str(r.id);
    if (!orderId) return null;

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

    const dropLat = num(r.dropoff?.lat ?? addrSnap?.lat ?? r.delivery?.latitude ?? r.dropoffLat);
    const dropLng = num(r.dropoff?.lng ?? addrSnap?.lng ?? r.delivery?.longitude ?? r.dropoffLng);

    const dropAddress =
        str(r.dropoff?.address) ??
        (addrSnap ? [addrSnap.street, addrSnap.city].filter(Boolean).join(', ') || undefined : undefined) ??
        str(r.delivery?.addressLine) ??
        str(r.delivery?.address);

    const pickLat = num(r.pickup?.lat ?? r.restaurant?.latitude ?? r.pickupLat);
    const pickLng = num(r.pickup?.lng ?? r.restaurant?.longitude ?? r.pickupLng);

    const items = toOrderItems(r.items);
    const rawStatus = str(r.status) ?? 'pending';
    const acceptance = str(r.deliveryAcceptance) ?? str(r.delivery_acceptance);

    const customerNotes =
        str(r.customerNotes) ?? str(r.customer_notes) ?? str(r.notes) ?? addrSnap?.notes;

    return {
        orderId,
        orderNumber: str(r.orderNumber) ?? str(r.order_number),
        status: toDeliveryStatus(rawStatus, acceptance),
        rawStatus,
        dropoff:
            dropLat !== undefined && dropLng !== undefined
                ? { lat: dropLat, lng: dropLng, address: dropAddress }
                : null,
        pickup:
            pickLat !== undefined && pickLng !== undefined
                ? {
                      lat: pickLat,
                      lng: pickLng,
                      name: str(r.pickup?.name) ?? str(r.restaurant?.name) ?? str(r.restaurantName) ?? str(r.restaurantNameSnapshot) ?? str(r.restaurant_name_snapshot),
                      address: str(r.pickup?.address) ?? str(r.restaurant?.address),
                  }
                : null,
        customerName:
            str(r.customerName) ?? str(r.customerNameSnapshot) ?? str(r.customer_name_snapshot) ?? str(r.customer?.name) ?? str(r.delivery?.contactName),
        customerPhone:
            str(r.customerPhone) ?? str(r.customerPhoneSnapshot) ?? str(r.customer_phone_snapshot) ?? str(r.customer?.phone) ?? str(r.delivery?.contactPhone),
        restaurantName:
            str(r.restaurantName) ?? str(r.restaurantNameSnapshot) ?? str(r.restaurant_name_snapshot) ?? str(r.restaurant?.name),
        restaurantPhone: str(r.restaurantPhone) ?? str(r.restaurant?.phone),
        subtotal: num(r.subtotal),
        deliveryFee: num(r.deliveryFee) ?? num(r.delivery_fee),
        discountAmount: num(r.discountAmount) ?? num(r.discount_amount),
        total: num(r.total ?? r.totalAmount ?? r.total_amount),
        paymentMethod: str(r.paymentMethod) ?? str(r.payment_method),
        paymentStatus: str(r.paymentStatus) ?? str(r.payment_status),
        items,
        itemsCount: num(r.itemsCount) ?? (items.length || undefined),
        customerNotes,
        notes: customerNotes,
        createdAt: iso(r.createdAt ?? r.created_at),
        assignedAt: iso(r.assignedAt ?? r.assigned_at),
        acceptedAt: iso(r.acceptedAt ?? r.accepted_at),
        estimatedDeliveryAt: iso(r.estimatedDeliveryAt ?? r.estimated_delivery_at),
        deliveredAt: iso(r.deliveredAt ?? r.delivered_at),
    };
};

const toActiveAssignment = (raw: unknown): ActiveAssignment | null =>
    toDeliveryOrder(raw);

const toPendingOrder = (raw: unknown): PendingOrder | null =>
    toDeliveryOrder(raw);

export const restRepository = (): DeliveryRepository => ({
    register: async (phone) => {
        await authApi.post('/api/auth/delivery/register', { phone });
    },

    verifyOtp: async ({ phone, otp }) => {
        const res = await authApi.post('/api/auth/verify-otp', { phone, otp });
        return res.data.data as DeliveryTokensDTO;
    },

    // Login lives in the AUTH service (port 3004), not the delivery service.
    // The endpoint returns either a token pair OR { needsOtp: true } when the
    // account has no password yet (phone verified but application not submitted).
    login: async ({ phone, password }): Promise<DeliveryLoginResult> => {
        const res = await authApi.post('/api/auth/delivery/login', { phone, password });
        const data = res.data?.data ?? {};
        if (data.needsOtp) {
            return { kind: 'needsOtp', phone: data.phone ?? phone };
        }
        return { kind: 'tokens', tokens: data as DeliveryTokensDTO };
    },

    sendLoginOtp: async (phone) => {
        await authApi.post('/api/auth/delivery/login-otp', { phone });
    },

    verifyLoginOtp: async ({ phone, otp }) => {
        const res = await authApi.post('/api/auth/delivery/verify-login', { phone, otp });
        return res.data.data as DeliveryTokensDTO;
    },

    resendOtp: async (phone) => {
        await authApi.post('/api/auth/resend-otp', { phone });
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
            // Active job lives in the order-service. `orderApi` falls back to
            // the delivery token when no customer token is present, so the
            // agent's Bearer is attached.
            const res = await orderApi.get('/api/order/orders/delivery/active');
            const raw = res.data?.data ?? res.data;
            return toActiveAssignment(raw);
        } catch (err: any) {
            if (err?.response?.status === 404) return null;
            throw err;
        }
    },

    getPendingOrders: async (): Promise<PendingOrder[]> => {
        try {
            const res = await orderApi.get('/api/order/orders/delivery/available');
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
        const res = await orderApi.get('/api/order/orders/delivery/active');
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

    updateOrderStatus: async (orderId, status): Promise<ActiveAssignment | null> => {
        // Drive the lifecycle via the shared status endpoint. The backend only
        // lets the assigned + accepted driver perform delivery transitions.
        await orderApi.patch(`/api/order/orders/${orderId}/status`, { status });
        // Re-read the canonical state so the UI never drifts from the server.
        try {
            const res = await orderApi.get('/api/order/orders/delivery/active');
            return toActiveAssignment(res.data?.data ?? res.data);
        } catch {
            return null;
        }
    },

    getOrderDetails: async (orderId): Promise<DeliveryOrder | null> => {
        const res = await orderApi.get(`/api/order/orders/${orderId}`);
        return toDeliveryOrder(res.data?.data ?? res.data);
    },
});
