import React, { memo, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import AnimatedPressable from "@/components/ui/AnimatedPressable";
import FloatingTabBar from "@/components/ui/FloatingTabBar";
import { colors, radii, screen, shadows, typography } from "@/components/ui/theme";
import { useAuthStore } from "@/store/useAuthStore";
import { useClearCart } from "../hooks/useClearCart";
import { useCart } from "../hooks/useCart";
import { useRemoveCartItem } from "../hooks/useRemoveCartItem";
import { useUpdateCartItem } from "../hooks/useUpdateCartItem";
import { getAddToCartErrorMessage } from "../hooks/useAddToCart";
import type { Cart, CartItem } from "../types";

const formatPrice = (value: number) =>
  `${value.toFixed(value % 1 === 0 ? 0 : 2)} SAR`;

function CartHeader({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.headerBar}>
      <AnimatedPressable onPress={onBack} style={styles.backBtn}>
        <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
      </AnimatedPressable>
      <Text style={styles.headerTitle}>سلتي</Text>
      <View style={styles.backBtn} />
    </View>
  );
}

const ItemRow = memo(function ItemRow({
  item,
  onChangeQty,
  onRemoveItem,
  disabled,
}: {
  item: CartItem;
  onChangeQty: (mealId: string, nextQty: number) => void;
  onRemoveItem: (mealId: string) => void;
  disabled: boolean;
}) {
  const handleDecrement = useCallback(
    () => onChangeQty(item.mealId, item.quantity - 1),
    [item.mealId, item.quantity, onChangeQty],
  );
  const handleIncrement = useCallback(
    () => onChangeQty(item.mealId, item.quantity + 1),
    [item.mealId, item.quantity, onChangeQty],
  );
  const handleRemove = useCallback(
    () => onRemoveItem(item.mealId),
    [item.mealId, onRemoveItem],
  );

  const isRemoveAction = item.quantity <= 1;

  return (
    <View style={styles.itemRow}>
      <View style={styles.itemBody}>
        <Text style={styles.itemName} numberOfLines={2}>
          {item.mealName}
        </Text>
        {item.options.length > 0 ? (
          <Text style={styles.itemMeta} numberOfLines={2}>
            {item.options.map((o) => o.optionName).join(" • ")}
          </Text>
        ) : null}
        <Text style={styles.itemUnit}>{formatPrice(item.unitPrice)} / وحدة</Text>

        <View style={styles.stepper}>
          <AnimatedPressable
            onPress={handleDecrement}
            disabled={disabled}
            style={[styles.stepBtn, isRemoveAction && styles.stepBtnDanger]}
            haptic="impact"
          >
            <Ionicons
              name={isRemoveAction ? "trash-outline" : "remove"}
              size={16}
              color={isRemoveAction ? colors.error : colors.onSurface}
            />
          </AnimatedPressable>
          <Text style={styles.stepValue}>{item.quantity}</Text>
          <AnimatedPressable
            onPress={handleIncrement}
            disabled={disabled}
            style={styles.stepBtn}
            haptic="impact"
          >
            <Ionicons name="add" size={16} color={colors.onSurface} />
          </AnimatedPressable>
        </View>
      </View>

      <View style={styles.itemAside}>
        <Text style={styles.itemTotal}>{formatPrice(item.totalPrice)}</Text>
        <AnimatedPressable
          onPress={handleRemove}
          disabled={disabled}
          style={styles.removeBtn}
          haptic="impact"
        >
          <Ionicons name="trash-outline" size={15} color={colors.error} />
        </AnimatedPressable>
      </View>
    </View>
  );
});

