import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StatusBar,
    KeyboardAvoidingView,
    Platform,
    TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withDelay,
    withRepeat,
    Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AppButton from '@/components/ui/AppButton';
import { useDeliveryVerifyOtp } from '../hooks/useDeliveryVerifyOtp';
import { useDeliveryPhoneStore } from '@/store/useDeliveryPhoneStore';
import { Toast, useToast } from '../components/Toast';

const RESEND_SECONDS = 120;
const ease = Easing.bezier(0.22, 1, 0.36, 1);

function Row({ children, delay }: { children: React.ReactNode; delay: number }) {
    const opacity = useSharedValue(0);
    const y = useSharedValue(14);
    useEffect(() => {
        opacity.value = withDelay(delay, withTiming(1, { duration: 520, easing: ease }));
        y.value = withDelay(delay, withTiming(0, { duration: 520, easing: ease }));
    }, [opacity, y, delay]);
    const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: y.value }] }));
    return <Animated.View style={style}>{children}</Animated.View>;
}

function OTPBoxes({
    value,
    onChange,
}: {
    value: string;
    onChange: (val: string) => void;
}) {
    const inputRef = React.useRef<TextInput>(null);
    const boxes = Array(6).fill('');

    return (
        <TouchableOpacity activeOpacity={1} onPress={() => inputRef.current?.focus()}>
            <TextInput
                ref={inputRef}
                value={value}
                onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
                style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }}
                autoFocus
            />
            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'center' }}>
                {boxes.map((_, i) => {
                    const char = value[i] ?? '';
                    const isFocused = value.length === i;
                    return (
                        <View key={i} style={{
                            width: 48, height: 56, borderRadius: 14,
                            borderWidth: isFocused ? 2 : 1.5,
                            borderColor: isFocused ? '#F55905' : char ? '#1E1E1E' : '#e5e5e5',
                            backgroundColor: char ? '#FFF5F0' : '#fafafa',
                            alignItems: 'center', justifyContent: 'center',
                        }}>
                            <Text style={{
                                fontFamily: 'Cairo_700Bold', fontSize: 22,
                                color: '#1E1E1E',
                            }}>
                                {char}
                            </Text>
                        </View>
                    );
                })}
            </View>
        </TouchableOpacity>
    );
}

function Countdown({ seconds, onExpire }: { seconds: number; onExpire: () => void }) {
    const [left, setLeft] = useState(seconds);
    useEffect(() => {
        if (left <= 0) { onExpire(); return; }
        const t = setTimeout(() => setLeft((p) => p - 1), 1000);
        return () => clearTimeout(t);
    }, [left, onExpire]);

    const m = useMemo(() => Math.floor(left / 60), [left]);
    const s = useMemo(() => left % 60, [left]);
    if (left <= 0) return null;

    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Ionicons name="time-outline" size={14} color="#767777" />
            <Text style={{ fontFamily: 'Tajawal_400Regular', fontSize: 13, color: '#767777' }}>
                Resend in{' '}
                <Text style={{ fontFamily: 'Cairo_700Bold', color: '#F55905' }}>
                    {m}:{String(s).padStart(2, '0')}
                </Text>
            </Text>
        </View>
    );
}

