import React, { useCallback, useMemo } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useDeliveryT } from '@/hooks/useAppTranslation';
import { useRTL } from '@/hooks/useRTL';
import { useDeliveryOrderDetails } from '../hooks/useDeliveryOrderDetails';
import { useUpdateDeliveryStatus } from '../hooks/useUpdateDeliveryStatus';
import type { DeliveryOrder, DeliveryOrderStatus } from '../types';

/** Loose translate-fn signature for passing `t` to helpers/sub-components. */
type TFn = (key: string, opts?: Record<string, unknown>) => string;

// ─── Brand palette (kept in sync with DeliveryDashboardScreen) ───────────────
const BRAND = '#F55905';
const BRAND_DARK = '#c94400';
const GREEN = '#1a7a4a';
const TEXT = '#1E1E1E';
const MUTED = '#767777';
const FAINT = '#aaa';
const SURFACE = '#F7F7F7';

// ─── Status → display meta ───────────────────────────────────────────────────
const STATUS_META: Record<
    DeliveryOrderStatus,
    { color: string; bg: string; icon: keyof typeof Ionicons.glyphMap; labelKey: string; fallback: string }
> = {
    ASSIGNED: { color: '#B45309', bg: '#FEF3C7', icon: 'mail-unread-outline', labelKey: 'status.assigned', fallback: 'Assigned' },
    ACCEPTED: { color: '#4F46E5', bg: '#EEF2FF', icon: 'checkmark-done-outline', labelKey: 'status.accepted', fallback: 'Accepted' },
    ON_THE_WAY: { color: BRAND, bg: '#FFF1E8', icon: 'bicycle-outline', labelKey: 'status.onTheWay', fallback: 'On the way' },
    DELIVERED: { color: GREEN, bg: '#E8F5E9', icon: 'checkmark-circle', labelKey: 'status.delivered', fallback: 'Delivered' },
    CANCELLED: { color: '#B91C1C', bg: '#FEE2E2', icon: 'close-circle', labelKey: 'status.cancelled', fallback: 'Cancelled' },
};

// Ordered lifecycle steps for the timeline (cancelled handled separately).
const TIMELINE_STEPS: { key: DeliveryOrderStatus; icon: keyof typeof Ionicons.glyphMap; labelKey: string; fallback: string }[] = [
    { key: 'ASSIGNED', icon: 'document-text-outline', labelKey: 'timeline.assigned', fallback: 'Order received' },
    { key: 'ACCEPTED', icon: 'checkmark-done-outline', labelKey: 'timeline.accepted', fallback: 'Accepted' },
    { key: 'ON_THE_WAY', icon: 'bicycle-outline', labelKey: 'timeline.onTheWay', fallback: 'On the way' },
    { key: 'DELIVERED', icon: 'flag-outline', labelKey: 'timeline.delivered', fallback: 'Delivered' },
];

const STEP_RANK: Record<DeliveryOrderStatus, number> = {
    ASSIGNED: 0,
    ACCEPTED: 1,
    ON_THE_WAY: 2,
    DELIVERED: 3,
    CANCELLED: -1,
};

const money = (v: number | undefined, t: TFn) =>
    v == null ? '—' : t('orders.totalILS', { amount: v.toFixed(2), defaultValue: `ILS ${v.toFixed(2)}` });

const fmtDateTime = (iso?: string) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
};

const fmtTime = (iso?: string) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
};

