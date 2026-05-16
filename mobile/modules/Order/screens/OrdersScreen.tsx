import React, { useCallback, useMemo } from "react";
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
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import AnimatedPressable from "@/components/ui/AnimatedPressable";
import FloatingTabBar from "@/components/ui/FloatingTabBar";
import { colors, radii, screen, shadows, typography } from "@/components/ui/theme";
import { useAuthStore } from "@/store/useAuthStore";
import { useLanguageStore } from "@/store/useLanguageStore";
import { useOrdersT } from "@/hooks/useAppTranslation";
import OrderCard from "../components/OrderCard";
import OrderCardSkeleton from "../components/OrderCardSkeleton";
import { getOrdersErrorMessage, useOrders } from "../hooks/useOrders";
import type { OrderListItem } from "../types";

const SKELETON_COUNT = 5;

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
    const subtitleKey = total > 0 ? "subtitle.withCount" : "subtitle.empty";

    return (
        <View style={[styles.header, isRTL && styles.rowReverse]}>
            <AnimatedPressable
                onPress={onBack}
                haptic="impact"
                scaleTo={0.92}
                style={styles.iconButton}
                accessibilityRole="button"
                accessibilityLabel={t("accessibility.goBack", {
                    defaultValue: "Go back",
                })}
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
                {total > 0 ? (
                    <Text style={[styles.headerSubtitle, { writingDirection }]}>
                        {t(subtitleKey, { count: total, defaultValue: "" })}
                    </Text>
                ) : null}
            </View>

            <View style={styles.iconButtonGhost} />
        </View>
    );
}

function EmptyState({
    icon,
    title,
    body,
    actionLabel,
    onAction,
    destructive = false,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    body: string;
    actionLabel?: string;
    onAction?: () => void;
    destructive?: boolean;
}) {
    const isRTL = useLanguageStore((state) => state.isRTL);
    const writingDirection = isRTL ? "rtl" : "ltr";

    return (
        <Animated.View entering={FadeIn.duration(360)} style={styles.stateWrap}>
            <View style={styles.stateIllustration}>
                <LinearGradient
                    colors={
                        destructive
                            ? ["#FFE2DC", "#FFD0C5"]
                            : ["#FFE9D8", "#FFD2B5"]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.stateOrb}
                />
                <View style={styles.stateIconCircle}>
                    <Ionicons
                        name={icon}
                        size={38}
                        color={destructive ? colors.error : colors.primary}
                    />
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

function SkeletonList() {
    return (
        <View style={styles.skeletonList}>
            {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                <View key={i} style={styles.skeletonItem}>
                    <OrderCardSkeleton />
                </View>
            ))}
        </View>
    );
}

function FooterLoader({
    visible,
    label,
}: {
    visible: boolean;
    label: string;
}) {
    const isRTL = useLanguageStore((s) => s.isRTL);
    const writingDirection = isRTL ? "rtl" : "ltr";

    if (!visible) return null;
    return (
        <Animated.View
            entering={FadeInUp.duration(220)}
            style={styles.footerLoader}
        >
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.footerText, { writingDirection }]}>
                {label}
            </Text>
        </Animated.View>
    );
}

