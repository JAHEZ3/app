import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
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
import { colors, screen, shadows, typography } from "@/components/ui/theme";
import { useTranslation } from "react-i18next";
import { useLanguageStore } from "@/store/useLanguageStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useCart } from "@/modules/Cart/hooks/useCart";
import { getAddToCartErrorMessage } from "@/modules/Cart/hooks/useAddToCart";
import CheckoutSectionCard from "../components/CheckoutSectionCard";
import DeliveryAddressCard from "../components/DeliveryAddressCard";
import PaymentMethodSelector, { PaymentMethodOption } from "../components/PaymentMethodSelector";
import PromoCodeInput from "../components/PromoCodeInput";
import CustomerNotesInput from "../components/CustomerNotesInput";
import CheckoutOrderSummary from "../components/CheckoutOrderSummary";
import CheckoutCTA from "../components/CheckoutCTA";
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
    });
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash_on_delivery");
    const [notes, setNotes] = useState("");
    const [addressError, setAddressError] = useState<string | null>(null);

    const paymentOptions = useMemo(() => buildPaymentOptions(t), [t]);

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
        if (!isCartLoading && !hasItems && isAuthed) {
            // Cart was emptied — bounce back
            if (router.canGoBack()) router.back();
            else router.replace("/cart" as never);
        }
    }, [hasItems, isAuthed, isCartLoading]);

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

        const addressLine = address.addressLine.trim();
        if (!addressLine) {
            setAddressError(t("errors.addressRequired"));
            return;
        }
        setAddressError(null);

        const street = address.street?.trim() || addressLine;
        const city = address.city?.trim() || "";

        // Server stores this as JSONB and uses it for the receipt and the
        // delivery agent's map pin. lat/lng default to 0 until we wire a picker.
        const addressSnapshot: AddressSnapshot = {
            street,
            city,
            lat: address.latitude ?? 0,
            lng: address.longitude ?? 0,
            ...(address.label ? { label: address.label } : {}),
        };

        startCheckout(
            {
                addressId: ensureAddressId(),
                paymentMethod,
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
                    router.replace({
                        pathname: "/checkout/success",
                        params: {
                            orderId,
                            orderNumber: order.orderNumber ?? "",
                            total: String(resolvedTotal),
                            paymentMethod: String(order.paymentMethod ?? paymentMethod),
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
        paymentMethod,
        resetAddressId,
        startCheckout,
        t,
        total,
    ]);

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
                    <Animated.View entering={FadeInUp.delay(40).duration(360)}>
                        <CheckoutSectionCard
                            icon="location-outline"
                            title={t("sections.address.title")}
                            subtitle={t("sections.address.subtitle")}
                        >
                            <DeliveryAddressCard
                                value={address}
                                onChange={setAddress}
                                placeholderAddress={t("address.placeholderLine")}
                                placeholderCity={t("address.placeholderCity")}
                                placeholderStreet={t("address.placeholderStreet")}
                                error={addressError}
                            />
                        </CheckoutSectionCard>
                    </Animated.View>

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
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: colors.surface,
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