export default function DriverOrderDetailsScreen() {
    const insets = useSafeAreaInsets();
    const { t: tRaw } = useDeliveryT();
    // TFunction has complex overloads; narrow it to our simple call shape once
    // so it can be passed into helpers/sub-components without per-call casts.
    const t = tRaw as unknown as TFn;
    const isRTL = useRTL();
    const dir = isRTL ? 'rtl' : 'ltr';
    const ta = isRTL ? 'right' : 'left';

    const { id } = useLocalSearchParams<{ id: string }>();
    const orderId = typeof id === 'string' ? id : undefined;

    const { data: order, isLoading, isError, refetch } = useDeliveryOrderDetails(orderId);
    const updateStatus = useUpdateDeliveryStatus();

    const handleBack = useCallback(() => {
        if (router.canGoBack()) router.back();
        else router.replace('/delivery/tabs/home' as never);
    }, []);

    const callPhone = useCallback((phone?: string) => {
        if (!phone) return;
        Linking.openURL(`tel:${phone}`).catch(() => undefined);
    }, []);

    const openMap = useCallback((lat?: number, lng?: number) => {
        if (lat == null || lng == null) return;
        Linking.openURL(`geo:${lat},${lng}?q=${lat},${lng}`).catch(() => undefined);
    }, []);

    const confirmAndUpdate = useCallback(
        (status: 'out_for_delivery' | 'delivered') => {
            if (!orderId || updateStatus.isPending) return; // duplicate-tap guard
            const isDeliver = status === 'delivered';
            Alert.alert(
                isDeliver
                    ? t('actions.confirmDeliveredTitle', { defaultValue: 'Mark as delivered?' })
                    : t('actions.confirmStartTitle', { defaultValue: 'Start delivery?' }),
                isDeliver
                    ? t('actions.confirmDeliveredBody', { defaultValue: 'This finalizes the order. It cannot be undone.' })
                    : t('actions.confirmStartBody', { defaultValue: 'The customer will see that you are on the way.' }),
                [
                    { text: t('actions.cancel', { defaultValue: 'Cancel' }), style: 'cancel' },
                    {
                        text: isDeliver
                            ? t('actions.delivered', { defaultValue: 'Delivered' })
                            : t('actions.startDelivery', { defaultValue: 'Start Delivery' }),
                        style: isDeliver ? 'default' : 'default',
                        onPress: () => {
                            updateStatus.mutate(
                                { orderId, status },
                                {
                                    onError: () =>
                                        Alert.alert(
                                            t('actions.errorTitle', { defaultValue: 'Could not update' }),
                                            t('actions.errorBody', { defaultValue: 'Please try again.' }),
                                        ),
                                },
                            );
                        },
                    },
                ],
            );
        },
        [orderId, updateStatus, t],
    );

    // ── Loading / error / empty ─────────────────────────────────────────────
    if (isLoading) {
        return (
            <SafeAreaView style={styles.safe} edges={['top']}>
                <Header title={t('details.title', { defaultValue: 'Order details' })} onBack={handleBack} isRTL={isRTL} />
                <View style={styles.center}>
                    <ActivityIndicator color={BRAND} size="large" />
                </View>
            </SafeAreaView>
        );
    }

    if (isError || !order) {
        return (
            <SafeAreaView style={styles.safe} edges={['top']}>
                <Header title={t('details.title', { defaultValue: 'Order details' })} onBack={handleBack} isRTL={isRTL} />
                <View style={styles.center}>
                    <Ionicons name="alert-circle-outline" size={40} color="#B91C1C" />
                    <Text style={[styles.muted, { writingDirection: dir }]}>
                        {t('details.loadError', { defaultValue: 'Could not load this order.' })}
                    </Text>
                    <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
                        <Text style={styles.retryBtnText}>
                            {t('tracking.refresh', { defaultValue: 'Refresh' })}
                        </Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const meta = STATUS_META[order.status];
    const isTerminal = order.status === 'DELIVERED' || order.status === 'CANCELLED';

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />
            <Header
                title={
                    order.orderNumber
                        ? `#${order.orderNumber}`
                        : t('details.title', { defaultValue: 'Order details' })
                }
                onBack={handleBack}
                isRTL={isRTL}
            />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 140 }}
            >
                {/* Status hero */}
                <Animated.View entering={FadeInDown.duration(300)} style={[styles.statusHero, { backgroundColor: meta.bg }]}>
                    <View style={[styles.statusIconWrap, { backgroundColor: meta.color }]}>
                        <Ionicons name={meta.icon} size={22} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.statusLabel, { color: meta.color, textAlign: ta, writingDirection: dir }]}>
                            {t(meta.labelKey, { defaultValue: meta.fallback })}
                        </Text>
                        {order.createdAt ? (
                            <Text style={[styles.statusSub, { writingDirection: dir, textAlign: ta }]}>
                                {fmtDateTime(order.createdAt)}
                            </Text>
                        ) : null}
                    </View>
                    {order.status === 'DELIVERED' ? (
                        <Ionicons name="checkmark-circle" size={28} color={GREEN} />
                    ) : null}
                </Animated.View>

                {/* Timeline */}
                <Section title={t('details.progress', { defaultValue: 'Progress' })} dir={dir} ta={ta}>
                    <Timeline order={order} t={t} dir={dir} />
                </Section>

                {/* Customer */}
                <Section title={t('details.customer', { defaultValue: 'Customer' })} dir={dir} ta={ta}>
                    <Row icon="person-outline" label={t('orders.customer', { defaultValue: 'Customer' })} value={order.customerName} dir={dir} ta={ta} />
                    <Row
                        icon="call-outline"
                        label={t('details.phone', { defaultValue: 'Phone' })}
                        value={order.customerPhone}
                        dir={dir}
                        ta={ta}
                        onAction={order.customerPhone ? () => callPhone(order.customerPhone) : undefined}
                        actionIcon="call"
                    />
                </Section>

                {/* Address / location */}
                <Section title={t('details.address', { defaultValue: 'Delivery address' })} dir={dir} ta={ta}>
                    <Row
                        icon="home-outline"
                        label={t('orders.dropoff', { defaultValue: 'Drop-off' })}
                        value={
                            order.dropoff?.address ??
                            (order.dropoff ? `${order.dropoff.lat.toFixed(5)}, ${order.dropoff.lng.toFixed(5)}` : undefined)
                        }
                        dir={dir}
                        ta={ta}
                        onAction={order.dropoff ? () => openMap(order.dropoff?.lat, order.dropoff?.lng) : undefined}
                        actionIcon="map"
                    />
                    {order.pickup ? (
                        <Row
                            icon="restaurant-outline"
                            label={t('orders.pickup', { defaultValue: 'Pickup' })}
                            value={order.pickup.name ?? order.pickup.address ?? order.restaurantName}
                            dir={dir}
                            ta={ta}
                            onAction={() => openMap(order.pickup?.lat, order.pickup?.lng)}
                            actionIcon="map"
                        />
                    ) : null}
                </Section>

                {/* Products */}
                <Section title={t('details.products', { defaultValue: 'Items' })} dir={dir} ta={ta}>
                    {order.items.length === 0 ? (
                        <Text style={[styles.emptyLine, { writingDirection: dir, textAlign: ta }]}>
                            {t('details.noItems', { defaultValue: 'No item details available.' })}
                        </Text>
                    ) : (
                        order.items.map((item) => (
                            <View key={item.id} style={[styles.itemRow, isRTL && styles.rowReverse]}>
                                <View style={styles.qtyBadge}>
                                    <Text style={styles.qtyBadgeText}>{item.quantity}×</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.itemName, { writingDirection: dir, textAlign: ta }]} numberOfLines={2}>
                                        {item.name}
                                    </Text>
                                    {item.options.length > 0 ? (
                                        <Text style={[styles.itemOpts, { writingDirection: dir, textAlign: ta }]} numberOfLines={2}>
                                            {item.options.map((o) => o.name).join(' · ')}
                                        </Text>
                                    ) : null}
                                    {item.specialInstructions ? (
                                        <Text style={[styles.itemNote, { writingDirection: dir, textAlign: ta }]} numberOfLines={2}>
                                            “{item.specialInstructions}”
                                        </Text>
                                    ) : null}
                                </View>
                                <Text style={styles.itemPrice}>{money(item.totalPrice, t)}</Text>
                            </View>
                        ))
                    )}
                </Section>

                {/* Payment */}
                <Section title={t('details.payment', { defaultValue: 'Payment' })} dir={dir} ta={ta}>
                    <KeyValue label={t('details.method', { defaultValue: 'Method' })} value={paymentMethodLabel(order.paymentMethod, t)} dir={dir} ta={ta} />
                    <KeyValue
                        label={t('details.paymentStatus', { defaultValue: 'Payment status' })}
                        value={paymentStatusLabel(order.paymentStatus, t)}
                        valueColor={order.paymentStatus === 'paid' ? GREEN : '#B45309'}
                        dir={dir}
                        ta={ta}
                    />
                    <View style={styles.divider} />
                    <KeyValue label={t('details.subtotal', { defaultValue: 'Subtotal' })} value={money(order.subtotal, t)} dir={dir} ta={ta} />
                    {order.discountAmount ? (
                        <KeyValue label={t('details.discount', { defaultValue: 'Discount' })} value={`- ${money(order.discountAmount, t)}`} dir={dir} ta={ta} />
                    ) : null}
                    <KeyValue label={t('details.deliveryFee', { defaultValue: 'Delivery fee' })} value={money(order.deliveryFee, t)} dir={dir} ta={ta} />
                    <View style={styles.divider} />
                    <KeyValue label={t('details.total', { defaultValue: 'Total' })} value={money(order.total, t)} bold dir={dir} ta={ta} />
                </Section>

                {/* Notes */}
                {order.customerNotes ? (
                    <Section title={t('orders.notes', { defaultValue: 'Notes' })} dir={dir} ta={ta}>
                        <Text style={[styles.notesText, { writingDirection: dir, textAlign: ta }]}>
                            {order.customerNotes}
                        </Text>
                    </Section>
                ) : null}
            </ScrollView>

            {/* Sticky action bar */}
            <View style={[styles.actionBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
                {order.status === 'ACCEPTED' && order.rawStatus === 'ready_for_pickup' ? (
                    <ActionButton
                        label={t('actions.startDelivery', { defaultValue: 'Start Delivery' })}
                        icon="bicycle"
                        onPress={() => confirmAndUpdate('out_for_delivery')}
                        loading={updateStatus.isPending}
                    />
                ) : null}
                {order.status === 'ACCEPTED' && order.rawStatus !== 'ready_for_pickup' ? (
                    <View style={styles.hintBanner}>
                        <Ionicons name="time-outline" size={18} color={MUTED} />
                        <Text style={styles.hintText}>
                            {t('actions.waitingReady', {
                                defaultValue: 'Waiting for the restaurant to mark the order ready.',
                            })}
                        </Text>
                    </View>
                ) : null}
                {order.status === 'ON_THE_WAY' ? (
                    <ActionButton
                        label={t('actions.delivered', { defaultValue: 'Delivered' })}
                        icon="checkmark-done"
                        color={GREEN}
                        onPress={() => confirmAndUpdate('delivered')}
                        loading={updateStatus.isPending}
                    />
                ) : null}
                {isTerminal ? (
                    <View style={[styles.completedBanner, order.status === 'CANCELLED' && { backgroundColor: '#FEE2E2' }]}>
                        <Ionicons
                            name={order.status === 'DELIVERED' ? 'checkmark-circle' : 'close-circle'}
                            size={20}
                            color={order.status === 'DELIVERED' ? GREEN : '#B91C1C'}
                        />
                        <Text style={[styles.completedText, { color: order.status === 'DELIVERED' ? GREEN : '#B91C1C' }]}>
                            {order.status === 'DELIVERED'
                                ? t('actions.completedAt', {
                                      time: fmtTime(order.deliveredAt) ?? '',
                                      defaultValue: order.deliveredAt
                                          ? `Completed at ${fmtTime(order.deliveredAt)}`
                                          : 'Completed',
                                  })
                                : t('status.cancelled', { defaultValue: 'Cancelled' })}
                        </Text>
                    </View>
                ) : null}
                {order.status === 'ASSIGNED' ? (
                    <View style={styles.hintBanner}>
                        <Ionicons name="information-circle-outline" size={18} color={MUTED} />
                        <Text style={styles.hintText}>
                            {t('actions.acceptFirst', { defaultValue: 'Accept this order from the dashboard to start.' })}
                        </Text>
                    </View>
                ) : null}
            </View>
        </SafeAreaView>
    );
}

