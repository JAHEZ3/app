import React, { memo, useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ListRenderItem,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import AnimatedPressable from "@/components/ui/AnimatedPressable";
import FloatingTabBar from "@/components/ui/FloatingTabBar";
import { colors, radii, screen, shadows, typography } from "@/components/ui/theme";
import { useCartT } from "@/hooks/useAppTranslation";
import { useAuthStore } from "@/store/useAuthStore";
import { useLanguageStore } from "@/store/useLanguageStore";
import CartItem from "../components/CartItem";
import CartSummary from "../components/CartSummary";
import { getAddToCartErrorMessage } from "../hooks/useAddToCart";
import { useCart } from "../hooks/useCart";
import { useClearCart } from "../hooks/useClearCart";
import { useRemoveCartItem } from "../hooks/useRemoveCartItem";
import { useUpdateCartItem } from "../hooks/useUpdateCartItem";
import type { Cart, CartItem as CartItemType } from "../types";

const DELIVERY_FEE = 8;
const SUMMARY_HEIGHT = 248;

function CartHeader({
  onBack,
  canClear,
  clearDisabled,
  onClear,
}: {
  onBack: () => void;
  canClear: boolean;
  clearDisabled: boolean;
  onClear: () => void;
}) {
  const { t } = useCartT();
  const isRTL = useLanguageStore((state) => state.isRTL);
  const writingDirection = isRTL ? "rtl" : "ltr";

  return (
    <View style={[styles.header, isRTL && styles.rowReverse]}>
      <AnimatedPressable
        onPress={onBack}
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

      <View style={styles.headerTitleBlock}>
        <Text style={[styles.headerEyebrow, { writingDirection }]}>
          {t("header.eyebrow")}
        </Text>
        <Text style={[styles.headerTitle, { writingDirection }]}>
          {t("header.title")}
        </Text>
      </View>

      {canClear ? (
        <AnimatedPressable
          onPress={onClear}
          disabled={clearDisabled}
          haptic="impact"
          scaleTo={0.92}
          style={styles.clearIconButton}
          disabledStyle={styles.disabledAction}
          accessibilityRole="button"
          accessibilityLabel={t("accessibility.clearCart")}
        >
          <Ionicons name="trash-outline" size={18} color={colors.error} />
        </AnimatedPressable>
      ) : (
        <View style={styles.iconButtonGhost} />
      )}
    </View>
  );
}

const RestaurantBanner = memo(function RestaurantBanner({
  cart,
  disabled,
  onClear,
}: {
  cart: Cart;
  disabled: boolean;
  onClear: () => void;
}) {
  const { t } = useCartT();
  const isRTL = useLanguageStore((state) => state.isRTL);
  const textAlign = isRTL ? "right" : "left";
  const writingDirection = isRTL ? "rtl" : "ltr";
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  const itemLabel = t("items.count", { count: itemCount });

  return (
    <Animated.View entering={FadeInUp.duration(420)} style={styles.bannerWrap}>
      <LinearGradient
        colors={[colors.primary, "#FF7A2B"]}
        start={{ x: isRTL ? 1 : 0, y: 0 }}
        end={{ x: isRTL ? 0 : 1, y: 1 }}
        style={styles.restaurantBanner}
      >
        <View style={[styles.bannerTopRow, isRTL && styles.rowReverse]}>
          <View style={styles.storeIcon}>
            <Ionicons name="storefront" size={19} color={colors.primary} />
          </View>

          <View style={styles.bannerTitleBlock}>
            <Text style={[styles.bannerKicker, { textAlign, writingDirection }]}>
              {t("banner.deliveringFrom")}
            </Text>
            <Text
              style={[styles.restaurantName, { textAlign, writingDirection }]}
              numberOfLines={2}
            >
              {cart.restaurantName}
            </Text>
          </View>

          <AnimatedPressable
            onPress={onClear}
            disabled={disabled}
            haptic="impact"
            scaleTo={0.92}
            style={styles.bannerClearButton}
            disabledStyle={styles.disabledAction}
            accessibilityRole="button"
            accessibilityLabel={t("accessibility.clearCart")}
          >
            <Ionicons name="trash-outline" size={17} color={colors.onPrimary} />
          </AnimatedPressable>
        </View>

        <View style={[styles.bannerMetaRow, isRTL && styles.rowReverse]}>
          <View style={[styles.bannerPill, isRTL && styles.rowReverse]}>
            <Ionicons name="time-outline" size={13} color={colors.onPrimary} />
            <Text style={[styles.bannerPillText, { textAlign, writingDirection }]}>
              {t("banner.eta")}
            </Text>
          </View>
          <View style={[styles.bannerPill, isRTL && styles.rowReverse]}>
            <Ionicons name="bag-handle-outline" size={13} color={colors.onPrimary} />
            <Text style={[styles.bannerPillText, { textAlign, writingDirection }]}>
              {itemLabel}
            </Text>
          </View>
          <View style={[styles.bannerPill, isRTL && styles.rowReverse]}>
            <Ionicons
              name="shield-checkmark-outline"
              size={13}
              color={colors.onPrimary}
            />
            <Text style={[styles.bannerPillText, { textAlign, writingDirection }]}>
              {t("banner.protected")}
            </Text>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
});

function StateBlock({
  icon,
  title,
  body,
  actionLabel,
  onAction,
  loading = false,
  destructive = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  loading?: boolean;
  destructive?: boolean;
}) {
  const isRTL = useLanguageStore((state) => state.isRTL);
  const writingDirection = isRTL ? "rtl" : "ltr";

  return (
    <Animated.View entering={FadeIn.duration(260)} style={styles.stateWrap}>
      <View style={[styles.stateIllustration, destructive && styles.stateIllustrationError]}>
        <View style={styles.stateOrbLg} />
        <View style={[styles.stateOrbSm, isRTL && styles.stateOrbSmRtl]} />
        <View style={styles.stateIcon}>
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : (
            <Ionicons
              name={icon}
              size={38}
              color={destructive ? colors.error : colors.primary}
            />
          )}
        </View>
      </View>

      <Text style={[styles.stateTitle, { writingDirection }]}>{title}</Text>
      <Text style={[styles.stateBody, { writingDirection }]}>{body}</Text>

      {actionLabel && onAction ? (
        <AnimatedPressable
          onPress={onAction}
          haptic="impact"
          scaleTo={0.96}
          style={[styles.stateButton, isRTL && styles.rowReverse]}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={[styles.stateButtonText, { writingDirection }]}>
            {actionLabel}
          </Text>
          <Ionicons
            name={isRTL ? "arrow-back" : "arrow-forward"}
            size={16}
            color={colors.onPrimary}
          />
        </AnimatedPressable>
      ) : null}
    </Animated.View>
  );
}

function CartScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useCartT();
  const authStatus = useAuthStore((state) => state.status);
  const isAuthed = authStatus === "authenticated";
  const isAuthBooting = authStatus === "idle" || authStatus === "loading";
  const currency = t("price.currency");

  const { data: cart, isLoading, isError, error, refetch, isRefetching } = useCart();
  const { mutate: updateCartItem, isPending: isUpdatingItem } = useUpdateCartItem();
  const { mutate: removeCartItem, isPending: isRemovingItem } = useRemoveCartItem();
  const { mutate: clearCart, isPending: isClearingCart } = useClearCart();

  const hasItems = !!cart?.items.length;
  const showSummary = isAuthed && !isLoading && !isError && hasItems;
  const isMutating = isUpdatingItem || isRemovingItem || isClearingCart;
  const itemCount = useMemo(
    () => cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0,
    [cart?.items],
  );

  const handleBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/home/Home" as never);
  }, []);

  const handleChangeQuantity = useCallback(
    (mealId: string, nextQuantity: number) => {
      if (nextQuantity <= 0) {
        removeCartItem(mealId);
        return;
      }

      updateCartItem({ mealId, input: { quantity: nextQuantity } });
    },
    [removeCartItem, updateCartItem],
  );

  const handleRemoveItem = useCallback(
    (mealId: string) => {
      removeCartItem(mealId);
    },
    [removeCartItem],
  );

  const handleClearCart = useCallback(() => {
    if (isMutating || !hasItems) return;

    Alert.alert(
      t("alerts.clearTitle"),
      t("alerts.clearMessage"),
      [
        { text: t("actions.cancel"), style: "cancel" },
        {
          text: t("actions.clear"),
          style: "destructive",
          onPress: () => clearCart(),
        },
      ],
    );
  }, [clearCart, hasItems, isMutating, t]);

  const handleCheckout = useCallback(() => {
    Alert.alert(t("alerts.checkoutTitle"), t("alerts.checkoutMessage"));
  }, [t]);

  const keyExtractor = useCallback((item: CartItemType) => {
    const optionsKey = item.options.map((option) => option.optionId).join("-");
    return `${item.mealId}-${optionsKey || "base"}`;
  }, []);

  const renderItem = useCallback<ListRenderItem<CartItemType>>(
    ({ item, index }) => (
      <CartItem
        item={item}
        index={index}
        currency={currency}
        disabled={isMutating}
        onChangeQuantity={handleChangeQuantity}
        onRemove={handleRemoveItem}
      />
    ),
    [currency, handleChangeQuantity, handleRemoveItem, isMutating],
  );

  const listHeader = useMemo(
    () =>
      cart ? (
        <RestaurantBanner cart={cart} disabled={isMutating} onClear={handleClearCart} />
      ) : null,
    [cart, handleClearCart, isMutating],
  );

  const contentBottomPadding = showSummary
    ? SUMMARY_HEIGHT + Math.max(insets.bottom, 10)
    : screen.bottomTabSpace + 30;

  const errorMessage =
    getAddToCartErrorMessage(error) ?? error?.message ?? t("state.errorFallback");

  let content: React.ReactNode;
  if (isAuthBooting) {
    content = (
      <StateBlock
        icon="bag-handle-outline"
        title={t("state.preparingTitle")}
        body={t("state.preparingBody")}
        loading
      />
    );
  } else if (!isAuthed) {
    content = (
      <StateBlock
        icon="lock-closed-outline"
        title={t("state.signedOutTitle")}
        body={t("state.signedOutBody")}
        actionLabel={t("actions.signIn")}
        onAction={() => router.push("/auth/login" as never)}
      />
    );
  } else if (isLoading) {
    content = (
      <StateBlock
        icon="bag-handle-outline"
        title={t("state.loadingTitle")}
        body={t("state.loadingBody")}
        loading
      />
    );
  } else if (isError) {
    content = (
      <StateBlock
        icon="alert-circle-outline"
        title={t("state.errorTitle")}
        body={errorMessage}
        actionLabel={t("actions.retry")}
        onAction={refetch}
        destructive
      />
    );
  } else if (!cart) {
    content = (
      <StateBlock
        icon="cart-outline"
        title={t("state.emptyTitle")}
        body={t("state.emptyBody")}
        actionLabel={t("actions.browseRestaurants")}
        onAction={() => router.push("/restaurants" as never)}
      />
    );
  } else {
    content = (
      <FlatList
        data={cart.items}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: contentBottomPadding },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        extraData={`${isMutating}-${currency}`}
        removeClippedSubviews
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      <CartHeader
        onBack={handleBack}
        canClear={hasItems}
        clearDisabled={isMutating}
        onClear={handleClearCart}
      />

      <View style={styles.content}>{content}</View>

      {showSummary && cart ? (
        <View pointerEvents="box-none" style={styles.summaryDock}>
          <CartSummary
            subtotal={cart.subtotal}
            itemCount={itemCount}
            deliveryFee={DELIVERY_FEE}
            currency={currency}
            bottomInset={Math.max(insets.bottom, 10)}
            disabled={isMutating}
            onCheckout={handleCheckout}
          />
        </View>
      ) : null}

      {!showSummary ? <FloatingTabBar /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
  header: {
    paddingHorizontal: screen.horizontal,
    paddingTop: 6,
    paddingBottom: 12,
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
  clearIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFF0EA",
    alignItems: "center",
    justifyContent: "center",
    ...shadows.soft,
  },
  iconButtonGhost: {
    width: 42,
    height: 42,
  },
  headerTitleBlock: {
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
  content: {
    flex: 1,
  },
  listContent: {
    paddingTop: 6,
    gap: 14,
    flexGrow: 1,
  },
  bannerWrap: {
    paddingHorizontal: 20,
  },
  restaurantBanner: {
    borderRadius: 26,
    padding: 16,
    overflow: "hidden",
    ...shadows.primary,
  },
  bannerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  storeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.onPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  bannerKicker: {
    fontFamily: typography.bodyBold,
    color: "rgba(255,255,255,0.78)",
    fontSize: 11,
    lineHeight: 13,
  },
  restaurantName: {
    marginTop: 2,
    fontFamily: typography.headline,
    color: colors.onPrimary,
    fontSize: 20,
    lineHeight: 25,
  },
  bannerClearButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  bannerMetaRow: {
    marginTop: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  bannerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radii.pill,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  bannerPillText: {
    fontFamily: typography.bodyBold,
    color: colors.onPrimary,
    fontSize: 11,
    lineHeight: 13,
  },
  stateWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    paddingBottom: screen.bottomTabSpace,
  },
  stateIllustration: {
    width: 142,
    height: 124,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginBottom: 10,
  },
  stateIllustrationError: {
    opacity: 0.96,
  },
  stateOrbLg: {
    position: "absolute",
    width: 118,
    height: 92,
    borderRadius: 46,
    backgroundColor: colors.faintPrimary,
    transform: [{ rotate: "-8deg" }],
  },
  stateOrbSm: {
    position: "absolute",
    right: 8,
    top: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.card,
    ...shadows.soft,
  },
  stateOrbSmRtl: {
    right: undefined,
    left: 8,
  },
  stateIcon: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.card,
  },
  stateTitle: {
    fontFamily: typography.headline,
    color: colors.onSurface,
    fontSize: 22,
    lineHeight: 28,
    textAlign: "center",
  },
  stateBody: {
    marginTop: 8,
    fontFamily: typography.bodyMedium,
    color: colors.outline,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  stateButton: {
    marginTop: 22,
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 22,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    ...shadows.primary,
  },
  stateButtonText: {
    fontFamily: typography.headlineSemi,
    color: colors.onPrimary,
    fontSize: 15,
    lineHeight: 19,
  },
  summaryDock: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
  },
  disabledAction: {
    opacity: 0.55,
  },
});

export default CartScreen;
