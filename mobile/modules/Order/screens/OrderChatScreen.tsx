import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import AnimatedPressable from "@/components/ui/AnimatedPressable";
import { colors, radii, screen, shadows, typography } from "@/components/ui/theme";
import { useOrdersT } from "@/hooks/useAppTranslation";
import { useLanguageStore } from "@/store/useLanguageStore";
import { useJoinOrderRoom, useSocketStatus } from "@/hooks/useSocket";
import {
    getChatErrorMessage,
    useOrderChatMessages,
    useSendChatMessage,
} from "../hooks/useOrderChat";
import type { ChatMessageDto } from "../repository/OrderRepository";

const formatTime = (iso: string, locale: string) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    try {
        return date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
    } catch {
        return "";
    }
};

const isCustomerMessage = (msg: ChatMessageDto): boolean => {
    const role = (msg.senderRole ?? "").toLowerCase();
    return role === "customer";
};

function OrderChatScreen() {
    const insets = useSafeAreaInsets();
    const { id } = useLocalSearchParams<{ id: string }>();
    const orderId = typeof id === "string" ? id : undefined;
    const { t } = useOrdersT();
    const isRTL = useLanguageStore((s) => s.isRTL);
    const language = useLanguageStore((s) => s.language);
    const writingDirection = isRTL ? "rtl" : "ltr";
    const textAlign = isRTL ? "right" : "left";

    useJoinOrderRoom(orderId);

    const { data: messages, isLoading, isError, refetch } = useOrderChatMessages(orderId);
    const send = useSendChatMessage();
    const socketStatus = useSocketStatus();
    const isLive = socketStatus === "open";

    const [draft, setDraft] = useState("");
    const listRef = useRef<FlatList<ChatMessageDto>>(null);

    const sortedMessages = useMemo(
        () =>
            (messages ?? [])
                .slice()
                .sort(
                    (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime(),
                ),
        [messages],
    );

    useEffect(() => {
        if (sortedMessages.length === 0) return;
        const timeout = setTimeout(() => {
            listRef.current?.scrollToEnd({ animated: true });
        }, 80);
        return () => clearTimeout(timeout);
    }, [sortedMessages.length]);

    const handleSend = useCallback(async () => {
        const text = draft.trim();
        if (!text || !orderId || send.isPending) return;
        setDraft("");
        try {
            await send.mutateAsync({ orderId, content: text });
        } catch (err) {
            const message =
                getChatErrorMessage(err) ??
                t("chat.errorBody", { defaultValue: "Could not send. Try again." });
            // restore the draft so the user can retry without retyping
            setDraft(text);
            // soft alert — the input border could go red later; for now log
            console.log("[chat] send failed", message);
        }
    }, [draft, orderId, send, t]);

    const handleBack = useCallback(() => {
        if (router.canGoBack()) router.back();
        else router.replace("/orders" as never);
    }, []);

    const renderItem = useCallback(
        ({ item }: { item: ChatMessageDto }) => {
            const mine = isCustomerMessage(item);
            return (
                <View
                    style={[
                        styles.bubbleRow,
                        mine ? styles.bubbleRowMine : styles.bubbleRowOther,
                    ]}
                >
                    <View
                        style={[
                            styles.bubble,
                            mine ? styles.bubbleMine : styles.bubbleOther,
                        ]}
                    >
                        {!mine && item.senderName ? (
                            <Text
                                style={[
                                    styles.senderName,
                                    { textAlign, writingDirection },
                                ]}
                            >
                                {item.senderName}
                            </Text>
                        ) : null}
                        <Text
                            style={[
                                styles.bubbleText,
                                mine ? styles.bubbleTextMine : styles.bubbleTextOther,
                                { textAlign, writingDirection },
                            ]}
                        >
                            {item.body}
                        </Text>
                        <Text
                            style={[
                                styles.bubbleTime,
                                mine ? styles.bubbleTimeMine : styles.bubbleTimeOther,
                            ]}
                        >
                            {formatTime(item.sentAt, language === "ar" ? "ar" : "en-GB")}
                        </Text>
                    </View>
                </View>
            );
        },
        [language, textAlign, writingDirection],
    );

    let body: React.ReactNode;
    if (!orderId) {
        body = (
            <View style={styles.center}>
                <Text style={[styles.muted, { writingDirection }]}>
                    {t("error.missingId", { defaultValue: "Order not found." })}
                </Text>
            </View>
        );
    } else if (isLoading) {
        body = (
            <View style={styles.center}>
                <ActivityIndicator color={colors.primary} />
            </View>
        );
    } else if (isError) {
        body = (
            <View style={styles.center}>
                <Text style={[styles.muted, { writingDirection }]}>
                    {t("chat.loadError", {
                        defaultValue: "Could not load the conversation.",
                    })}
                </Text>
                <AnimatedPressable
                    onPress={() => refetch()}
                    haptic="impact"
                    scaleTo={0.96}
                    style={styles.retryBtn}
                    accessibilityRole="button"
                >
                    <Text style={[styles.retryBtnText, { writingDirection }]}>
                        {t("error.action", { defaultValue: "Retry" })}
                    </Text>
                </AnimatedPressable>
            </View>
        );
    } else if (sortedMessages.length === 0) {
        body = (
            <View style={styles.center}>
                <View style={styles.emptyIcon}>
                    <Ionicons
                        name="chatbubble-ellipses-outline"
                        size={28}
                        color={colors.primary}
                    />
                </View>
                <Text style={[styles.emptyTitle, { writingDirection }]}>
                    {t("chat.emptyTitle", { defaultValue: "Start the conversation" })}
                </Text>
                <Text style={[styles.emptyBody, { writingDirection }]}>
                    {t("chat.emptyBody", {
                        defaultValue: "Ask the restaurant or driver anything about this order.",
                    })}
                </Text>
            </View>
        );
    } else {
        body = (
            <FlatList
                ref={listRef}
                data={sortedMessages}
                keyExtractor={(m, index) => m.messageId ?? `msg-${index}-${m.sentAt}`}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() =>
                    listRef.current?.scrollToEnd({ animated: false })
                }
            />
        );
    }

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
                <View style={styles.headerTitleBlock}>
                    <Text style={[styles.headerTitle, { writingDirection }]}>
                        {t("chat.title", { defaultValue: "Order chat" })}
                    </Text>
                    <View style={[styles.livePill, isLive ? styles.livePillOn : styles.livePillOff]}>
                        <View
                            style={[
                                styles.liveDot,
                                isLive ? styles.liveDotOn : styles.liveDotOff,
                            ]}
                        />
                        <Text
                            style={[
                                styles.liveText,
                                isLive ? styles.liveTextOn : styles.liveTextOff,
                            ]}
                        >
                            {isLive
                                ? t("realtime.live", { defaultValue: "Live" })
                                : t("realtime.offline", { defaultValue: "Offline" })}
                        </Text>
                    </View>
                </View>
                <View style={styles.iconButtonGhost} />
            </View>

            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 6 : 0}
            >
                <View style={styles.body}>{body}</View>

                <View
                    style={[
                        styles.composer,
                        { paddingBottom: Math.max(insets.bottom, 10) },
                        isRTL && styles.rowReverse,
                    ]}
                >
                    <TextInput
                        value={draft}
                        onChangeText={setDraft}
                        placeholder={t("chat.placeholder", {
                            defaultValue: "Type a message…",
                        })}
                        placeholderTextColor={colors.outline}
                        multiline
                        style={[
                            styles.input,
                            { textAlign, writingDirection },
                        ]}
                        editable={!send.isPending}
                    />
                    <AnimatedPressable
                        onPress={handleSend}
                        disabled={!draft.trim() || send.isPending}
                        scaleTo={0.92}
                        haptic="impact"
                        style={[
                            styles.sendBtn,
                            (!draft.trim() || send.isPending) && styles.sendBtnDisabled,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={t("chat.send", { defaultValue: "Send" })}
                    >
                        {send.isPending ? (
                            <ActivityIndicator size="small" color={colors.onPrimary} />
                        ) : (
                            <Ionicons
                                name={isRTL ? "arrow-back" : "arrow-forward"}
                                size={20}
                                color={colors.onPrimary}
                            />
                        )}
                    </AnimatedPressable>
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
    flex: { flex: 1 },
    rowReverse: { flexDirection: "row-reverse" },
    header: {
        paddingHorizontal: screen.horizontal,
        paddingTop: 6,
        paddingBottom: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottomWidth: 1,
        borderBottomColor: colors.surfaceContainer,
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
    iconButtonGhost: { width: 42, height: 42 },
    headerTitleBlock: {
        flex: 1,
        alignItems: "center",
        gap: 4,
    },
    headerTitle: {
        fontFamily: typography.headline,
        color: colors.onSurface,
        fontSize: 18,
        lineHeight: 22,
    },
    livePill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: radii.pill,
    },
    livePillOn: { backgroundColor: "#D9F5E2" },
    livePillOff: { backgroundColor: colors.surfaceContainer },
    liveDot: { width: 6, height: 6, borderRadius: 3 },
    liveDotOn: { backgroundColor: "#0F7A36" },
    liveDotOff: { backgroundColor: colors.outline },
    liveText: { fontFamily: typography.bodyBold, fontSize: 10, lineHeight: 13 },
    liveTextOn: { color: "#0F7A36" },
    liveTextOff: { color: colors.outline },
    body: { flex: 1 },
    center: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 30,
        gap: 12,
    },
    muted: {
        fontFamily: typography.bodyMedium,
        color: colors.outline,
        fontSize: 14,
        lineHeight: 20,
        textAlign: "center",
    },
    retryBtn: {
        marginTop: 10,
        paddingHorizontal: 22,
        paddingVertical: 12,
        borderRadius: radii.pill,
        backgroundColor: colors.primary,
    },
    retryBtnText: {
        fontFamily: typography.bodyBold,
        color: colors.onPrimary,
        fontSize: 13,
    },
    emptyIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: colors.faintPrimary,
        alignItems: "center",
        justifyContent: "center",
    },
    emptyTitle: {
        fontFamily: typography.headline,
        color: colors.onSurface,
        fontSize: 18,
        lineHeight: 22,
        textAlign: "center",
    },
    emptyBody: {
        fontFamily: typography.bodyMedium,
        color: colors.outline,
        fontSize: 13,
        lineHeight: 18,
        textAlign: "center",
    },
    listContent: {
        paddingHorizontal: screen.horizontal,
        paddingVertical: 14,
        gap: 6,
    },
    bubbleRow: {
        flexDirection: "row",
        marginVertical: 3,
    },
    bubbleRowMine: { justifyContent: "flex-end" },
    bubbleRowOther: { justifyContent: "flex-start" },
    bubble: {
        maxWidth: "78%",
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: radii.lg,
        gap: 4,
    },
    bubbleMine: {
        backgroundColor: colors.primary,
        borderTopRightRadius: 6,
    },
    bubbleOther: {
        backgroundColor: colors.card,
        borderTopLeftRadius: 6,
        ...shadows.soft,
    },
    senderName: {
        fontFamily: typography.bodyBold,
        color: colors.primary,
        fontSize: 11,
        lineHeight: 14,
    },
    bubbleText: {
        fontFamily: typography.bodyMedium,
        fontSize: 14,
        lineHeight: 19,
    },
    bubbleTextMine: { color: colors.onPrimary },
    bubbleTextOther: { color: colors.onSurface },
    bubbleTime: {
        fontFamily: typography.body,
        fontSize: 10,
        lineHeight: 13,
        marginTop: 2,
    },
    bubbleTimeMine: { color: "rgba(255,255,255,0.78)", textAlign: "right" },
    bubbleTimeOther: { color: colors.outline, textAlign: "left" },
    composer: {
        paddingHorizontal: screen.horizontal,
        paddingTop: 10,
        flexDirection: "row",
        alignItems: "flex-end",
        gap: 10,
        borderTopWidth: 1,
        borderTopColor: colors.surfaceContainer,
        backgroundColor: colors.surface,
    },
    input: {
        flex: 1,
        minHeight: 44,
        maxHeight: 110,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: radii.lg,
        backgroundColor: colors.card,
        fontFamily: typography.bodyMedium,
        color: colors.onSurface,
        fontSize: 14,
        lineHeight: 19,
        ...shadows.soft,
    },
    sendBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.primary,
        alignItems: "center",
        justifyContent: "center",
        ...shadows.primary,
    },
    sendBtnDisabled: {
        opacity: 0.5,
    },
});

export default OrderChatScreen;
