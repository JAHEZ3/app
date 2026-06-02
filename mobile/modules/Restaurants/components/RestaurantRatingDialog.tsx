import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    interpolate,
    Easing,
} from 'react-native-reanimated';
import AnimatedPressable from '@/components/ui/AnimatedPressable';
import { colors, radii, shadows, typography } from '@/components/ui/theme';

// Per-rating colour palette: 1=red  2=orange  3=amber  4=lime  5=green
const STAR_COLORS = ['', '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#22C55E'];
const STAR_BG     = ['', '#FEF2F2', '#FFF7ED', '#FFFBEB', '#F7FEE7', '#F0FDF4'];
const LABELS      = ['', 'Poor',    'Fair',    'Good',   'Very Good', 'Excellent'];
const LABELS_AR   = ['', 'سيء',    'مقبول',    'جيد',   'جيد جداً', 'ممتاز'];

interface Props {
    visible: boolean;
    restaurantName: string;
    isRTL?: boolean;
    onClose: () => void;
    onSubmit: (rating: number, comment?: string) => void;
    isLoading?: boolean;
}

// ─── Animated star button ────────────────────────────────────────────────────

function StarButton({
    index,
    filled,
    color,
    onPress,
}: {
    index: number;
    filled: boolean;
    color: string;
    onPress: () => void;
}) {
    const scale = useSharedValue(1);

    useEffect(() => {
        if (filled) {
            scale.value = withSpring(1.28, { damping: 5, stiffness: 320 }, () => {
                scale.value = withSpring(1, { damping: 8, stiffness: 240 });
            });
        }
    }, [filled, scale]);

    const style = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <AnimatedPressable onPress={onPress} scaleTo={0.82} haptic="selection" style={styles.starBtn}>
            <Animated.View style={style}>
                <Ionicons
                    name={filled ? 'star' : 'star-outline'}
                    size={46}
                    color={filled ? color : '#D1D5DB'}
                />
            </Animated.View>
        </AnimatedPressable>
    );
}

// ─── Dialog ──────────────────────────────────────────────────────────────────

export default function RestaurantRatingDialog({
    visible,
    restaurantName,
    isRTL = false,
    onClose,
    onSubmit,
    isLoading = false,
}: Props) {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const dir = isRTL ? 'rtl' : 'ltr';
    const labels = isRTL ? LABELS_AR : LABELS;

    // Slide-up animation for the sheet
    const sheetY = useSharedValue(320);
    const backdropOpacity = useSharedValue(0);

    useEffect(() => {
        if (visible) {
            backdropOpacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) });
            sheetY.value = withSpring(0, { damping: 20, stiffness: 220, mass: 0.9 });
        } else {
            backdropOpacity.value = withTiming(0, { duration: 180 });
            sheetY.value = withTiming(320, { duration: 200, easing: Easing.in(Easing.quad) });
        }
    }, [visible, sheetY, backdropOpacity]);

    const sheetStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: sheetY.value }],
    }));
    const backdropStyle = useAnimatedStyle(() => ({
        opacity: backdropOpacity.value,
    }));

    // Label + tint animate when rating changes
    const labelOpacity = useSharedValue(0);
    useEffect(() => {
        labelOpacity.value = 0;
        labelOpacity.value = withTiming(1, { duration: 200 });
    }, [rating, labelOpacity]);
    const labelStyle = useAnimatedStyle(() => ({ opacity: labelOpacity.value }));

    const reset = () => { setRating(0); setComment(''); };
    const handleClose = () => { reset(); onClose(); };
    const handleSubmit = () => {
        if (rating < 1 || isLoading) return;
        onSubmit(rating, comment.trim() || undefined);
    };

    const canSubmit = rating > 0 && !isLoading;
    const activeColor = rating > 0 ? STAR_COLORS[rating] : colors.primary;
    const activeBg    = rating > 0 ? STAR_BG[rating]    : colors.faintPrimary;

    return (
        <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={handleClose}>
            {/* Backdrop */}
            <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
            </Animated.View>

            {/* Sheet */}
            <View style={styles.sheetAnchor} pointerEvents="box-none">
                <Animated.View style={[styles.sheet, sheetStyle]}>
                    <View style={styles.handle} />

                    {/* Icon + title */}
                    <View style={styles.header}>
                        <Animated.View style={[styles.iconWrap, { backgroundColor: activeBg }]}>
                            <Ionicons name="restaurant" size={26} color={activeColor} />
                        </Animated.View>
                        <Text style={[styles.title, { writingDirection: dir }]} numberOfLines={2}>
                            {isRTL ? `تقييم ${restaurantName}` : `Rate ${restaurantName}`}
                        </Text>
                        <Text style={[styles.subtitle, { writingDirection: dir }]}>
                            {isRTL ? 'كيف كانت تجربتك؟' : 'How was your experience?'}
                        </Text>
                    </View>

                    {/* Stars */}
                    <View style={styles.starsRow}>
                        {[1, 2, 3, 4, 5].map((star) => (
                            <StarButton
                                key={star}
                                index={star}
                                filled={star <= rating}
                                color={STAR_COLORS[rating] || STAR_COLORS[star]}
                                onPress={() => setRating(star)}
                            />
                        ))}
                    </View>

                    {/* Rating label */}
                    <Animated.View style={[styles.labelWrap, { backgroundColor: activeBg }, labelStyle]}>
                        <Text style={[styles.ratingLabel, { color: activeColor, writingDirection: dir }]}>
                            {rating > 0 ? labels[rating] : (isRTL ? 'اضغط على نجمة للتقييم' : 'Tap a star to rate')}
                        </Text>
                    </Animated.View>

                    {/* Comment input */}
                    <View style={styles.inputWrap}>
                        <TextInput
                            style={[styles.commentInput, { textAlign: isRTL ? 'right' : 'left' }]}
                            placeholder={isRTL ? 'اترك تعليقاً (اختياري)...' : 'Leave a comment (optional)...'}
                            placeholderTextColor={colors.outline}
                            value={comment}
                            onChangeText={setComment}
                            maxLength={500}
                            multiline
                            textAlignVertical="top"
                        />
                        <Text style={[styles.charCount, { textAlign: isRTL ? 'left' : 'right' }]}>
                            {comment.length}/500
                        </Text>
                    </View>

                    {/* Actions */}
                    <View style={[styles.actions, isRTL && styles.actionsRTL]}>
                        <AnimatedPressable
                            onPress={handleClose}
                            style={styles.cancelBtn}
                            scaleTo={0.96}
                            haptic="impact"
                        >
                            <Text style={styles.cancelText}>
                                {isRTL ? 'إلغاء' : 'Cancel'}
                            </Text>
                        </AnimatedPressable>

                        {canSubmit ? (
                            <AnimatedPressable
                                onPress={handleSubmit}
                                style={styles.submitBtnWrap}
                                scaleTo={0.96}
                                haptic="impact"
                            >
                                <LinearGradient
                                    colors={[activeColor, shadeColor(activeColor, -20)]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.submitGradient}
                                >
                                    {isLoading ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <>
                                            <Ionicons name="checkmark" size={16} color="#fff" />
                                            <Text style={styles.submitText}>
                                                {isRTL ? 'إرسال' : 'Submit'}
                                            </Text>
                                        </>
                                    )}
                                </LinearGradient>
                            </AnimatedPressable>
                        ) : (
                            <View style={[styles.submitBtnWrap, styles.submitBtnDisabled]}>
                                <Text style={styles.submitTextDisabled}>
                                    {isRTL ? 'إرسال' : 'Submit'}
                                </Text>
                            </View>
                        )}
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