// ─── Timeline ────────────────────────────────────────────────────────────────
function Timeline({
    order,
    t,
    dir,
}: {
    order: DeliveryOrder;
    t: TFn;
    dir: 'rtl' | 'ltr';
}) {
    const currentRank = STEP_RANK[order.status];
    const cancelled = order.status === 'CANCELLED';
    const stampFor = (key: DeliveryOrderStatus): string | null => {
        switch (key) {
            case 'ASSIGNED': return fmtTime(order.assignedAt ?? order.createdAt);
            case 'ACCEPTED': return fmtTime(order.acceptedAt);
            case 'DELIVERED': return fmtTime(order.deliveredAt);
            default: return null;
        }
    };

    return (
        <View>
            {TIMELINE_STEPS.map((step, idx) => {
                const rank = STEP_RANK[step.key];
                const done = !cancelled && currentRank >= rank;
                const active = !cancelled && currentRank === rank;
                const isLast = idx === TIMELINE_STEPS.length - 1;
                const stamp = stampFor(step.key);
                return (
                    <View key={step.key} style={styles.tlRow}>
                        <View style={styles.tlRail}>
                            <View
                                style={[
                                    styles.tlDot,
                                    done && { backgroundColor: GREEN, borderColor: GREEN },
                                    active && { backgroundColor: BRAND, borderColor: BRAND },
                                ]}
                            >
                                {done ? <Ionicons name="checkmark" size={12} color="#fff" /> : null}
                            </View>
                            {!isLast ? (
                                <View style={[styles.tlLine, done && currentRank > rank && { backgroundColor: GREEN }]} />
                            ) : null}
                        </View>
                        <View style={styles.tlBody}>
                            <Text
                                style={[
                                    styles.tlLabel,
                                    { writingDirection: dir },
                                    done && { color: TEXT },
                                    active && { color: BRAND },
                                ]}
                            >
                                {t(step.labelKey, { defaultValue: step.fallback })}
                            </Text>
                            {stamp ? <Text style={styles.tlStamp}>{stamp}</Text> : null}
                        </View>
                    </View>
                );
            })}
            {cancelled ? (
                <View style={styles.tlRow}>
                    <View style={styles.tlRail}>
                        <View style={[styles.tlDot, { backgroundColor: '#B91C1C', borderColor: '#B91C1C' }]}>
                            <Ionicons name="close" size={12} color="#fff" />
                        </View>
                    </View>
                    <View style={styles.tlBody}>
                        <Text style={[styles.tlLabel, { color: '#B91C1C', writingDirection: dir }]}>
                            {t('status.cancelled', { defaultValue: 'Cancelled' })}
                        </Text>
                    </View>
                </View>
            ) : null}
        </View>
    );
}

