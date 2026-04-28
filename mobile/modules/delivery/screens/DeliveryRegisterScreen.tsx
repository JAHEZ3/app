import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withDelay,
    Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AppButton from '@/components/ui/AppButton';
import { useDeliveryRegister } from '../hooks/useDeliveryRegister';
import { useDeliveryLogin } from '../hooks/useDeliveryLogin';
import { Toast, useToast } from '../components/Toast';

const ease = Easing.out(Easing.cubic);

type Tab = 'register' | 'login';

// Normalise an API error into a readable message string.
function extractMessage(err: unknown): string {
    const axErr = err as any;
    return (
        axErr?.response?.data?.message ??
        axErr?.response?.data?.error ??
        (err instanceof Error ? err.message : null) ??
        'Something went wrong'
    );
}

// Check whether an error indicates the phone is unknown to the delivery system.
function isNotFoundError(err: unknown): boolean {
    const axErr = err as any;
    const status: number = axErr?.response?.status ?? 0;
    const msg: string = extractMessage(err).toLowerCase();
    return (
        status === 404 ||
        msg.includes('not found') ||
        msg.includes('no user') ||
        msg.includes('does not exist')
    );
}

// Check whether an error indicates the phone is already registered.
function isAlreadyExistsError(err: unknown): boolean {
    const axErr = err as any;
    const status: number = axErr?.response?.status ?? 0;
    const msg: string = extractMessage(err).toLowerCase();
    return (
        status === 409 ||
        msg.includes('already') ||
        msg.includes('exists') ||
        msg.includes('registered')
    );
}

function Row({ children, delay }: { children: React.ReactNode; delay: number }) {
    const opacity = useSharedValue(0);
    const y = useSharedValue(12);
    useEffect(() => {
        opacity.value = withDelay(delay, withTiming(1, { duration: 360, easing: ease }));
        y.value = withDelay(delay, withTiming(0, { duration: 360, easing: ease }));
    }, [opacity, y, delay]);
    const style = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateY: y.value }],
    }));
    return <Animated.View style={style}>{children}</Animated.View>;
}

