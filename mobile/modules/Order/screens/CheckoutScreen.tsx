import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Animated, { FadeInUp } from "react-native-reanimated";
import AnimatedPressable from "@/components/ui/AnimatedPressable";
import { colors, radii, screen, shadows, typography } from "@/components/ui/theme";
import { useTranslation } from "react-i18next";
import { useLanguageStore } from "@/store/useLanguageStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useCart } from "@/modules/Cart/hooks/useCart";
import { getAddToCartErrorMessage } from "@/modules/Cart/hooks/useAddToCart";
import CheckoutSectionCard from "../components/CheckoutSectionCard";
import AddressActionsRow from "../components/AddressActionsRow";
import DeliveryAddressCard from "../components/DeliveryAddressCard";
import OrderTypeSelector from "../components/OrderTypeSelector";
import PaymentMethodSelector, { PaymentMethodOption } from "../components/PaymentMethodSelector";
import PaymentInfoCard from "../components/PaymentInfoCard";
import PromoCodeInput from "../components/PromoCodeInput";
import CustomerNotesInput from "../components/CustomerNotesInput";
import CheckoutOrderSummary from "../components/CheckoutOrderSummary";
import CheckoutCTA from "../components/CheckoutCTA";
import DateTimePicker, {
    DateTimePickerAndroid,
    type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import {
    getCheckoutErrorMessage,
    isCheckoutBusinessError,
    isCheckoutConflict,
    isCheckoutUnauthorized,
    isNetworkError,
    useCheckout,
} from "../hooks/useCheckout";
import { usePromoValidate } from "../hooks/usePromoValidate";
import type {
    AddressSnapshot,
    DeliveryAddressInput,
    OrderType,
    PaymentMethod,
} from "../types";
import { generateUuidV4 } from "../utils/uuid";

const DELIVERY_FEE = 8;

const buildPaymentOptions = (
    t: (key: string) => string,
): PaymentMethodOption[] => [
    {
        key: "cash_on_delivery",
        icon: "cash-outline",
        label: t("payment.cash.label"),
        description: t("payment.cash.description"),
    },
    {
        key: "card",
        icon: "card-outline",
        label: t("payment.card.label"),
        description: t("payment.card.description"),
        badge: t("payment.card.badge"),
    },
    {
        key: "online",
        icon: "wallet-outline",
        label: t("payment.online.label"),
        description: t("payment.online.description"),
    },
];

function CheckoutScreen() {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation("checkout");
    const { t: tCart } = useTranslation("cart");
    const isRTL = useLanguageStore((s) => s.isRTL);
    const textAlign = isRTL ? "right" : "left";
    const writingDirection = isRTL ? "rtl" : "ltr";
    const isAuthed = useAuthStore((s) => s.status === "authenticated");

    const currency = tCart("price.currency");
    const { data: cart, isLoading: isCartLoading } = useCart();

    const subtotal = cart?.subtotal ?? 0;
    const hasItems = !!cart?.items.length;

    const [address, setAddress] = useState<DeliveryAddressInput>({
        addressLine: "",
        city: "",
        street: "",
        building: "",
        floor: "",
        notes: "",
    });
    const [orderType, setOrderType] = useState<OrderType>("delivery");
    const [scheduledFor, setScheduledFor] = useState<Date | null>(null);
    const [schedulePickerOpen, setSchedulePickerOpen] = useState(false);
    // iOS picker keeps the candidate value separate so the user can cancel
    // without committing. Android uses the imperative API and writes directly.
    const [pendingDate, setPendingDate] = useState<Date | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash_on_delivery");
    const [notes, setNotes] = useState("");
    const [addressError, setAddressError] = useState<string | null>(null);

    const paymentOptions = useMemo(() => buildPaymentOptions(t), [t]);

    // Earliest scheduled time = now + 30 minutes. Anything sooner is treated
    // as a normal delivery — restaurants need a buffer to prepare.
    const minScheduledAt = useMemo(() => {
        const d = new Date();
        d.setMinutes(d.getMinutes() + 30, 0, 0);
        return d;
    }, []);

    const orderTypeOptions = useMemo(
        () => [
            {
                key: "delivery" as OrderType,
                icon: "bicycle-outline" as const,
                label: t("orderType.delivery.label"),
                description: t("orderType.delivery.description"),
            },
            {
                key: "pickup" as OrderType,
                icon: "walk-outline" as const,
                label: t("orderType.pickup.label"),
                description: t("orderType.pickup.description"),
                badge: t("orderType.pickup.badge"),
            },
            {
                key: "scheduled" as OrderType,
                icon: "calendar-outline" as const,
                label: t("orderType.scheduled.label"),
                description: t("orderType.scheduled.description"),
            },
        ],
        [t],
    );

    // When switching away from "scheduled", clear the chosen time so the
    // payload doesn't carry a stale `scheduledFor`.
    useEffect(() => {
        if (orderType !== "scheduled") {
            setScheduledFor(null);
        }
    }, [orderType]);

    const openSchedulePicker = useCallback(() => {
        const initial = scheduledFor ?? minScheduledAt;
        if (Platform.OS === "android") {
            DateTimePickerAndroid.open({
                value: initial,
                mode: "date",
                minimumDate: minScheduledAt,
                onChange: (_: DateTimePickerEvent, date?: Date) => {
                    if (!date) return;
                    DateTimePickerAndroid.open({
                        value: date,
                        mode: "time",
                        is24Hour: true,
                        onChange: (__: DateTimePickerEvent, time?: Date) => {
                            if (!time) return;
                            const combined = new Date(date);
                            combined.setHours(time.getHours(), time.getMinutes(), 0, 0);
                            const safe =
                                combined < minScheduledAt ? minScheduledAt : combined;
                            setScheduledFor(safe);
                        },
                    });
                },
            });
            return;
        }
        // iOS — open the bottom-sheet modal with a spinner.
        setPendingDate(initial);
        setSchedulePickerOpen(true);
    }, [minScheduledAt, scheduledFor]);

    const confirmIosSchedule = useCallback(() => {
        if (pendingDate) {
            const safe = pendingDate < minScheduledAt ? minScheduledAt : pendingDate;
            setScheduledFor(safe);
        }
        setSchedulePickerOpen(false);
    }, [pendingDate, minScheduledAt]);

    const {
        applied: appliedPromo,
        applyPromo,
        clearPromo,
        isValidating: isValidatingPromo,
        error: promoError,
    } = usePromoValidate();

    const {
        startCheckout,
        isPending: isPlacingOrder,
        isSuccess: isOrderPlaced,
        resetIdempotencyKey,
    } = useCheckout();

    // Backend's addressId column is a nullable UUID with no FK constraint enforced;
    // since there's no addresses-CRUD endpoint, we generate a client-side UUID per
    // attempt and keep it stable across retries (same lifecycle as the idempotency
    // key — regenerated only after a non-retryable failure or a successful order).
    const addressIdRef = useRef<string | null>(null);
    const ensureAddressId = useCallback(() => {
        if (!addressIdRef.current) addressIdRef.current = generateUuidV4();
        return addressIdRef.current;
    }, []);
    const resetAddressId = useCallback(() => {
        addressIdRef.current = null;
    }, []);

    const discount = appliedPromo?.discount ?? 0;
    const total = useMemo(
        () => Math.max(0, subtotal + DELIVERY_FEE - discount),
        [subtotal, discount],
    );

    useEffect(() => {
        // Don't bounce if we just placed the order — checkout success already
        // navigates us to /checkout/success, and the cart is empty as expected.
        // Also skip while the place-order mutation is in flight.
        if (isOrderPlaced || isPlacingOrder) return;
        if (!isCartLoading && !hasItems && isAuthed) {
            // Cart was emptied (e.g., user removed all items in another tab) — bounce back
            if (router.canGoBack()) router.back();
            else router.replace("/cart" as never);
        }
    }, [hasItems, isAuthed, isCartLoading, isOrderPlaced, isPlacingOrder]);

    useEffect(() => () => resetIdempotencyKey(), [resetIdempotencyKey]);

    const handleBack = useCallback(() => {
        if (router.canGoBack()) router.back();
        else router.replace("/cart" as never);
    }, []);

    const handleApplyPromo = useCallback(
        (code: string) => {
            applyPromo({ code, subtotal });
        },
        [applyPromo, subtotal],
    );

    const handlePlaceOrder = useCallback(() => {
        if (isPlacingOrder || !hasItems) return;

        // Pickup orders don't need a delivery address — only the contact
        // payload (name/phone) and the restaurant id. We still emit a minimal
        // snapshot so the receipt + history remain self-describing.
        const isPickup = orderType === "pickup";

        if (!isPickup) {
            const addressLine = address.addressLine.trim();
            if (!addressLine) {
                setAddressError(t("errors.addressRequired"));
                return;
            }
            // Real coordinates are required so the driver can navigate and the
            // tracking map can render the destination. Users must pick "current
            // location" or a saved address that has coords — manual address
            // typing alone is rejected.
            const hasCoords =
                typeof address.latitude === "number" &&
                typeof address.longitude === "number" &&
                !(address.latitude === 0 && address.longitude === 0);
            if (!hasCoords) {
                setAddressError(t("errors.addressLocationRequired"));
                return;
            }
        }
        setAddressError(null);

        // Scheduled mode requires a chosen time.
        if (orderType === "scheduled" && !scheduledFor) {
            Alert.alert(
                t("alerts.scheduleRequiredTitle"),
                t("alerts.scheduleRequiredMessage"),
            );
            return;
        }

        const street = address.street?.trim() || address.addressLine.trim();
        const city = address.city?.trim() || "";

        // Server stores this as JSONB and uses it for the receipt and the
        // delivery agent's map pin. For delivery/scheduled the validation above
        // guarantees real coords; pickup orders may legitimately have none
        // (no driver, no map) so we fall back to 0.
        const addressSnapshot: AddressSnapshot = {
            street,
            city,
            lat: address.latitude ?? 0,
            lng: address.longitude ?? 0,
            ...(address.label ? { label: address.label } : {}),
            ...(address.building ? { building: address.building.trim() } : {}),
            ...(address.floor ? { floor: address.floor.trim() } : {}),
            ...(address.notes ? { notes: address.notes.trim() } : {}),
        };

        startCheckout(
            {
                addressId: ensureAddressId(),
                paymentMethod,
                orderType,
                ...(orderType === "scheduled" && scheduledFor
                    ? { scheduledFor: scheduledFor.toISOString() }
                    : {}),
                addressSnapshot,
                customerNotes: notes.trim() || undefined,
                promoCode: appliedPromo?.code,
                restaurantName: cart?.restaurantName,
            },
            {
                onSuccess: (order) => {
                    resetAddressId();
                    const orderId = order.id ?? order.orderId ?? order.orderNumber ?? "";
                    const resolvedTotal =
                        order.totalAmount ?? order.total ?? total;
                    const restaurantId =
                        (typeof order.restaurantId === "string" && order.restaurantId) ||
                        cart?.restaurantId ||
                        "";
                    router.replace({
                        pathname: "/checkout/success",
                        params: {
                            orderId,
                            orderNumber: order.orderNumber ?? "",
                            total: String(resolvedTotal),
                            paymentMethod: String(order.paymentMethod ?? paymentMethod),
                            restaurantId,
                        },
                    } as never);
                },
                onError: (err) => {
                    // For non-retryable errors, regenerate the addressId on next
                    // attempt so a fresh row is created. Retryable errors keep it
                    // so the server's idempotency check still matches.
                    if (!isCheckoutConflict(err) && !isNetworkError(err)) {
                        resetAddressId();
                    }

                    if (isCheckoutConflict(err)) {
                        Alert.alert(
                            t("alerts.conflictTitle"),
                            getCheckoutErrorMessage(err) ?? t("alerts.conflictMessage"),
                        );
                        return;
                    }
                    if (isCheckoutUnauthorized(err)) {
                        Alert.alert(
                            t("alerts.unauthorizedTitle"),
                            getCheckoutErrorMessage(err) ?? t("alerts.unauthorizedMessage"),
                            [
                                {
                                    text: t("actions.signIn"),
                                    onPress: () => router.replace("/auth/login" as never),
                                },
                            ],
                        );
                        return;
                    }
                    if (isCheckoutBusinessError(err)) {
                        Alert.alert(
                            t("alerts.businessTitle"),
                            getCheckoutErrorMessage(err) ?? t("alerts.businessMessage"),
                        );
                        return;
                    }
                    if (isNetworkError(err)) {
                        Alert.alert(
                            t("alerts.networkTitle"),
                            t("alerts.networkMessage"),
                        );
                        return;
                    }
                    const message =
                        getCheckoutErrorMessage(err) ??
                        getAddToCartErrorMessage(err) ??
                        t("alerts.genericMessage");
                    Alert.alert(t("alerts.genericTitle"), message);
                },
            },
        );
    }, [
        address,
        appliedPromo,
        cart?.restaurantName,
        ensureAddressId,
        hasItems,
        isPlacingOrder,
        notes,
        orderType,
        paymentMethod,
        resetAddressId,
        scheduledFor,
        startCheckout,
        t,
        total,
    ]);

    const showLoading = isCartLoading && !cart;

    return (
        <SafeAreaView style={styles.safe} edges={["top"]}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

            <View style={[styles.header, isRTL && styles.rowReverse]}>
                <AnimatedPressable
                    onPress={handleBack}
                    haptic="impact"
                    scaleTo={0.92}
                    style={styles.iconButton}
                    accessibilityRole="button"
                    accessibilityLabel={t("accessibility.goBack")}
                >
                    <Ionicons
                        name={isRTL ? "chevron-forward" : "chevron-back"}
                        size={22}
                        color={colors.onSurface}
                    />
                </AnimatedPressable>

                <View style={styles.headerCenter}>
                    <Text style={[styles.headerEyebrow, { writingDirection }]}>
                        {t("header.eyebrow")}
                    </Text>
                    <Text style={[styles.headerTitle, { writingDirection }]}>
                        {t("header.title")}
                    </Text>
                </View>

                <View style={styles.iconGhost} />
            </View>

            {showLoading ? (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <ActivityIndicator color={colors.primary} />
                </View>
            ) : (
            <>
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
            >
                <ScrollView
                    style={styles.flex}
                    contentContainerStyle={[
                        styles.scrollContent,
                        {
                            paddingBottom:
                                160 + Math.max(insets.bottom, 10),
                        },
                    ]}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Fulfilment mode goes first so the rest of the form
                        adapts to it (pickup hides the delivery address). */}
                    <Animated.View entering={FadeInUp.delay(20).duration(360)}>
                        <CheckoutSectionCard
                            icon="options-outline"
                            title={t("sections.orderType.title")}
                            subtitle={t("sections.orderType.subtitle")}
                        >
                            <OrderTypeSelector
                                value={orderType}
                                options={orderTypeOptions}
                                onChange={setOrderType}
                                disabled={isPlacingOrder}
                            />
                            {orderType === "scheduled" && (
                                <AnimatedPressable
                                    onPress={openSchedulePicker}
                                    haptic="selection"
                                    scaleTo={0.97}
                                    style={[
                                        styles.scheduleButton,
                                        scheduledFor && styles.scheduleButtonSelected,
                                    ]}
                                    accessibilityRole="button"
                                    accessibilityLabel={t("orderType.scheduled.pickButton")}
                                >
                                    <Ionicons
                                        name="time-outline"
                                        size={18}
                                        color={
                                            scheduledFor
                                                ? colors.primary
                                                : colors.outline
                                        }
                                    />
                                    <Text
                                        style={[
                                            styles.scheduleButtonText,
                                            scheduledFor && styles.scheduleButtonTextSelected,
                                            { writingDirection },
                                        ]}
                                    >
                                        {scheduledFor
                                            ? scheduledFor.toLocaleString(isRTL ? "ar" : undefined, {
                                                  dateStyle: "medium",
                                                  timeStyle: "short",
                                              })
                                            : t("orderType.scheduled.pickButton")}
                                    </Text>
                                    <Ionicons
                                        name={isRTL ? "chevron-back" : "chevron-forward"}
                                        size={16}
                                        color={colors.outline}
                                    />
                                </AnimatedPressable>
                            )}
                        </CheckoutSectionCard>
                    </Animated.View>

                    {orderType !== "pickup" && (
                        <Animated.View entering={FadeInUp.delay(40).duration(360)}>
                            <CheckoutSectionCard
                                icon="location-outline"
                                title={t("sections.address.title")}
                                subtitle={t("sections.address.subtitle")}
                            >
                                <AddressActionsRow
                                    onLocationResolved={(loc) =>
                                        setAddress({
                                            ...address,
                                            addressLine:
                                                loc.street ?? address.addressLine ?? "",
                                            street: loc.street ?? address.street,
                                            city: loc.city ?? address.city,
                                            latitude: loc.latitude,
                                            longitude: loc.longitude,
                                        })
                                    }
                                    onSavedSelected={(saved) =>
                                        setAddress({
                                            ...address,
                                            label: saved.label,
                                            addressLine:
                                                saved.street ?? address.addressLine ?? "",
                                            street: saved.street,
                                            city: saved.city,
                                            building: saved.building,
                                            floor: saved.floor,
                                            notes: saved.notes,
                                            latitude: saved.latitude,
                                            longitude: saved.longitude,
                                        })
                                    }
                                />
                                <DeliveryAddressCard
                                    value={address}
                                    onChange={setAddress}
                                    placeholderAddress={t("address.placeholderLine")}
                                    placeholderCity={t("address.placeholderCity")}
                                    placeholderStreet={t("address.placeholderStreet")}
                                    placeholderBuilding={t("address.placeholderBuilding")}
                                    placeholderFloor={t("address.placeholderFloor")}
                                    placeholderNotes={t("address.placeholderNotes")}
                                    error={addressError}
                                />
                            </CheckoutSectionCard>
                        </Animated.View>
                    )}

                    <Animated.View entering={FadeInUp.delay(90).duration(360)}>
                        <CheckoutSectionCard
                            icon="card-outline"
                            title={t("sections.payment.title")}
                            subtitle={t("sections.payment.subtitle")}
                        >
                            <PaymentMethodSelector
                                value={paymentMethod}
                                options={paymentOptions}
                                onChange={setPaymentMethod}
                                disabled={isPlacingOrder}
                            />
                            {/* Inline restaurant bank/wallet details — only when
                                "online" is chosen, so the customer can see where
                                to transfer money BEFORE placing the order. The
                                same card renders again on the success screen
                                next to the proof-upload control. */}
                            {paymentMethod === "online" && cart?.restaurantId ? (
                                <View style={styles.inlinePaymentInfo}>
                                    <PaymentInfoCard restaurantId={cart.restaurantId} />
                                </View>
                            ) : null}
                        </CheckoutSectionCard>
                    </Animated.View>

                    <Animated.View entering={FadeInUp.delay(140).duration(360)}>
                        <CheckoutSectionCard
                            icon="pricetag-outline"
                            title={t("sections.promo.title")}
                            subtitle={t("sections.promo.subtitle")}
                        >
                            <PromoCodeInput
                                placeholder={t("promo.placeholder")}
                                applyLabel={t("promo.apply")}
                                appliedLabel={t("promo.applied")}
                                removeLabel={t("promo.remove")}
                                discountLabel={t("promo.discount")}
                                onApply={handleApplyPromo}
                                onRemove={clearPromo}
                                applied={appliedPromo}
                                isValidating={isValidatingPromo}
                                error={promoError}
                                currency={currency}
                            />
                        </CheckoutSectionCard>
                    </Animated.View>

                    <Animated.View entering={FadeInUp.delay(190).duration(360)}>
                        <CheckoutSectionCard
                            icon="chatbubble-ellipses-outline"
                            title={t("sections.notes.title")}
                            subtitle={t("sections.notes.subtitle")}
                        >
                            <CustomerNotesInput
                                value={notes}
                                onChange={setNotes}
                                placeholder={t("notes.placeholder")}
                            />
                        </CheckoutSectionCard>
                    </Animated.View>

                    <Animated.View entering={FadeInUp.delay(240).duration(360)}>
                        <CheckoutSectionCard
                            icon="receipt-outline"
                            title={t("sections.summary.title")}
                            subtitle={t("sections.summary.subtitle", {
                                count:
                                    cart?.items.reduce(
                                        (sum, item) => sum + item.quantity,
                                        0,
                                    ) ?? 0,
                            })}
                        >
                            <CheckoutOrderSummary
                                subtotal={subtotal}
                                deliveryFee={DELIVERY_FEE}
                                discount={discount}
                                total={total}
                                currency={currency}
                                labels={{
                                    subtotal: t("summary.subtotal"),
                                    deliveryFee: t("summary.deliveryFee"),
                                    discount: t("summary.discount"),
                                    total: t("summary.total"),
                                }}
                            />
                        </CheckoutSectionCard>
                    </Animated.View>

                    <Text
                        style={[
                            styles.secureNote,
                            { textAlign: "center", writingDirection },
                        ]}
                    >
                        <Ionicons
                            name="shield-checkmark-outline"
                            size={12}
                            color={colors.outline}
                        />
                        {"  "}
                        {t("secure.note")}
                    </Text>
                </ScrollView>
            </KeyboardAvoidingView>

            <View pointerEvents="box-none" style={styles.ctaDock}>
                <CheckoutCTA
                    label={
                        isPlacingOrder ? t("cta.placing") : t("cta.placeOrder")
                    }
                    total={total}
                    currency={currency}
                    loading={isPlacingOrder}
                    disabled={!hasItems || isPlacingOrder}
                    onPress={handlePlaceOrder}
                    bottomInset={Math.max(insets.bottom, 10)}
                    accessibilityLabel={t("accessibility.placeOrder")}
                />
            </View>

            {/* iOS scheduled-time modal — bottom sheet w/ spinner so the user
                can spin without committing. Android uses the imperative API
                in `openSchedulePicker` and never hits this modal. */}
            {Platform.OS === "ios" && schedulePickerOpen && (
                <Modal
                    transparent
                    animationType="slide"
                    visible={schedulePickerOpen}
                    onRequestClose={() => setSchedulePickerOpen(false)}
                >
                    <Pressable
                        style={styles.modalBackdrop}
                        onPress={() => setSchedulePickerOpen(false)}
                    />
                    <View
                        style={[
                            styles.modalSheet,
                            { paddingBottom: Math.max(insets.bottom, 16) + 8 },
                        ]}
                    >
                        <View style={styles.modalHeader}>
                            <Pressable
                                onPress={() => setSchedulePickerOpen(false)}
                                accessibilityRole="button"
                                accessibilityLabel={t("orderType.scheduled.cancel")}
                            >
                                <Text style={styles.modalSecondary}>
                                    {t("orderType.scheduled.cancel")}
                                </Text>
                            </Pressable>
                            <Text style={styles.modalTitle}>
                                {t("orderType.scheduled.modalTitle")}
                            </Text>
                            <Pressable
                                onPress={confirmIosSchedule}
                                accessibilityRole="button"
                                accessibilityLabel={t("orderType.scheduled.confirm")}
                            >
                                <Text style={styles.modalPrimary}>
                                    {t("orderType.scheduled.confirm")}
                                </Text>
                            </Pressable>
                        </View>
                        <DateTimePicker
                            value={pendingDate ?? minScheduledAt}
                            mode="datetime"
                            display="spinner"
                            minimumDate={minScheduledAt}
                            onChange={(_, d) => d && setPendingDate(d)}
                        />
                    </View>
                </Modal>
            )}
            </>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: colors.surface,
    },
    // Spacing above the inline PaymentInfoCard so it doesn't crowd the
    // payment-method selector above it.
    inlinePaymentInfo: {
        marginTop: 12,
    },
    scheduleButton: {
        marginTop: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: radii.lg,
        borderWidth: 1.5,
        borderColor: colors.surfaceContainer,
        backgroundColor: colors.surface,
    },
    scheduleButtonSelected: {
        borderColor: colors.primary,
        backgroundColor: colors.faintPrimary,
    },
    scheduleButtonText: {
        flex: 1,
        fontFamily: typography.bodyMedium,
        fontSize: 13,
        color: colors.outline,
    },
    scheduleButtonTextSelected: {
        color: colors.primary,
        fontFamily: typography.bodyBold,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
    },
    modalSheet: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingTop: 8,
    },
    modalHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.surfaceContainer,
    },
    modalTitle: {
        fontFamily: typography.bodyBold,
        fontSize: 15,
        color: colors.onSurface,
    },
    modalPrimary: {
        fontFamily: typography.bodyBold,
        fontSize: 14,
        color: colors.primary,
    },
    modalSecondary: {
        fontFamily: typography.bodyMedium,
        fontSize: 14,
        color: colors.outline,
    },
    flex: {
        flex: 1,
    },
    rowReverse: {
        flexDirection: "row-reverse",
    },
    header: {
        paddingHorizontal: screen.horizontal,
        paddingTop: 6,
        paddingBottom: 10,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    iconButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: colors.card,
        alignItems: "center",
        justifyContent: "center",
        ...shadows.soft,
    },
    iconGhost: {
        width: 42,
        height: 42,
    },
    headerCenter: {
        alignItems: "center",
    },
    headerEyebrow: {
        fontFamily: typography.bodyBold,
        color: colors.outline,
        fontSize: 11,
        lineHeight: 13,
        textAlign: "center",
    },
    headerTitle: {
        marginTop: 1,
        fontFamily: typography.headline,
        color: colors.onSurface,
        fontSize: 20,
        lineHeight: 25,
        textAlign: "center",
    },
    scrollContent: {
        paddingHorizontal: screen.horizontal,
        paddingTop: 6,
        gap: 14,
    },
    secureNote: {
        marginTop: 4,
        fontFamily: typography.bodyMedium,
        color: colors.outline,
        fontSize: 12,
        lineHeight: 16,
    },
    ctaDock: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
    },
});

export default CheckoutScreen;