// ─── Small building blocks ───────────────────────────────────────────────────
function Header({ title, onBack, isRTL }: { title: string; onBack: () => void; isRTL: boolean }) {
    return (
        <View style={[styles.header, isRTL && styles.rowReverse]}>
            <TouchableOpacity onPress={onBack} style={styles.backBtn} accessibilityRole="button">
                <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={22} color={TEXT} />
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
            <View style={styles.backBtn} />
        </View>
    );
}

function Section({ title, dir, ta, children }: { title: string; dir: 'rtl' | 'ltr'; ta: 'left' | 'right'; children: React.ReactNode }) {
    return (
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { writingDirection: dir, textAlign: ta }]}>{title}</Text>
            {children}
        </View>
    );
}

function Row({
    icon, label, value, dir, ta, onAction, actionIcon,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value?: string;
    dir: 'rtl' | 'ltr';
    ta: 'left' | 'right';
    onAction?: () => void;
    actionIcon?: keyof typeof Ionicons.glyphMap;
}) {
    return (
        <View style={styles.row}>
            <View style={styles.rowIcon}>
                <Ionicons name={icon} size={16} color={BRAND} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={[styles.rowLabel, { writingDirection: dir, textAlign: ta }]}>{label}</Text>
                <Text style={[styles.rowValue, { writingDirection: dir, textAlign: ta }]}>{value || '—'}</Text>
            </View>
            {onAction && actionIcon ? (
                <TouchableOpacity onPress={onAction} style={styles.rowActionBtn}>
                    <Ionicons name={actionIcon} size={16} color="#fff" />
                </TouchableOpacity>
            ) : null}
        </View>
    );
}

