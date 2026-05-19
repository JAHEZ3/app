import React, { useCallback, useMemo, useRef } from "react";
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    ListRenderItem,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import Animated, { FadeIn } from "react-native-reanimated";
import AnimatedPressable from "@/components/ui/AnimatedPressable";
import { colors, radii, screen, shadows, typography } from "@/components/ui/theme";
import { useOrdersT } from "@/hooks/useAppTranslation";
import { useLanguageStore } from "@/store/useLanguageStore";
import { useSocketStatus } from "@/hooks/useSocket";
import MessageBubble from "../chat/MessageBubble";
import DateSeparator from "../chat/DateSeparator";
import TypingDots from "../chat/TypingDots";
import ChatInput from "../chat/ChatInput";
import { useOrderChat } from "../chat/useOrderChat";
import { useTypingIndicator } from "../chat/useTypingIndicator";
import { extractChatErrorMessage } from "@/services/chat.service";
import type { ChatMessage } from "../chat/types";

interface BubbleItem {
    kind: "bubble";
    message: ChatMessage;
    isMine: boolean;
    isFirstInGroup: boolean;
    isLastInGroup: boolean;
    timestampLabel: string;
}

interface DateItem {
    kind: "date";
    label: string;
    id: string;
}

type FeedItem = BubbleItem | DateItem;

const FIVE_MIN = 5 * 60 * 1000;