function EndReachedBadge({ visible, label }: { visible: boolean; label: string }) {
    const isRTL = useLanguageStore((s) => s.isRTL);
    const writingDirection = isRTL ? "rtl" : "ltr";

    if (!visible) return null;
    return (
        <View style={styles.endBadge}>
            <View style={styles.endBadgeInner}>
                <Ionicons
                    name="checkmark-circle"
                    size={14}
                    color={colors.primary}
                />
                <Text style={[styles.endBadgeText, { writingDirection }]}>
                    {label}
                </Text>
            </View>
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
        hasNextPage,
        isFetchingNextPage,
        loadMore,
    } = useOrders({ enabled: isAuthed });

    const handleBack = useCallback(() => {
        if (router.canGoBack()) router.back();
        else router.replace("/home/Home" as never);
    }, []);

    const handleOrderPress = useCallback((order: OrderListItem) => {
        router.push(`/orders/${order.orderId}` as never);
    }, []);

    const renderItem = useCallback<ListRenderItem<OrderListItem>>(
        ({ item, index }) => (
            <OrderCard order={item} onPress={handleOrderPress} index={index} />
        ),
        [handleOrderPress],
    );

    const itemSeparator = useCallback(
        () => <View style={styles.separator} />,
        [],
    );

    const showFullScreenError = isError && orders.length === 0;
    const showInitialLoader = (isLoading || isAuthBooting) && orders.length === 0;

    const listFooter = useMemo(
        () => (
            <>
                <FooterLoader
                    visible={isFetchingNextPage}
                    label={t("loading.more", { defaultValue: "Loading more…" })}
                />
                <EndReachedBadge
                    visible={
                        !hasNextPage && orders.length > 0 && !isFetchingNextPage
                    }
                    label={t("endOfList", {
                        defaultValue: "You're all caught up",
                    })}
                />
            </>
        ),
        [hasNextPage, isFetchingNextPage, orders.length, t],
    );

    let content: React.ReactNode;

    if (!isAuthed && !isAuthBooting) {
        content = (
            <EmptyState
                icon="lock-closed-outline"
                title={t("signedOut.title", { defaultValue: "Sign in to view orders" })}
                body={t("signedOut.body", {
                    defaultValue:
                        "Your past orders will appear here after you sign in.",
                })}
                actionLabel={t("signedOut.action", { defaultValue: "Sign in" })}
                onAction={() => router.push("/auth/login" as never)}
            />
        );
    } else if (showInitialLoader) {
        content = <SkeletonList />;
    } else if (showFullScreenError) {
        content = (
            <EmptyState
                icon="alert-circle-outline"
                title={t("error.title", { defaultValue: "Could not load orders" })}
                body={
                    getOrdersErrorMessage(error) ??
                    t("error.body", { defaultValue: "Please try again." })
                }
                actionLabel={t("error.action", { defaultValue: "Retry" })}
                onAction={() => refetch()}
                destructive
            />
        );
    } else if (orders.length === 0) {
        content = (
            <EmptyState
                icon="receipt-outline"
                title={t("empty.title")}
                body={t("empty.subtitle")}
                actionLabel={t("empty.action", {
                    defaultValue: "Browse restaurants",
                })}
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
                ItemSeparatorComponent={itemSeparator}
                onEndReached={loadMore}
                onEndReachedThreshold={0.45}
                ListFooterComponent={listFooter}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefetching && !isFetchingNextPage}
                        onRefresh={() => refetch()}
                        tintColor={colors.primary}
                        colors={[colors.primary]}
                        progressBackgroundColor={colors.card}
                    />
                }
                showsVerticalScrollIndicator={false}
                removeClippedSubviews
                initialNumToRender={6}
                maxToRenderPerBatch={6}
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
        fontSize: 22,
        lineHeight: 28,
        textAlign: "center",
    },
    headerSubtitle: {
        marginTop: 2,
        fontFamily: typography.bodyMedium,
        color: colors.outline,
        fontSize: 12,
        lineHeight: 15,
        textAlign: "center",
    },
    content: {
        flex: 1,
    },
    listContent: {
        paddingTop: 6,
        paddingBottom: screen.bottomTabSpace + 16,
        flexGrow: 1,
    },
    separator: {
        height: 12,
    },
    footerLoader: {
        paddingVertical: 18,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
    },
    footerText: {
        fontFamily: typography.bodyMedium,
        color: colors.outline,
        fontSize: 12,
        lineHeight: 16,
    },
    endBadge: {
        paddingVertical: 16,
        alignItems: "center",
        justifyContent: "center",
    },
    endBadgeInner: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: radii.pill,
        backgroundColor: colors.faintPrimary,
    },
    endBadgeText: {
        fontFamily: typography.bodyBold,
        color: colors.primary,
        fontSize: 11,
        lineHeight: 14,
    },
    skeletonList: {
        paddingTop: 6,
        gap: 12,
    },
    skeletonItem: {
        opacity: 0.95,
    },
    stateWrap: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 30,
        paddingBottom: screen.bottomTabSpace,
        gap: 10,
    },
    stateIllustration: {
        width: 142,
        height: 142,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 6,
    },
    stateOrb: {
        position: "absolute",
        width: 142,
        height: 142,
        borderRadius: 71,
    },
    stateIconCircle: {
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
        fontFamily: typography.bodyMedium,
        color: colors.outline,
        fontSize: 14,
        lineHeight: 20,
        textAlign: "center",
    },
    stateButton: {
        marginTop: 18,
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
});

export default OrdersScreen;