function LoadedState({ cart }: { cart: Cart }) {
  const {
    mutate: updateCartItem,
    isPending: isUpdatingItem,
  } = useUpdateCartItem();
  const {
    mutate: removeCartItem,
    isPending: isRemovingItem,
  } = useRemoveCartItem();
  const {
    mutate: clearCart,
    isPending: isClearingCart,
  } = useClearCart();
  const isMutating = isUpdatingItem || isRemovingItem || isClearingCart;

  const handleChangeQty = useCallback(
    (mealId: string, nextQty: number) => {
      if (nextQty <= 0) {
        removeCartItem(mealId);
        return;
      }

      updateCartItem({ mealId, input: { quantity: nextQty } });
    },
    [removeCartItem, updateCartItem],
  );
  const handleRemoveItem = useCallback(
    (mealId: string) => removeCartItem(mealId),
    [removeCartItem],
  );
  const handleClearCart = useCallback(() => {
    if (isMutating) return;

    Alert.alert(
      "إفراغ السلة",
      "هل تريد حذف كل الوجبات من السلة؟",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "إفراغ",
          style: "destructive",
          onPress: () => clearCart(),
        },
      ],
    );
  }, [clearCart, isMutating]);

  return (
    <>
      <View style={styles.restaurantCard}>
        <View style={styles.restaurantIcon}>
          <Ionicons name="storefront" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.restaurantLabel}>الطلب من</Text>
          <Text style={styles.restaurantName} numberOfLines={2}>
            {cart.restaurantName}
          </Text>
        </View>
      </View>

      <View style={styles.itemsBlock}>
        <View style={styles.blockHeader}>
          <Text style={styles.blockTitle}>الوجبات</Text>
          <View style={styles.countPill}>
            <Text style={styles.countText}>{cart.items.length}</Text>
          </View>
          <AnimatedPressable
            onPress={handleClearCart}
            disabled={isMutating}
            style={[styles.clearCartBtn, isMutating && styles.disabledAction]}
            haptic="impact"
          >
            <Ionicons name="trash-outline" size={14} color={colors.error} />
            <Text style={styles.clearCartText}>إفراغ السلة</Text>
          </AnimatedPressable>
        </View>

        <View style={styles.itemsCard}>
          {cart.items.map((item, idx) => (
            <View key={item.mealId}>
              <ItemRow
                item={item}
                onChangeQty={handleChangeQty}
                onRemoveItem={handleRemoveItem}
                disabled={isMutating}
              />
              {idx < cart.items.length - 1 ? <View style={styles.divider} /> : null}
            </View>
          ))}
        </View>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>المجموع</Text>
        <Text style={styles.summaryValue}>{formatPrice(cart.subtotal)}</Text>
      </View>
    </>
  );
}

function EmptyState() {
  return (
    <View style={styles.stateWrap}>
      <View style={styles.stateIconLg}>
        <Ionicons name="cart-outline" size={36} color={colors.primary} />
      </View>
      <Text style={styles.stateTitle}>سلتك فارغة</Text>
      <Text style={styles.stateBody}>تصفح المطاعم وأضف وجباتك المفضلة لتظهر هنا.</Text>
      <AnimatedPressable
        onPress={() => router.push("/restaurants" as never)}
        style={styles.primaryBtn}
        haptic="impact"
      >
        <Text style={styles.primaryBtnText}>تصفح المطاعم</Text>
      </AnimatedPressable>
    </View>
  );
}

function LoadingState({ message }: { message?: string }) {
  return (
    <View style={styles.stateWrap}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.stateBody}>{message ?? "جاري تحميل السلة…"}</Text>
    </View>
  );
}

function NotSignedInState() {
  return (
    <View style={styles.stateWrap}>
      <View style={styles.stateIconLg}>
        <Ionicons name="lock-closed-outline" size={36} color={colors.primary} />
      </View>
      <Text style={styles.stateTitle}>سجّل الدخول لعرض سلتك</Text>
      <Text style={styles.stateBody}>تحتاج إلى تسجيل الدخول لمشاهدة الوجبات في السلة.</Text>
      <AnimatedPressable
        onPress={() => router.push("/auth/login" as never)}
        style={styles.primaryBtn}
        haptic="impact"
      >
        <Text style={styles.primaryBtnText}>تسجيل الدخول</Text>
      </AnimatedPressable>
    </View>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.stateWrap}>
      <View style={[styles.stateIconLg, styles.stateIconError]}>
        <Ionicons name="alert-circle-outline" size={36} color={colors.error} />
      </View>
      <Text style={styles.stateTitle}>تعذر تحميل السلة</Text>
      <Text style={styles.stateBody}>{message}</Text>
      <AnimatedPressable onPress={onRetry} style={styles.primaryBtn} haptic="impact">
        <Text style={styles.primaryBtnText}>إعادة المحاولة</Text>
      </AnimatedPressable>
    </View>
  );
}