function KeyValue({
    label, value, bold, valueColor, dir, ta,
}: {
    label: string; value: string; bold?: boolean; valueColor?: string;
    dir: 'rtl' | 'ltr'; ta: 'left' | 'right';
}) {
    return (
        <View style={[styles.kv, { flexDirection: dir === 'rtl' ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.kvLabel, bold && styles.kvBold]}>{label}</Text>
            <Text style={[styles.kvValue, bold && styles.kvBold, valueColor ? { color: valueColor } : null]}>{value}</Text>
        </View>
    );
}

function ActionButton({
    label, icon, onPress, loading, color = BRAND,
}: {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    loading: boolean;
    color?: string;
}) {
    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={loading}
            activeOpacity={0.85}
            style={[styles.actionBtn, { backgroundColor: color }, loading && { opacity: 0.7 }]}
        >
            {loading ? (
                <ActivityIndicator size="small" color="#fff" />
            ) : (
                <>
                    <Ionicons name={icon} size={20} color="#fff" />
                    <Text style={styles.actionBtnText}>{label}</Text>
                </>
            )}
        </TouchableOpacity>
    );
}

// ─── Labels ──────────────────────────────────────────────────────────────────
function paymentMethodLabel(m: string | undefined, t: TFn) {
    switch (m) {
        case 'cash_on_delivery': return t('payment.cod', { defaultValue: 'Cash on delivery' });
        case 'card': return t('payment.card', { defaultValue: 'Card' });
        case 'online': return t('payment.online', { defaultValue: 'Online' });
        default: return m ?? '—';
    }
}

