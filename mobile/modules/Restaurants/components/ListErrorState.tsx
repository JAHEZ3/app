import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppText from '@/components/ui/AppText';
import AppButton from '@/components/ui/AppButton';

interface ListErrorStateProps {
    title?: string;
    message?: string;
    retryLabel?: string;
    onRetry?: () => void;
    loading?: boolean;
}

const ListErrorState = ({
    title = 'Something went wrong',
    message = 'We couldn’t load restaurants. Please check your connection and try again.',
    retryLabel = 'Try again',
    onRetry,
    loading = false,
}: ListErrorStateProps) => (
    <View style={styles.wrap}>
        <View style={styles.iconCircle}>
            <Ionicons name="cloud-offline-outline" size={32} color="#F55905" />
        </View>
        <AppText variant="headline-sm" align="center" style={styles.title}>
            {title}
        </AppText>
        <AppText variant="body-md" align="center" style={styles.message}>
            {message}
        </AppText>
        {onRetry && (
            <View style={styles.btn}>
                <AppButton
                    label={retryLabel}
                    loading={loading}
                    onPress={onRetry}
                    fullWidth={false}
                    icon={<Ionicons name="refresh" size={16} color="#fff" />}
                    iconPosition="left"
                />
            </View>
        )}
    </View>
);

const styles = StyleSheet.create({
    wrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        paddingVertical: 48,
        gap: 12,
    },
    iconCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#FFF3EC',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    title: { color: '#0F172A' },
    message: { color: '#6B7280', maxWidth: 320 },
    btn: { marginTop: 12 },
});

export default ListErrorState;