export default function DeliveryRegisterScreen() {
    // Always start on the login tab — returning users are the common case.
    // First-time users land here too; if login says "not found" we switch them
    // to the register tab automatically (see handleSubmit below).
    const [tab, setTab] = useState<Tab>('login');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const { toast, show: showToast, hide: hideToast } = useToast();

    const { mutateAsync: register, isPending: isRegistering } = useDeliveryRegister();
    const { mutateAsync: login, isPending: isLoggingIn } = useDeliveryLogin();

    const isPending = tab === 'register' ? isRegistering : isLoggingIn;
    const isPhoneValid = phone.length >= 9;
    const canSubmit = isPhoneValid && (tab === 'register' || password.length >= 6);

    const heroOpacity = useSharedValue(0);
    const cardY = useSharedValue(30);
    const cardOpacity = useSharedValue(0);

    useEffect(() => {
        heroOpacity.value = withTiming(1, { duration: 500, easing: ease });
        cardOpacity.value = withDelay(160, withTiming(1, { duration: 380, easing: ease }));
        cardY.value = withDelay(160, withTiming(0, { duration: 380, easing: ease }));
    }, [heroOpacity, cardOpacity, cardY]);

    const heroStyle = useAnimatedStyle(() => ({ opacity: heroOpacity.value }));
    const cardStyle = useAnimatedStyle(() => ({
        opacity: cardOpacity.value,
        transform: [{ translateY: cardY.value }],
    }));

    const handleSubmit = useCallback(async () => {
        try {
            if (tab === 'register') {
                await register(phone);
            } else {
                await login({ phone, password });
            }
        } catch (err: unknown) {
            if (tab === 'login' && isNotFoundError(err)) {
                // Phone has no delivery-agent account yet → guide user to register.
                setTab('register');
                setPassword('');
                showToast('No account found. Please create a new one.', 'info');
                return;
            }

            if (tab === 'register' && isAlreadyExistsError(err)) {
                // Phone is already registered → guide user to sign in.
                setTab('login');
                showToast('Account already exists. Please sign in.', 'info');
                return;
            }

            showToast(extractMessage(err), 'error');
        }
    }, [tab, phone, password, register, login, showToast]);

    return (
        <View style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            <Toast {...toast} onHide={hideToast} />

            {/* Hero */}
            <Animated.View style={[heroStyle, { height: 240, overflow: 'hidden' }]}>
                <LinearGradient
                    colors={['#F55905', '#c94400', '#0a0a0a']}
                    locations={[0, 0.55, 1]}
                    style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 32 }}
                >
                    <View style={{
                        width: 72, height: 72, borderRadius: 36,
                        backgroundColor: 'rgba(255,255,255,0.15)',
                        alignItems: 'center', justifyContent: 'center', marginBottom: 12,
                        borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)',
                    }}>
                        <Ionicons name="bicycle" size={36} color="#fff" />
                    </View>
                    <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 26, color: '#fff', marginBottom: 4 }}>
                        Delivery Agent
                    </Text>
                    <Text style={{ fontFamily: 'Tajawal_400Regular', fontSize: 13, color: 'rgba(255,255,255,0.65)', letterSpacing: 3, textTransform: 'uppercase' }}>
                        JOIN THE TEAM
                    </Text>
                </LinearGradient>
            </Animated.View>

            {/* Card */}
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <Animated.View style={[cardStyle, {
                    flex: 1, backgroundColor: '#fff',
                    borderTopLeftRadius: 28, borderTopRightRadius: 28,
                    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: 0.08, shadowRadius: 20, elevation: 16,
                }]}>
                    <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
                        <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#e5e5e5' }} />
                    </View>

                    <ScrollView
                        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Tabs */}
                        <Row delay={120}>
                            <View style={{
                                flexDirection: 'row', backgroundColor: '#F5F5F5',
                                borderRadius: 16, padding: 4, marginTop: 14, marginBottom: 22,
                            }}>
                                {(['register', 'login'] as Tab[]).map((t) => {
                                    const active = tab === t;
                                    return (
                                        <TouchableOpacity
                                            key={t}
                                            onPress={() => setTab(t)}
                                            style={{
                                                flex: 1, paddingVertical: 10, borderRadius: 13,
                                                alignItems: 'center',
                                                backgroundColor: active ? '#fff' : 'transparent',
                                                shadowColor: active ? '#000' : 'transparent',
                                                shadowOffset: { width: 0, height: 1 },
                                                shadowOpacity: active ? 0.06 : 0,
                                                shadowRadius: 4,
                                                elevation: active ? 2 : 0,
                                            }}
                                        >
                                            <Text style={{
                                                fontFamily: active ? 'Cairo_700Bold' : 'Tajawal_400Regular',
                                                fontSize: 14,
                                                color: active ? '#F55905' : '#767777',
                                            }}>
                                                {t === 'register' ? 'New Agent' : 'Sign In'}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </Row>

                        <Row delay={200}>
                            <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 22, color: '#1E1E1E', marginBottom: 4 }}>
                                {tab === 'register' ? 'New Delivery Agent' : 'Welcome Back'}
                            </Text>
                            <Text style={{ fontFamily: 'Tajawal_400Regular', fontSize: 14, color: '#767777', lineHeight: 22, marginBottom: 24 }}>
                                {tab === 'register'
                                    ? 'First time here? Enter your phone to receive an OTP and create your account.'
                                    : 'Sign in with your phone number and password.'}
                            </Text>
                        </Row>

                        {/* Phone */}
                        <Row delay={260}>
                            <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 13, color: '#1E1E1E', marginBottom: 8 }}>
                                Phone Number
                            </Text>
                            <View style={{
                                flexDirection: 'row', alignItems: 'center',
                                borderWidth: 1.5, borderColor: '#e5e5e5', borderRadius: 14,
                                backgroundColor: '#fafafa', paddingHorizontal: 14, height: 52,
                            }}>
                                <Ionicons name="phone-portrait-outline" size={18} color="#F55905" />
                                <TextInput
                                    value={phone}
                                    onChangeText={setPhone}
                                    placeholder="+966 5X XXX XXXX"
                                    keyboardType="phone-pad"
                                    style={{
                                        flex: 1, marginLeft: 10,
                                        fontFamily: 'Tajawal_400Regular',
                                        fontSize: 15, color: '#1E1E1E',
                                    }}
                                    placeholderTextColor="#c0c0c0"
                                />
                            </View>
                        </Row>

                        {/* Password (login only) */}
                        {tab === 'login' && (
                            <Row delay={300}>
                                <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 13, color: '#1E1E1E', marginBottom: 8, marginTop: 16 }}>
                                    Password
                                </Text>
                                <View style={{
                                    flexDirection: 'row', alignItems: 'center',
                                    borderWidth: 1.5, borderColor: '#e5e5e5', borderRadius: 14,
                                    backgroundColor: '#fafafa', paddingHorizontal: 14, height: 52,
                                }}>
                                    <Ionicons name="lock-closed-outline" size={18} color="#F55905" />
                                    <TextInput
                                        value={password}
                                        onChangeText={setPassword}
                                        placeholder="Enter your password"
                                        secureTextEntry={!showPassword}
                                        style={{
                                            flex: 1, marginLeft: 10,
                                            fontFamily: 'Tajawal_400Regular',
                                            fontSize: 15, color: '#1E1E1E',
                                        }}
                                        placeholderTextColor="#c0c0c0"
                                    />
                                    <TouchableOpacity onPress={() => setShowPassword((p) => !p)}>
                                        <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#767777" />
                                    </TouchableOpacity>
                                </View>
                            </Row>
                        )}

                        {/* CTA */}
                        <Row delay={360}>
                            <View style={{ marginTop: 28 }}>
                                <AppButton
                                    label={tab === 'register' ? 'Send OTP' : 'Sign In'}
                                    onPress={handleSubmit}
                                    disabled={!canSubmit || isPending}
                                    loading={isPending}
                                    icon={<Ionicons name={tab === 'register' ? 'arrow-forward-circle-outline' : 'log-in-outline'} size={22} color="#fff" />}
                                    iconPosition="right"
                                />
                            </View>
                        </Row>

                        {/* Back */}
                        <Row delay={420}>
                            <TouchableOpacity
                                onPress={() => router.back()}
                                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 20 }}
                            >
                                <Ionicons name="arrow-back-outline" size={16} color="#767777" />
                                <Text style={{ fontFamily: 'Tajawal_400Regular', fontSize: 13, color: '#767777' }}>
                                    Back to Home
                                </Text>
                            </TouchableOpacity>
                        </Row>
                    </ScrollView>
                </Animated.View>
            </KeyboardAvoidingView>
        </View>
    );
}