function paymentStatusLabel(s: string | undefined, t: TFn) {
    switch (s) {
        case 'paid': return t('payment.paid', { defaultValue: 'Paid' });
        case 'unpaid': return t('payment.unpaid', { defaultValue: 'Unpaid' });
        case 'refunded': return t('payment.refunded', { defaultValue: 'Refunded' });
        default: return s ?? '—';
    }
}

const cardShadow = {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
} as const;

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: SURFACE },
    rowReverse: { flexDirection: 'row-reverse' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 30 },
    muted: { fontFamily: 'Tajawal_500Medium', fontSize: 14, color: MUTED, textAlign: 'center' },
    retryBtn: { backgroundColor: BRAND, paddingHorizontal: 22, paddingVertical: 11, borderRadius: 999 },
    retryBtnText: { color: '#fff', fontFamily: 'Cairo_700Bold', fontSize: 13 },

    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff',
        borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    },
    backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, textAlign: 'center', fontFamily: 'Cairo_700Bold', fontSize: 16, color: TEXT },

    statusHero: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        borderRadius: 18, padding: 16, marginBottom: 16,
    },
    statusIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    statusLabel: { fontFamily: 'Cairo_700Bold', fontSize: 16 },
    statusSub: { fontFamily: 'Tajawal_400Regular', fontSize: 12, color: MUTED, marginTop: 2 },

    section: { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 14, ...cardShadow },
    sectionTitle: { fontFamily: 'Cairo_700Bold', fontSize: 14, color: TEXT, marginBottom: 12 },

    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 7 },
    rowIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#FFF5F0', alignItems: 'center', justifyContent: 'center' },
    rowLabel: { fontFamily: 'Tajawal_400Regular', fontSize: 11, color: FAINT, marginBottom: 1 },
    rowValue: { fontFamily: 'Tajawal_500Medium', fontSize: 14, color: TEXT, lineHeight: 19 },
    rowActionBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center' },

    itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#f6f6f6' },
    qtyBadge: { minWidth: 30, height: 26, paddingHorizontal: 6, borderRadius: 8, backgroundColor: '#FFF5F0', alignItems: 'center', justifyContent: 'center' },
    qtyBadgeText: { fontFamily: 'Cairo_700Bold', fontSize: 12, color: BRAND },
    itemName: { fontFamily: 'Tajawal_500Medium', fontSize: 14, color: TEXT, lineHeight: 19 },
    itemOpts: { fontFamily: 'Tajawal_400Regular', fontSize: 12, color: MUTED, marginTop: 2 },
    itemNote: { fontFamily: 'Tajawal_400Regular', fontSize: 12, color: '#D97706', marginTop: 2, fontStyle: 'italic' },
    itemPrice: { fontFamily: 'Cairo_700Bold', fontSize: 13, color: TEXT },
    emptyLine: { fontFamily: 'Tajawal_400Regular', fontSize: 13, color: FAINT },

    kv: { justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
    kvLabel: { fontFamily: 'Tajawal_400Regular', fontSize: 13, color: MUTED },
    kvValue: { fontFamily: 'Tajawal_500Medium', fontSize: 14, color: TEXT },
    kvBold: { fontFamily: 'Cairo_700Bold', fontSize: 15, color: TEXT },
    divider: { height: 1, backgroundColor: '#f2f2f2', marginVertical: 8 },

    notesText: { fontFamily: 'Tajawal_500Medium', fontSize: 14, color: TEXT, lineHeight: 20 },

    // Timeline
    tlRow: { flexDirection: 'row', gap: 12 },
    tlRail: { width: 24, alignItems: 'center' },
    tlDot: {
        width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#d8d8d8',
        backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    },
    tlLine: { width: 2, flex: 1, minHeight: 26, backgroundColor: '#e6e6e6', marginVertical: 2 },
    tlBody: { flex: 1, paddingBottom: 18, paddingTop: 1 },
    tlLabel: { fontFamily: 'Cairo_700Bold', fontSize: 13, color: FAINT },
    tlStamp: { fontFamily: 'Tajawal_400Regular', fontSize: 11, color: MUTED, marginTop: 2 },

    // Action bar
    actionBar: {
        position: 'absolute', left: 0, right: 0, bottom: 0,
        backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 12,
        borderTopWidth: 1, borderTopColor: '#f0f0f0',
    },
    actionBtn: {
        height: 52, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        shadowColor: BRAND_DARK, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5,
    },
    actionBtnText: { fontFamily: 'Cairo_700Bold', fontSize: 16, color: '#fff' },
    completedBanner: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        height: 52, borderRadius: 16, backgroundColor: '#E8F5E9',
    },
    completedText: { fontFamily: 'Cairo_700Bold', fontSize: 15 },
    hintBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 },
    hintText: { fontFamily: 'Tajawal_500Medium', fontSize: 13, color: MUTED },
});