const CartScreen = () => {
  const authStatus = useAuthStore((s) => s.status);
  const isAuthed = authStatus === "authenticated";
  const isAuthBooting = authStatus === "idle" || authStatus === "loading";

  const { data: cart, isLoading, isError, error, refetch, isRefetching } = useCart();

  const handleBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/home/Home" as never);
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      <CartHeader onBack={handleBack} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {isAuthBooting ? (
          <LoadingState message="جاري التحقق من الجلسة…" />
        ) : !isAuthed ? (
          <NotSignedInState />
        ) : isLoading ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState
            message={
              getAddToCartErrorMessage(error) ?? error?.message ?? "حدث خطأ غير متوقع."
            }
            onRetry={refetch}
          />
        ) : cart ? (
          <LoadedState cart={cart} />
        ) : (
          <EmptyState />
        )}
      </ScrollView>

      <FloatingTabBar />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  headerBar: {
    paddingHorizontal: screen.horizontal,
    paddingTop: 6,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.soft,
  },
  headerTitle: {
    fontFamily: typography.headlineSemi,
    color: colors.onSurface,
    fontSize: 18,
  },
  scroll: {
    paddingHorizontal: screen.horizontal,
    paddingTop: 8,
    paddingBottom: screen.bottomTabSpace + 20,
    gap: 16,
    flexGrow: 1,
  },
  restaurantCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: 14,
    ...shadows.soft,
  },
  restaurantIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.faintPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  restaurantLabel: {
    fontFamily: typography.body,
    color: colors.outline,
    fontSize: 11,
  },
  restaurantName: {
    fontFamily: typography.headlineSemi,
    color: colors.onSurface,
    fontSize: 16,
    marginTop: 2,
  },
  itemsBlock: {
    gap: 10,
  },
  blockHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  blockTitle: {
    fontFamily: typography.headlineSemi,
    color: colors.onSurface,
    fontSize: 17,
  },
  countPill: {
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 9,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  countText: {
    color: colors.outline,
    fontFamily: typography.bodyBold,
    fontSize: 11,
  },
  clearCartBtn: {
    marginLeft: "auto",
    minHeight: 32,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#FFE4DA",
    borderRadius: radii.pill,
  },
  clearCartText: {
    color: colors.error,
    fontFamily: typography.bodyBold,
    fontSize: 11,
  },
  disabledAction: {
    opacity: 0.6,
  },
  itemsCard: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: 6,
    ...shadows.soft,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  itemBody: {
    flex: 1,
    gap: 4,
  },
  itemAside: {
    minWidth: 82,
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 10,
  },
  stepper: {
    marginTop: 8,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.pill,
    paddingHorizontal: 4,
    minHeight: 36,
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBtnDanger: {
    backgroundColor: "#FFE4DA",
  },
  stepValue: {
    minWidth: 24,
    textAlign: "center",
    color: colors.onSurface,
    fontFamily: typography.bodyBold,
    fontSize: 13,
  },
  itemName: {
    fontFamily: typography.bodyBold,
    color: colors.onSurface,
    fontSize: 14,
  },
  itemMeta: {
    fontFamily: typography.body,
    color: colors.outline,
    fontSize: 11,
  },
  itemUnit: {
    fontFamily: typography.bodyMedium,
    color: colors.outline,
    fontSize: 11,
    marginTop: 2,
  },
  itemTotal: {
    fontFamily: typography.bodyBold,
    color: colors.onSurface,
    fontSize: 14,
    textAlign: "right",
  },
  removeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#FFE4DA",
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    height: 1,
    backgroundColor: colors.surfaceContainer,
    marginHorizontal: 10,
  },
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: 16,
    ...shadows.card,
  },
  summaryLabel: {
    fontFamily: typography.headlineSemi,
    color: colors.onSurface,
    fontSize: 15,
  },
  summaryValue: {
    fontFamily: typography.headline,
    color: colors.primary,
    fontSize: 20,
  },
  stateWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingVertical: 60,
  },
  stateIconLg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.faintPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  stateIconError: {
    backgroundColor: "#FFE4DA",
  },
  stateTitle: {
    fontFamily: typography.headlineSemi,
    color: colors.onSurface,
    fontSize: 18,
  },
  stateBody: {
    fontFamily: typography.body,
    color: colors.outline,
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  primaryBtn: {
    marginTop: 6,
    paddingHorizontal: 22,
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    ...shadows.primary,
  },
  primaryBtnText: {
    color: colors.onPrimary,
    fontFamily: typography.bodyBold,
    fontSize: 14,
  },
});

export default CartScreen;