/** Darken a hex color by `amount` (0–255). */
function shadeColor(hex: string, amount: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amount));
    const b = Math.max(0, Math.min(255, (num & 0xff) + amount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

const styles = StyleSheet.create({
    backdrop: {
        backgroundColor: 'rgba(0,0,0,0.52)',
    },
    sheetAnchor: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingHorizontal: 24,
        paddingBottom: 36,
        paddingTop: 12,
        ...shadows.card,
    },
    handle: {
        width: 44,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.surfaceContainer,
        alignSelf: 'center',
        marginBottom: 22,
    },

    // Header
    header: {
        alignItems: 'center',
        gap: 6,
        marginBottom: 26,
    },
    iconWrap: {
        width: 60,
        height: 60,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 6,
    },
    title: {
        fontFamily: typography.headline,
        color: colors.onSurface,
        fontSize: 20,
        textAlign: 'center',
        lineHeight: 26,
    },
    subtitle: {
        fontFamily: typography.bodyMedium,
        color: colors.outline,
        fontSize: 13,
        textAlign: 'center',
    },

    // Stars
    starsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6,
        marginBottom: 14,
    },
    starBtn: {
        padding: 4,
    },

    // Label pill
    labelWrap: {
        alignSelf: 'center',
        paddingHorizontal: 18,
        paddingVertical: 6,
        borderRadius: radii.pill,
        marginBottom: 22,
        minWidth: 110,
        alignItems: 'center',
    },
    ratingLabel: {
        fontFamily: typography.bodyBold,
        fontSize: 14,
        textAlign: 'center',
    },

    // Comment input
    inputWrap: {
        marginBottom: 22,
    },
    commentInput: {
        borderWidth: 1.5,
        borderColor: colors.surfaceContainer,
        borderRadius: radii.lg,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontFamily: typography.body,
        fontSize: 14,
        color: colors.onSurface,
        backgroundColor: colors.surfaceContainerHighest,
        minHeight: 88,
    },
    charCount: {
        fontFamily: typography.body,
        color: colors.outline,
        fontSize: 11,
        marginTop: 4,
    },

    // Actions
    actions: {
        flexDirection: 'row',
        gap: 12,
    },
    actionsRTL: {
        flexDirection: 'row-reverse',
    },
    cancelBtn: {
        flex: 1,
        height: 52,
        borderRadius: radii.pill,
        borderWidth: 1.5,
        borderColor: colors.surfaceContainer,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.card,
    },
    cancelText: {
        fontFamily: typography.bodyBold,
        color: colors.onSurface,
        fontSize: 14,
    },
    submitBtnWrap: {
        flex: 2,
        height: 52,
        borderRadius: radii.pill,
        overflow: 'hidden',
    },
    submitGradient: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        borderRadius: radii.pill,
    },
    submitText: {
        fontFamily: typography.bodyBold,
        color: '#fff',
        fontSize: 14,
    },
    submitBtnDisabled: {
        backgroundColor: colors.surfaceContainer,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitTextDisabled: {
        fontFamily: typography.bodyBold,
        color: colors.outline,
        fontSize: 14,
    },
});
