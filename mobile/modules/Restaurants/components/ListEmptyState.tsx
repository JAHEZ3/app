import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppText from '@/components/ui/AppText';

interface ListEmptyStateProps {
    title?: string;
    message?: string;
}

const ListEmptyState = ({
    title = 'No restaurants yet',
    message = 'We couldn’t find any restaurants right now. Pull down to refresh or check back later.',
}: ListEmptyStateProps) => (
    <View style={styles.wrap}>
        <View style={styles.iconCircle}>
            <Ionicons name="restaurant-outline" size={32} color="#F55905" />
        </View>
        <AppText variant="headline-sm" align="center" style={styles.title}>
            {title}
        </AppText>
        <AppText variant="body-md" align="center" style={styles.message}>
            {message}
        </AppText>
    </View>
);

const styles = StyleSheet.create({
    wrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        paddingVertical: 64,
        gap: 10,
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
});

export default ListEmptyState;
