import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import AppText from '@/components/ui/AppText';

interface ListFooterLoaderProps {
    visible: boolean;
    label?: string;
}

const ListFooterLoader = ({ visible, label = 'Loading more…' }: ListFooterLoaderProps) => {
    if (!visible) return null;
    return (
        <View style={styles.wrap}>
            <ActivityIndicator size="small" color="#F55905" />
            <AppText variant="body-sm" align="center" style={styles.label}>
                {label}
            </AppText>
        </View>
    );
};

const styles = StyleSheet.create({
    wrap: { paddingVertical: 24, alignItems: 'center', justifyContent: 'center', gap: 6 },
    label: { color: '#6B7280' },
});

export default ListFooterLoader;