const formatTime = (iso: string, locale: string) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    try {
        return date.toLocaleTimeString(locale, {
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return date.toLocaleTimeString();
    }
};

const formatDateLabel = (
    iso: string,
    locale: string,
    today: string,
    yesterday: string,
): string => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    const now = new Date();
    const stripTime = (d: Date) =>
        new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const diffDays = Math.round(
        (stripTime(now) - stripTime(date)) / (24 * 60 * 60 * 1000),
    );
    if (diffDays <= 0) return today;
    if (diffDays === 1) return yesterday;
    try {
        return date.toLocaleDateString(locale, {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    } catch {
        return date.toLocaleDateString();
    }
};

/**
 * Build a flat feed in reverse-chronological order (newest first) suitable for
 * an inverted FlatList. Within each render pass we also compute message grouping
 * (first/last in same-sender run, ≤ 5 min apart) and insert date separators.
 */
const buildFeed = (
    messages: ChatMessage[],
    currentUserId: string | null,
    locale: string,
    todayLabel: string,
    yesterdayLabel: string,
): FeedItem[] => {
    const sorted = [...messages].sort(
        (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    const ascItems: FeedItem[] = [];
    let prevDateKey = "";
    for (let i = 0; i < sorted.length; i++) {
        const m = sorted[i];
        const prev = sorted[i - 1];
        const next = sorted[i + 1];
        const dateKey = new Date(m.createdAt).toDateString();
        if (dateKey !== prevDateKey) {
            ascItems.push({
                kind: "date",
                id: `date:${dateKey}`,
                label: formatDateLabel(
                    m.createdAt,
                    locale,
                    todayLabel,
                    yesterdayLabel,
                ),
            });
            prevDateKey = dateKey;
        }
        const isMine = currentUserId
            ? m.senderId === currentUserId
            : m.senderRole === "customer";
        const mTs = new Date(m.createdAt).getTime();
        const prevTs = prev ? new Date(prev.createdAt).getTime() : 0;
        const nextTs = next ? new Date(next.createdAt).getTime() : 0;
        const isFirstInGroup =
            !prev ||
            prev.senderId !== m.senderId ||
            mTs - prevTs > FIVE_MIN ||
            new Date(prev.createdAt).toDateString() !== dateKey;
        const isLastInGroup =
            !next ||
            next.senderId !== m.senderId ||
            nextTs - mTs > FIVE_MIN ||
            new Date(next.createdAt).toDateString() !== dateKey;
        ascItems.push({
            kind: "bubble",
            message: m,
            isMine,
            isFirstInGroup,
            isLastInGroup,
            timestampLabel: formatTime(m.createdAt, locale),
        });
    }

    // Reverse for inverted list (newest first).
    return ascItems.reverse();
};

function ChatHeader({
    onBack,
    title,
    subtitle,
    isLive,
    liveLabel,
    offlineLabel,
    accessibilityBack,
}: {
    onBack: () => void;
    title: string;
    subtitle: string | null;
    isLive: boolean;
    liveLabel: string;
    offlineLabel: string;
    accessibilityBack: string;
}) {
    const isRTL = useLanguageStore((s) => s.isRTL);
    const writingDirection = isRTL ? "rtl" : "ltr";
    const textAlign = isRTL ? "right" : "left";

    return (
        <View
            style={[
                styles.header,
                { flexDirection: isRTL ? "row-reverse" : "row" },
            ]}
        >
            <AnimatedPressable
                onPress={onBack}
                haptic="impact"
                scaleTo={0.92}
                style={styles.iconBtn}
                accessibilityRole="button"
                accessibilityLabel={accessibilityBack}
            >
                <Ionicons
                    name={isRTL ? "chevron-forward" : "chevron-back"}
                    size={22}
                    color={colors.onSurface}
                />
            </AnimatedPressable>

            <View style={styles.headerTitleBlock}>
                <Text
                    style={[
                        styles.headerTitle,
                        { textAlign, writingDirection },
                    ]}
                    numberOfLines={1}
                >
                    {title}
                </Text>
                <View
                    style={[
                        styles.headerSubtitleRow,
                        { flexDirection: isRTL ? "row-reverse" : "row" },
                    ]}
                >
                    <View
                        style={[
                            styles.liveDot,
                            { backgroundColor: isLive ? "#0F7A36" : colors.outline },
                        ]}
                    />
                    <Text
                        style={[
                            styles.headerSubtitle,
                            { color: isLive ? "#0F7A36" : colors.outline, writingDirection },
                        ]}
                        numberOfLines={1}
                    >
                        {isLive ? liveLabel : offlineLabel}
                        {subtitle ? ` · ${subtitle}` : ""}
                    </Text>
                </View>
            </View>

            <View style={styles.iconGhost} />
        </View>
    );
}

function OrderChatScreen() {
    const insets = useSafeAreaInsets();
    const { id } = useLocalSearchParams<{ id: string }>();
    const orderId = typeof id === "string" ? id : undefined;
    const { t } = useOrdersT();
    const isRTL = useLanguageStore((s) => s.isRTL);
    const language = useLanguageStore((s) => s.language);
    const writingDirection = isRTL ? "rtl" : "ltr";
    const locale = language === "ar" ? "ar" : "en-GB";

    const socketStatus = useSocketStatus();
    const isLive = socketStatus === "open";

    const {
        data: messages = [],
        isLoading,
        isError,
        error,
        refetch,
        send,
        retry,
        currentUserId,
        isSending,
    } = useOrderChat({ orderId });

    const { isPeerTyping, peerLabel, notifyTyping, notifyStoppedTyping } =
        useTypingIndicator({ orderId, currentUserId });

    const todayLabel = t("chat.dateToday", { defaultValue: "Today" });
    const yesterdayLabel = t("chat.dateYesterday", { defaultValue: "Yesterday" });

    const feed = useMemo(
        () => buildFeed(messages, currentUserId, locale, todayLabel, yesterdayLabel),
        [messages, currentUserId, locale, todayLabel, yesterdayLabel],
    );

    const listRef = useRef<FlatList<FeedItem>>(null);

    const handleBack = useCallback(() => {
        if (router.canGoBack()) router.back();
        else router.replace("/orders" as never);
    }, []);

    const handleSend = useCallback(
        (content: string) => {
            send(content);
            // On an inverted list, "scrollToOffset 0" pins the newest message.
            requestAnimationFrame(() => {
                listRef.current?.scrollToOffset({ offset: 0, animated: true });
            });
        },
        [send],
    );

    const keyExtractor = useCallback((item: FeedItem) => {
        if (item.kind === "date") return item.id;
        return item.message.clientId
            ? `c:${item.message.clientId}`
            : `m:${item.message.id}`;
    }, []);

    const renderItem = useCallback<ListRenderItem<FeedItem>>(
        ({ item }) => {
            if (item.kind === "date") {
                return <DateSeparator label={item.label} />;
            }
            return (
                <MessageBubble
                    message={item.message}
                    isMine={item.isMine}
                    isFirstInGroup={item.isFirstInGroup}
                    isLastInGroup={item.isLastInGroup}
                    timestampLabel={item.timestampLabel}
                    failedLabel={t("chat.failed", { defaultValue: "Failed" })}
                    retryLabel={t("chat.retry", { defaultValue: "Tap to retry" })}
                    pendingLabel={t("chat.sending", { defaultValue: "Sending…" })}
                    onRetry={retry}
                />
            );
        },
        [t, retry],
    );

    const renderEmptyState = () => {
        if (isLoading) {
            return (
                <View style={styles.centerWrap}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            );
        }
        if (isError) {
            return (
                <View style={styles.centerWrap}>
                    <View style={styles.errorIcon}>
                        <Ionicons
                            name="alert-circle-outline"
                            size={32}
                            color={colors.error}
                        />
                    </View>
                    <Text style={[styles.errorTitle, { writingDirection }]}>
                        {t("chat.errorTitle", {
                            defaultValue: "Could not load chat",
                        })}
                    </Text>
                    <Text style={[styles.errorBody, { writingDirection }]}>
                        {extractChatErrorMessage(error) ??
                            t("chat.errorBody", {
                                defaultValue: "Please try again.",
                            })}
                    </Text>
                    <AnimatedPressable
                        onPress={() => refetch()}
                        haptic="impact"
                        scaleTo={0.96}
                        style={styles.retryBtn}
                        accessibilityRole="button"
                    >
                        <Text style={styles.retryBtnText}>
                            {t("chat.retryLoad", {
                                defaultValue: "Try again",
                            })}
                        </Text>
                    </AnimatedPressable>
                </View>
            );
        }
        return (
            <Animated.View entering={FadeIn.duration(280)} style={styles.centerWrap}>
                <LinearGradient
                    colors={["#FFE9D8", "#FFD2B5"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.emptyOrb}
                />
                <View style={styles.emptyIcon}>
                    <Ionicons
                        name="chatbubbles-outline"
                        size={32}
                        color={colors.primary}
                    />
                </View>
                <Text style={[styles.emptyTitle, { writingDirection }]}>
                    {t("chat.emptyTitle", {
                        defaultValue: "Start the conversation",
                    })}
                </Text>
                <Text style={[styles.emptyBody, { writingDirection }]}>
                    {t("chat.emptyBody", {
                        defaultValue:
                            "Messages between you and the restaurant or driver will appear here.",
                    })}
                </Text>
            </Animated.View>
        );
    };

    return (
        <SafeAreaView style={styles.safe} edges={["top"]}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
            <ChatHeader
                onBack={handleBack}
                title={t("chat.title", { defaultValue: "Order chat" })}
                subtitle={orderId ? `#${orderId.slice(0, 8).toUpperCase()}` : null}
                isLive={isLive}
                liveLabel={t("realtime.live", { defaultValue: "Live" })}
                offlineLabel={t("realtime.offline", { defaultValue: "Offline" })}
                accessibilityBack={t("accessibility.goBack", {
                    defaultValue: "Go back",
                })}
            />

            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
            >
                {feed.length === 0 ? (
                    renderEmptyState()
                ) : (
                    <FlatList
                        ref={listRef}
                        data={feed}
                        renderItem={renderItem}
                        keyExtractor={keyExtractor}
                        inverted
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={[
                            styles.listContent,
                            // Inverted lists invert padding — bottom here is the visual TOP of the chat.
                            {
                                paddingTop: 12,
                                paddingBottom: 16,
                            },
                        ]}
                        showsVerticalScrollIndicator={false}
                        removeClippedSubviews
                        initialNumToRender={20}
                        maxToRenderPerBatch={20}
                        windowSize={11}
                        ListHeaderComponent={
                            isPeerTyping ? (
                                <TypingDots label={peerLabel} />
                            ) : null
                        }
                    />
                )}

                <View
                    style={{ paddingBottom: Math.max(insets.bottom, 0) }}
                >
                    <ChatInput
                        placeholder={t("chat.placeholder", {
                            defaultValue: "Type a message…",
                        })}
                        sendLabel={t("chat.send", { defaultValue: "Send" })}
                        onSend={handleSend}
                        onTyping={notifyTyping}
                        onStoppedTyping={notifyStoppedTyping}
                        disabled={isLoading || isError}
                        isSending={isSending}
                    />
                </View>
            </KeyboardAvoidingView>
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
    header: {
        paddingHorizontal: screen.horizontal,
        paddingTop: 6,
        paddingBottom: 10,
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        backgroundColor: colors.surface,
    },
    iconBtn: {
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
    headerTitleBlock: {
        flex: 1,
        minWidth: 0,
        alignItems: "center",
        gap: 2,
    },
    headerTitle: {
        fontFamily: typography.headline,
        color: colors.onSurface,
        fontSize: 17,
        lineHeight: 22,
    },
    headerSubtitleRow: {
        alignItems: "center",
        gap: 5,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    headerSubtitle: {
        fontFamily: typography.bodyBold,
        fontSize: 11,
        lineHeight: 14,
        letterSpacing: 0.2,
    },
    listContent: {
        flexGrow: 1,
    },
    centerWrap: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        padding: 30,
    },
    emptyOrb: {
        position: "absolute",
        width: 142,
        height: 142,
        borderRadius: 71,
    },
    emptyIcon: {
        width: 82,
        height: 82,
        borderRadius: 41,
        backgroundColor: colors.card,
        alignItems: "center",
        justifyContent: "center",
        ...shadows.card,
    },
    emptyTitle: {
        marginTop: 8,
        fontFamily: typography.headline,
        color: colors.onSurface,
        fontSize: 18,
        lineHeight: 23,
        textAlign: "center",
    },
    emptyBody: {
        fontFamily: typography.bodyMedium,
        color: colors.outline,
        fontSize: 13,
        lineHeight: 18,
        textAlign: "center",
        maxWidth: 280,
    },
    errorIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: "#FCE2DD",
        alignItems: "center",
        justifyContent: "center",
    },
    errorTitle: {
        fontFamily: typography.headlineSemi,
        color: colors.onSurface,
        fontSize: 16,
        lineHeight: 21,
        textAlign: "center",
    },
    errorBody: {
        fontFamily: typography.bodyMedium,
        color: colors.outline,
        fontSize: 13,
        lineHeight: 18,
        textAlign: "center",
    },
    retryBtn: {
        marginTop: 8,
        minHeight: 46,
        paddingHorizontal: 22,
        borderRadius: radii.pill,
        backgroundColor: colors.primary,
        alignItems: "center",
        justifyContent: "center",
        ...shadows.primary,
    },
    retryBtnText: {
        fontFamily: typography.headlineSemi,
        color: colors.onPrimary,
        fontSize: 14,
        lineHeight: 18,
    },
});

export default OrderChatScreen;