export default function DeliveryOTPScreen() {
    const [otp, setOtp] = useState('');
    const [canResend, setCanResend] = useState(false);
    const [resendKey, setResendKey] = useState(0);
    const { phoneNumber } = useDeliveryPhoneStore();
    const { toast, show: showToast, hide: hideToast } = useToast();

    const { mutateAsync: verifyOtp, isPending } = useDeliveryVerifyOtp();

    const handleVerify = useCallback(async (code?: string) => {
        try {
            await verifyOtp({ phone: phoneNumber, otp: code ?? otp });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Invalid OTP. Please try again.';
            showToast(msg, 'error');
        }
    }, [otp, phoneNumber, verifyOtp, showToast]);

    const handleResend = useCallback(() => {
        setOtp('');
        setCanResend(false);
        setResendKey((k) => k + 1);
        showToast('New OTP sent to ' + phoneNumber, 'success');
    }, [phoneNumber, showToast]);

    useEffect(() => {
        if (otp.length === 6) handleVerify(otp);
    }, [otp]);

    const glowOpacity = useSharedValue(0.2);
    useEffect(() => {
        glowOpacity.value = withRepeat(
            withTiming(0.4, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
            -1, true
        );
    }, [glowOpacity]);
    const glowStyle = useAnimatedStyle(() => ({ opacity: glowOpacity.value }));

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />
            <Toast {...toast} onHide={hideToast} />

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                {/* Header */}
                <View style={{
                    flexDirection: 'row', alignItems: 'center',
                    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12,
                }}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#F7F7F7', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <Ionicons name="arrow-back" size={20} color="#1E1E1E" />
                    </TouchableOpacity>
                    <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 17, color: '#1E1E1E', marginLeft: 12 }}>
                        Verify OTP
                    </Text>
                </View>

                <View style={{ flex: 1, paddingHorizontal: 24 }}>
                    {/* Icon */}
                    <Row delay={80}>
                        <View style={{ alignItems: 'center', marginTop: 20, marginBottom: 24 }}>
                            <View style={{ alignItems: 'center', justifyContent: 'center', width: 88, height: 88 }}>
                                <Animated.View style={[glowStyle, {
                                    position: 'absolute', width: 88, height: 88, borderRadius: 44,
                                    backgroundColor: '#F55905',
                                }]} />
                                <View style={{
                                    width: 72, height: 72, borderRadius: 36,
                                    backgroundColor: '#F55905',
                                    alignItems: 'center', justifyContent: 'center',
                                    shadowColor: '#F55905', shadowOffset: { width: 0, height: 6 },
                                    shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
                                }}>
                                    <Ionicons name="chatbubble-ellipses" size={30} color="#fff" />
                                </View>
                            </View>
                        </View>
                    </Row>

                    <Row delay={150}>
                        <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 22, color: '#1E1E1E', textAlign: 'center', marginBottom: 6 }}>
                            Enter Verification Code
                        </Text>
                    </Row>

                    <Row delay={210}>
                        <View style={{ alignItems: 'center', marginBottom: 32 }}>
                            <Text style={{ fontFamily: 'Tajawal_400Regular', fontSize: 14, color: '#767777', textAlign: 'center', lineHeight: 22 }}>
                                We sent a 6-digit code to
                            </Text>
                            <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 15, color: '#1E1E1E', marginTop: 2 }}>
                                {phoneNumber}
                            </Text>
                        </View>
                    </Row>

                    <Row delay={280}>
                        <OTPBoxes value={otp} onChange={setOtp} />
                    </Row>

                    {/* Resend */}
                    <Row delay={360}>
                        <View style={{ alignItems: 'center', marginTop: 24, minHeight: 30 }}>
                            {canResend ? (
                                <TouchableOpacity
                                    onPress={handleResend}
                                    style={{
                                        flexDirection: 'row', alignItems: 'center', gap: 6,
                                        paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
                                        borderWidth: 1.5, borderColor: '#F55905',
                                    }}
                                >
                                    <Ionicons name="refresh" size={14} color="#F55905" />
                                    <Text style={{ fontFamily: 'Tajawal_500Medium', fontSize: 14, color: '#F55905' }}>
                                        Resend OTP
                                    </Text>
                                </TouchableOpacity>
                            ) : (
                                <Countdown key={resendKey} seconds={RESEND_SECONDS} onExpire={() => setCanResend(true)} />
                            )}
                        </View>
                    </Row>

                    <Row delay={420}>
                        <View style={{ marginTop: 28 }}>
                            <AppButton
                                label="Verify & Continue"
                                onPress={() => handleVerify()}
                                disabled={otp.length < 6 || isPending}
                                loading={isPending}
                                icon={<Ionicons name="checkmark-circle-outline" size={22} color="#fff" />}
                                iconPosition="right"
                            />
                        </View>
                    </Row>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
