import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Linking,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useOrdersT } from '@/hooks/useAppTranslation';
import { useLanguageStore } from '@/store/useLanguageStore';
import { colors, radii, shadows, typography } from '@/components/ui/theme';
import AnimatedPressable from '@/components/ui/AnimatedPressable';
import {
    getPaymentProofErrorMessage,
    usePaymentProofUrl,
    useUploadPaymentProof,
} from '../hooks/usePaymentProof';
import type { PaymentProofAsset } from '../repository/OrderRepository';

interface Props {
    orderId: string;
    onUploaded?: () => void;
}

const MAX_SIZE_BYTES = 5 * 1024 * 1024;

const buildAsset = (uri: string): PaymentProofAsset => {
    const filename = uri.split('/').pop() ?? 'payment-proof.jpg';
    const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
    return {
        uri,
        type: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
        name: filename,
    };
};

function PaymentProofCard({ orderId, onUploaded }: Props) {
    const { t } = useOrdersT();
    const isRTL = useLanguageStore((s) => s.isRTL);
    const writingDirection = isRTL ? 'rtl' : 'ltr';
    const textAlign = isRTL ? 'right' : 'left';

    const existing = usePaymentProofUrl(orderId);
    const upload = useUploadPaymentProof();

    const [localPreview, setLocalPreview] = useState<string | null>(null);

    const remoteUrl = existing.data ?? null;
    const previewSrc = localPreview ?? remoteUrl;
    const isUploaded = !!remoteUrl && !upload.isPending;

    useEffect(() => {
        if (remoteUrl) setLocalPreview(null);
    }, [remoteUrl]);

    const pickAndUpload = useCallback(async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert(
                t('paymentProof.permissionRequiredTitle', { defaultValue: 'Permission required' }),
                t('paymentProof.permissionRequiredBody', {
                    defaultValue: 'Allow photo access to upload your receipt.',
                }),
            );
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.8,
            allowsEditing: false,
        });
        if (result.canceled || !result.assets[0]) return;

        const asset = result.assets[0];
        if (typeof asset.fileSize === 'number' && asset.fileSize > MAX_SIZE_BYTES) {
            Alert.alert(
                t('paymentProof.tooLargeTitle', { defaultValue: 'File too large' }),
                t('paymentProof.tooLargeBody', { defaultValue: 'Please choose an image under 5 MB.' }),
            );
            return;
        }

        setLocalPreview(asset.uri);

        try {
            await upload.mutateAsync({ orderId, file: buildAsset(asset.uri) });
            onUploaded?.();
        } catch (err) {
            const msg =
                getPaymentProofErrorMessage(err) ??
                t('paymentProof.errorBody', { defaultValue: 'Please try again.' });
            Alert.alert(t('paymentProof.errorTitle', { defaultValue: 'Upload failed' }), msg);
        }
    }, [onUploaded, orderId, t, upload]);

    const openProof = useCallback(async () => {
        if (!remoteUrl) return;
        const can = await Linking.canOpenURL(remoteUrl);
        if (can) await Linking.openURL(remoteUrl);
    }, [remoteUrl]);

    const isUploading = upload.isPending;
    const showLoading = existing.isLoading && !remoteUrl;

    return (
        <View style={styles.card}>
            <View style={[styles.header, isRTL && styles.rowReverse]}>
                <View style={styles.icon}>
                    <Ionicons name="receipt-outline" size={18} color={colors.primary} />
                </View>
                <View style={styles.headerText}>
                    <Text style={[styles.title, { textAlign, writingDirection }]}>
                        {t('paymentProof.title', { defaultValue: 'Upload payment receipt' })}
                    </Text>
                    <Text style={[styles.subtitle, { textAlign, writingDirection }]}>
                        {t('paymentProof.subtitle', {
                            defaultValue:
                                'Send us a photo of your transfer receipt to confirm payment (max 5 MB).',
                        })}
                    </Text>
                </View>
            </View>

            <TouchableOpacity
                onPress={isUploaded ? openProof : pickAndUpload}
                disabled={isUploading || showLoading}
                activeOpacity={0.85}
                style={[styles.dropzone, previewSrc ? styles.dropzoneFilled : null]}
            >
                {showLoading ? (
                    <ActivityIndicator color={colors.primary} />
                ) : previewSrc ? (
                    <>
                        <Image
                            source={{ uri: previewSrc }}
                            style={styles.previewImage}
                            resizeMode="cover"
                        />
                        <View style={styles.previewOverlay}>
                            {isUploading ? (
                                <ActivityIndicator color={colors.onPrimary} />
                            ) : isUploaded ? (
                                <View style={[styles.previewBadge, isRTL && styles.rowReverse]}>
                                    <Ionicons name="checkmark-circle" size={16} color="#9BE5B5" />
                                    <Text style={[styles.previewBadgeText, { writingDirection }]}>
                                        {t('paymentProof.uploaded', {
                                            defaultValue: 'Receipt uploaded — tap to view',
                                        })}
                                    </Text>
                                </View>
                            ) : (
                                <Text style={[styles.previewChangeText, { writingDirection }]}>
                                    {t('paymentProof.change', { defaultValue: 'Tap to change' })}
                                </Text>
                            )}
                        </View>
                    </>
                ) : (
                    <View style={styles.placeholder}>
                        <View style={styles.placeholderIcon}>
                            <Ionicons name="cloud-upload-outline" size={26} color={colors.primary} />
                        </View>
                        <Text style={[styles.placeholderText, { writingDirection }]}>
                            {t('paymentProof.cta', { defaultValue: 'Tap to upload receipt' })}
                        </Text>
                        <Text style={[styles.placeholderHint, { writingDirection }]}>
                            {t('paymentProof.hint', { defaultValue: 'JPG or PNG, max 5 MB' })}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>

            {isUploaded ? (
                <View style={[styles.successPill, isRTL && styles.rowReverse]}>
                    <Ionicons name="checkmark-circle" size={14} color="#0F7A36" />
                    <Text style={[styles.successText, { writingDirection }]}>
                        {t('paymentProof.successPill', { defaultValue: 'Awaiting verification' })}
                    </Text>
                </View>
            ) : previewSrc && !isUploading ? (
                <AnimatedPressable
                    onPress={pickAndUpload}
                    scaleTo={0.97}
                    haptic="impact"
                    style={[styles.retryBtn, isRTL && styles.rowReverse]}
                    accessibilityRole="button"
                >
                    <Ionicons name="refresh" size={14} color={colors.onPrimary} />
                    <Text style={[styles.retryBtnText, { writingDirection }]}>
                        {t('paymentProof.retry', { defaultValue: 'Retry upload' })}
                    </Text>
                </AnimatedPressable>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    rowReverse: {
        flexDirection: 'row-reverse',
    },
    card: {
        padding: 16,
        borderRadius: radii.xl,
        backgroundColor: colors.card,
        gap: 12,
        ...shadows.soft,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    icon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.faintPrimary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerText: {
        flex: 1,
        gap: 2,
    },
    title: {
        fontFamily: typography.headlineSemi,
        color: colors.onSurface,
        fontSize: 15,
        lineHeight: 19,
    },
    subtitle: {
        fontFamily: typography.bodyMedium,
        color: colors.outline,
        fontSize: 12,
        lineHeight: 16,
    },
    dropzone: {
        borderWidth: 1.5,
        borderColor: colors.surfaceContainer,
        borderStyle: 'dashed',
        borderRadius: radii.lg,
        minHeight: 140,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface,
    },
    dropzoneFilled: {
        borderStyle: 'solid',
        borderColor: colors.primary,
        backgroundColor: '#000',
    },
    placeholder: {
        alignItems: 'center',
        gap: 8,
        paddingVertical: 18,
    },
    placeholderIcon: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: colors.faintPrimary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    placeholderText: {
        fontFamily: typography.bodyBold,
        color: colors.onSurface,
        fontSize: 13,
        lineHeight: 17,
    },
    placeholderHint: {
        fontFamily: typography.bodyMedium,
        color: colors.outline,
        fontSize: 11,
        lineHeight: 14,
    },
    previewImage: {
        width: '100%',
        height: 160,
        opacity: 0.9,
    },
    previewOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: 'rgba(0,0,0,0.55)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    previewChangeText: {
        fontFamily: typography.bodyBold,
        color: '#FFF',
        fontSize: 12,
        lineHeight: 16,
    },
    previewBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    previewBadgeText: {
        fontFamily: typography.bodyBold,
        color: '#FFF',
        fontSize: 12,
        lineHeight: 16,
    },
    successPill: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: radii.pill,
        backgroundColor: '#D9F5E2',
    },
    successText: {
        fontFamily: typography.bodyBold,
        color: '#0F7A36',
        fontSize: 11,
        lineHeight: 14,
    },
    retryBtn: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: radii.pill,
        backgroundColor: colors.primary,
    },
    retryBtnText: {
        fontFamily: typography.bodyBold,
        color: colors.onPrimary,
        fontSize: 12,
        lineHeight: 16,
    },
});

export default PaymentProofCard;
