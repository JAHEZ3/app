import React, { memo, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import AnimatedPressable from "@/components/ui/AnimatedPressable";
import { colors, radii, shadows, typography } from "@/components/ui/theme";
import { useLanguageStore } from "@/store/useLanguageStore";
import type { ChatMessage } from "./types";

interface Props {
    message: ChatMessage;
    isMine: boolean;
    /** When true, the bubble is the first in a same-sender run — show the tail. */
    isFirstInGroup: boolean;
    /** When true, the bubble is the last in a same-sender run — show timestamp. */
    isLastInGroup: boolean;
    timestampLabel: string;
    failedLabel: string;
    retryLabel: string;
    pendingLabel: string;
    onRetry?: (clientId: string) => void;
}

const ROLE_ICON: Record<string, keyof typeof import("@expo/vector-icons").Ionicons.glyphMap> = {
    restaurant: "storefront",
    restaurant_owner: "storefront",
    delivery: "bicycle",
    manager: "shield-checkmark",
    customer: "person",
};

function MessageBubble({
    message,
    isMine,
    isFirstInGroup,
    isLastInGroup,
    timestampLabel,
    failedLabel,
    retryLabel,
    pendingLabel,
    onRetry,
}: Props) {
    const isRTL = useLanguageStore((s) => s.isRTL);
    const writingDirection = isRTL ? "rtl" : "ltr";

    // RTL: incoming bubbles go to the right, mine go to the left (the user's
    // own messages stay on the "near" side of the screen).
    const incomingSide = isRTL ? "flex-end" : "flex-start";
    const outgoingSide = isRTL ? "flex-start" : "flex-end";

    const wrapAlign = isMine ? outgoingSide : incomingSide;
    const showSenderName = !isMine && isFirstInGroup && !!message.senderName;
    const senderIcon: keyof typeof import("@expo/vector-icons").Ionicons.glyphMap =
        ROLE_ICON[message.senderRole as string] ?? "person";

    const bubbleStyle = useMemo(
        () => [
            styles.bubbleBase,
            isMine ? styles.bubbleMine : styles.bubbleTheirs,
            isFirstInGroup
                ? isMine
                    ? styles.bubbleMineFirst
                    : styles.bubbleTheirsFirst
                : null,
            isLastInGroup
                ? isMine
                    ? styles.bubbleMineLast
                    : styles.bubbleTheirsLast
                : null,
            message.failed && styles.bubbleFailed,
        ],
        [isMine, isFirstInGroup, isLastInGroup, message.failed],
    );

    return (
        <Animated.View
            entering={FadeIn.duration(180)}
            style={[styles.row, { alignItems: wrapAlign }]}
        >
            {showSenderName ? (
                <View
                    style={[
                        styles.senderRow,
                        { flexDirection: isRTL ? "row-reverse" : "row" },
                    ]}
                >
                    <View
                        style={[
                            styles.senderIconWrap,
                            isMine && styles.senderIconWrapMine,
                        ]}
                    >
                        <Ionicons
                            name={senderIcon}
                            size={10}
                            color={isMine ? colors.onPrimary : colors.primary}
                        />
                    </View>
                    <Text style={[styles.senderName, { writingDirection }]}>
                        {message.senderName}
                    </Text>
                </View>
            ) : null}

            <View style={bubbleStyle}>
                <Text
                    style={[
                        styles.content,
                        isMine ? styles.contentMine : styles.contentTheirs,
                        { writingDirection },
                    ]}
                    selectable
                >
                    {message.content}
                </Text>

                {isLastInGroup ? (
                    <View
                        style={[
                            styles.metaRow,
                            { flexDirection: isRTL ? "row-reverse" : "row" },
                        ]}
                    >
                        <Text
                            style={[
                                styles.timestamp,
                                isMine ? styles.timestampMine : styles.timestampTheirs,
                                { writingDirection },
                            ]}
                        >
                            {timestampLabel}
                        </Text>
                        {isMine && message.pending ? (
                            <View style={styles.tickWrap}>
                                <Ionicons
                                    name="time-outline"
                                    size={11}
                                    color="rgba(255,255,255,0.85)"
                                />
                            </View>
                        ) : null}
                        {isMine && !message.pending && !message.failed ? (
                            <View style={styles.tickWrap}>
                                <Ionicons
                                    name="checkmark-done"
                                    size={12}
                                    color="rgba(255,255,255,0.95)"
                                />
                            </View>
                        ) : null}
                    </View>
                ) : null}
            </View>

            {isMine && message.failed ? (
                <AnimatedPressable
                    onPress={() =>
                        message.clientId && onRetry?.(message.clientId)
                    }
                    haptic="impact"
                    scaleTo={0.96}
                    style={[
                        styles.failedRow,
                        { flexDirection: isRTL ? "row-reverse" : "row" },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={retryLabel}
                >
                    <Ionicons
                        name="alert-circle"
                        size={12}
                        color={colors.error}
                    />
                    <Text style={[styles.failedText, { writingDirection }]}>
                        {failedLabel} · {retryLabel}
                    </Text>
                </AnimatedPressable>
            ) : null}
            {isMine && message.pending && !message.failed ? (
                <Text style={[styles.pendingHint, { writingDirection }]}>
                    {pendingLabel}
                </Text>
            ) : null}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    row: {
        marginBottom: 4,
        paddingHorizontal: 14,
        maxWidth: "100%",
    },
    senderRow: {
        marginBottom: 4,
        marginHorizontal: 4,
        alignItems: "center",
        gap: 6,
    },
    senderIconWrap: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: colors.faintPrimary,
        alignItems: "center",
        justifyContent: "center",
    },
    senderIconWrapMine: {
        backgroundColor: colors.primary,
    },
    senderName: {
        fontFamily: typography.bodyBold,
        color: colors.outline,
        fontSize: 11,
        lineHeight: 14,
    },
    bubbleBase: {
        maxWidth: "82%",
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: radii.lg,
    },
    bubbleMine: {
        backgroundColor: colors.primary,
        borderTopRightRadius: 6,
        borderBottomRightRadius: radii.lg,
        ...shadows.primary,
    },
    bubbleTheirs: {
        backgroundColor: colors.card,
        borderTopLeftRadius: 6,
        ...shadows.soft,
    },
    bubbleMineFirst: {
        borderTopRightRadius: radii.lg,
    },
    bubbleMineLast: {
        borderBottomRightRadius: 4,
    },
    bubbleTheirsFirst: {
        borderTopLeftRadius: radii.lg,
    },
    bubbleTheirsLast: {
        borderBottomLeftRadius: 4,
    },
    bubbleFailed: {
        opacity: 0.75,
    },
    content: {
        fontFamily: typography.body,
        fontSize: 15,
        lineHeight: 21,
    },
    contentMine: {
        color: colors.onPrimary,
    },
    contentTheirs: {
        color: colors.onSurface,
    },
    metaRow: {
        marginTop: 4,
        alignItems: "center",
        gap: 4,
        alignSelf: "flex-end",
    },
    timestamp: {
        fontFamily: typography.bodyMedium,
        fontSize: 10,
        lineHeight: 13,
    },
    timestampMine: {
        color: "rgba(255,255,255,0.78)",
    },
    timestampTheirs: {
        color: colors.outline,
    },
    tickWrap: {
        marginLeft: 2,
        alignItems: "center",
        justifyContent: "center",
    },
    failedRow: {
        marginTop: 4,
        marginHorizontal: 4,
        alignItems: "center",
        gap: 4,
    },
    failedText: {
        fontFamily: typography.bodyBold,
        color: colors.error,
        fontSize: 11,
        lineHeight: 14,
    },
    pendingHint: {
        marginTop: 4,
        marginHorizontal: 4,
        fontFamily: typography.bodyMedium,
        color: colors.outline,
        fontSize: 10,
        lineHeight: 13,
    },
});

export default memo(MessageBubble);
