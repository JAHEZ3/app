import React, { useEffect, useCallback } from 'react';
import { View, Text } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withDelay,
    runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
    message: string;
    type?: ToastType;
    visible: boolean;
    onHide: () => void;
    duration?: number;
}

const CONFIG: Record<ToastType, { bg: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
    success: { bg: '#1a7a4a', icon: 'checkmark-circle', color: '#fff' },
    error: { bg: '#b02500', icon: 'alert-circle', color: '#fff' },
    info: { bg: '#1E1E1E', icon: 'information-circle', color: '#fff' },
};

export function Toast({ message, type = 'info', visible, onHide, duration = 3000 }: ToastProps) {
    const translateY = useSharedValue(-100);
    const opacity = useSharedValue(0);

    const hide = useCallback(() => {
        translateY.value = withTiming(-100, { duration: 280 });
        opacity.value = withTiming(0, { duration: 280 }, (done) => {
            if (done) runOnJS(onHide)();
        });
    }, [translateY, opacity, onHide]);

    useEffect(() => {
        if (visible) {
            translateY.value = withTiming(0, { duration: 320 });
            opacity.value = withTiming(1, { duration: 320 });
            const timer = setTimeout(hide, duration);
            return () => clearTimeout(timer);
        }
    }, [visible, hide, duration, translateY, opacity]);

    const style = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
        opacity: opacity.value,
    }));

    const cfg = CONFIG[type];

    return (
        <Animated.View
            style={[
                style,
                {
                    position: 'absolute',
                    top: 56,
                    left: 20,
                    right: 20,
                    zIndex: 999,
                    backgroundColor: cfg.bg,
                    borderRadius: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    gap: 10,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.18,
                    shadowRadius: 12,
                    elevation: 8,
                },
            ]}
        >
            <Ionicons name={cfg.icon} size={20} color={cfg.color} />
            <Text style={{ fontFamily: 'Tajawal_500Medium', fontSize: 14, color: cfg.color, flex: 1 }}>
                {message}
            </Text>
        </Animated.View>
    );
}

export function useToast() {
    const [toast, setToast] = React.useState<{ message: string; type: ToastType; visible: boolean }>({
        message: '',
        type: 'info',
        visible: false,
    });

    const show = useCallback((message: string, type: ToastType = 'info') => {
        setToast({ message, type, visible: true });
    }, []);

    const hide = useCallback(() => {
        setToast((prev) => ({ ...prev, visible: false }));
    }, []);

    return { toast, show, hide };
}
