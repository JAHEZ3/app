import React, { useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  ListRenderItem,
  RefreshControl,
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
import { useLanguageStore } from "@/store/useLanguageStore";
import { useOrdersT } from "@/hooks/useAppTranslation";
import OrderCard from "../components/OrderCard";
import { useOrders } from "../hooks/useOrders";
import type { OrderListItem } from "../types";

const keyExtractor = (item: OrderListItem) => item.orderId;

function OrdersHeader({
  onBack,
  total,
}: {
  onBack: () => void;
  total: number;
}) {
  const { t } = useOrdersT();
  const isRTL = useLanguageStore((state) => state.isRTL);
  const writingDirection = isRTL ? "rtl" : "ltr";
  const subtitleKey =
    total > 0 ? "subtitle.withCount" : "subtitle.empty";

  return (
    <View style={[styles.header, isRTL && styles.rowReverse]}>
      <AnimatedPressable
        onPress={onBack}
        haptic="impact"
        scaleTo={0.92}
        style={styles.iconButton}
        accessibilityRole="button"
      >
        <Ionicons
          name={isRTL ? "chevron-forward" : "chevron-back"}
          size={22}
          color={colors.onSurface}
        />
      </AnimatedPressable>

      <View style={styles.headerTitleBlock}>
        <Text style={[styles.headerEyebrow, { writingDirection }]}>
          {t("header.eyebrow", { defaultValue: "Your activity" })}
        </Text>
        <Text style={[styles.headerTitle, { writingDirection }]}>
          {t("title")}
        </Text>
        <Text style={[styles.headerSubtitle, { writingDirection }]}>
          {t(subtitleKey, { count: total, defaultValue: "" })}
        </Text>
      </View>

      <View style={styles.iconButtonGhost} />
    </View>
  );
}

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
    <View style={styles.stateWrap}>
      <View style={styles.stateIcon}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : (
          <Ionicons
            name={icon}
            size={36}
            color={destructive ? colors.error : colors.primary}
          />
        )}
      </View>
      <Text style={[styles.stateTitle, { writingDirection }]}>{title}</Text>
      <Text style={[styles.stateBody, { writingDirection }]}>{body}</Text>

      {actionLabel && onAction ? (
        <AnimatedPressable
          onPress={onAction}
          haptic="impact"
          scaleTo={0.96}
          style={styles.stateButton}
          accessibilityRole="button"
        >
          <Text style={styles.stateButtonText}>{actionLabel}</Text>
        </AnimatedPressable>
      ) : null}
    </View>
  );
}

function FooterLoader({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <View style={styles.footerLoader}>
      <ActivityIndicator size="small" color={colors.primary} />
    </View>
  );
}

function OrdersScreen() {
  const { t } = useOrdersT();
  const authStatus = useAuthStore((state) => state.status);
  const isAuthed = authStatus === "authenticated";
  const isAuthBooting = authStatus === "idle" || authStatus === "loading";

  const {
    orders,
    total,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useOrders({ enabled: isAuthed });

  const handleBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/home/Home" as never);
  }, []);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleOrderPress = useCallback((order: OrderListItem) => {
    router.push(`/orders/${order.orderId}` as never);
  }, []);

  const renderItem = useCallback<ListRenderItem<OrderListItem>>(
    ({ item }) => <OrderCard order={item} onPress={handleOrderPress} />,
    [handleOrderPress],
  );

  const showFullScreenError = isError && orders.length === 0;
  const showInitialLoader = (isLoading || isAuthBooting) && orders.length === 0;

  let content: React.ReactNode;

  if (!isAuthed && !isAuthBooting) {
    content = (
      <StateBlock
        icon="lock-closed-outline"
        title={t("signedOut.title", { defaultValue: "Sign in to view orders" })}
        body={t("signedOut.body", {
          defaultValue: "Your past orders will appear here after you sign in.",
        })}
        actionLabel={t("signedOut.action", { defaultValue: "Sign in" })}
        onAction={() => router.push("/auth/login" as never)}
      />
    );
  } else if (showInitialLoader) {
    content = (
      <StateBlock
        icon="receipt-outline"
        title={t("loading.title", { defaultValue: "Loading your orders" })}
        body={t("loading.body", { defaultValue: "Just a moment…" })}
        loading
      />
    );
  } else if (showFullScreenError) {
    content = (
      <StateBlock
        icon="alert-circle-outline"
        title={t("error.title", { defaultValue: "Could not load orders" })}
        body={
          error?.message ??
          t("error.body", { defaultValue: "Please try again." })
        }
        actionLabel={t("error.action", { defaultValue: "Retry" })}
        onAction={refetch}
        destructive
      />
    );
  } else if (orders.length === 0) {
    content = (
      <StateBlock
        icon="receipt-outline"
        title={t("empty.title")}
        body={t("empty.subtitle")}
        actionLabel={t("empty.action", { defaultValue: "Browse restaurants" })}
        onAction={() => router.push("/restaurants" as never)}
      />
    );
  } else {
    content = (
      <FlatList
        data={orders}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.4}
        ListFooterComponent={<FooterLoader visible={isFetchingNextPage} />}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !isFetchingNextPage}
            onRefresh={refetch}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={9}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      <OrdersHeader onBack={handleBack} total={total} />
      <View style={styles.content}>{content}</View>
      <FloatingTabBar />
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
    paddingBottom: 14,
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
  iconButtonGhost: {
    width: 42,
    height: 42,
  },
  headerTitleBlock: {
    flex: 1,
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
  headerSubtitle: {
    marginTop: 2,
    fontFamily: typography.body,
    color: colors.outline,
    fontSize: 11,
    lineHeight: 14,
    textAlign: "center",
  },
  content: {
    flex: 1,
  },
  listContent: {
    paddingTop: 4,
    paddingBottom: screen.bottomTabSpace + 16,
    flexGrow: 1,
  },
  separator: {
    height: 12,
  },
  footerLoader: {
    paddingVertical: 18,
    alignItems: "center",
  },
  stateWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    paddingBottom: screen.bottomTabSpace,
    gap: 10,
  },
  stateIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.faintPrimary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  stateTitle: {
    fontFamily: typography.headline,
    color: colors.onSurface,
    fontSize: 22,
    lineHeight: 28,
    textAlign: "center",
  },
  stateBody: {
    fontFamily: typography.bodyMedium,
    color: colors.outline,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  stateButton: {
    marginTop: 14,
    minHeight: 48,
    paddingHorizontal: 22,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.primary,
  },
  stateButtonText: {
    fontFamily: typography.headlineSemi,
    color: colors.onPrimary,
    fontSize: 15,
    lineHeight: 19,
  },
});

export default OrdersScreen;
