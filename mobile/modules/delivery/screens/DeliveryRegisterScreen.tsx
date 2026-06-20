import React, { useCallback, useEffect, useState } from 'react';
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
import { useDeliveryT } from '@/hooks/useAppTranslation';
import { useRTL } from '@/hooks/useRTL';
import { CountryCode, DEFAULT_COUNTRY_CODE, toE164 } from '@/lib/phone';
import { useDeliveryRegister } from '../hooks/useDeliveryRegister';
import { useDeliveryLogin } from '../hooks/useDeliveryLogin';
import { useDeliverySendLoginOtp } from '../hooks/useDeliverySendLoginOtp';
import DeliveryPhoneInput from '../components/DeliveryPhoneInput';
import { Toast, useToast } from '../components/Toast';

const ease = Easing.out(Easing.cubic);

type Tab = 'register' | 'login';

function httpStatus(err: unknown): number {
    return (err as any)?.response?.status ?? 0;
}

function extractMessage(err: unknown, fallback: string): string {
    const ax = err as any;
    return (
        ax?.response?.data?.message ??
        ax?.response?.data?.error ??
        (err instanceof Error && err.message ? err.message : null) ??
        fallback
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
    const { t } = useDeliveryT();
    const isRTL = useRTL();
    const textAlign = isRTL ? 'right' : 'left';

    // Returning agents are the common case, so default to the sign-in tab.
    const [tab, setTab] = useState<Tab>('login');
    const [countryCode, setCountryCode] = useState<CountryCode>(DEFAULT_COUNTRY_CODE);
    const [national, setNational] = useState('');
    const [e164, setE164] = useState<string | null>(null);
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const { toast, show: showToast, hide: hideToast } = useToast();

    const { mutateAsync: register, isPending: isRegistering } = useDeliveryRegister();
    const { mutateAsync: login, isPending: isLoggingIn } = useDeliveryLogin();
    const { mutateAsync: sendLoginOtp, isPending: isSendingOtp } = useDeliverySendLoginOtp();

    const isPending = isRegistering || isLoggingIn || isSendingOtp;
    const phoneValid = !!e164;
    const canSubmit = phoneValid && (tab === 'register' || password.length >= 6);

    // Keep e164 in sync even when the user never blurs the field.
    useEffect(() => {
        setE164(toE164(countryCode, national));
    }, [countryCode, national]);

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

    const switchTab = useCallback((next: Tab) => {
        setTab(next);
        setSubmitted(false);
        setPassword('');
    }, []);

    const handleSubmit = useCallback(async () => {
        setSubmitted(true);
        if (!e164) return;
        try {
            if (tab === 'register') {
                await register(e164);
            } else {
                // The login hook transparently switches to the OTP fallback when
                // the account has no password yet — no client-side guessing.
                await login({ phone: e164, password });
            }
        } catch (err: unknown) {
            const code = httpStatus(err);

            if (tab === 'register') {
                if (code === 409) {
                    // Number already registered → guide to sign in.
                    switchTab('login');
                    showToast(t('register.errors.accountExists'), 'info');
                    return;
                }
            } else {
                if (code === 401 || code === 403) {
                    showToast(t('register.errors.incorrectCredentials'), 'error');
                    return;
                }
            }
            if (code === 0) {
                showToast(t('register.errors.network'), 'error');
                return;
            }
            showToast(extractMessage(err, t('register.errors.generic')), 'error');
        }
    }, [tab, e164, password, register, login, switchTab, showToast, t]);

    const handleLoginWithOtp = useCallback(async () => {
        setSubmitted(true);
        if (!e164) return;
        try {
            await sendLoginOtp(e164);
        } catch (err: unknown) {
            const code = httpStatus(err);
            if (code === 404) {
                switchTab('register');
                showToast(t('register.errors.noAccount'), 'info');
                return;
            }
            if (code === 0) {
                showToast(t('register.errors.network'), 'error');
                return;
            }
            showToast(extractMessage(err, t('register.errors.generic')), 'error');
        }
    }, [e164, sendLoginOtp, switchTab, showToast, t]);

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
                        {t('register.heroTitle')}
                    </Text>
                    <Text style={{ fontFamily: 'Tajawal_400Regular', fontSize: 13, color: 'rgba(255,255,255,0.65)', letterSpacing: 3, textTransform: 'uppercase' }}>
                        {t('register.heroSubtitle')}
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
                                {(['register', 'login'] as Tab[]).map((tabOption) => {
                                    const active = tab === tabOption;
                                    return (
                                        <TouchableOpacity
                                            key={tabOption}
                                            onPress={() => switchTab(tabOption)}
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
                                                {tabOption === 'register' ? t('register.tabs.register') : t('register.tabs.login')}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </Row>

                        <Row delay={200}>
                            <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 22, color: '#1E1E1E', marginBottom: 4, textAlign }}>
                                {tab === 'register' ? t('register.title.register') : t('register.title.login')}
                            </Text>
                            <Text style={{ fontFamily: 'Tajawal_400Regular', fontSize: 14, color: '#767777', lineHeight: 22, marginBottom: 24, textAlign }}>
                                {tab === 'register' ? t('register.subtitle.register') : t('register.subtitle.login')}
                            </Text>
                        </Row>

                        {/* Phone */}
                        <Row delay={260}>
                            <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 13, color: '#1E1E1E', marginBottom: 8, textAlign }}>
                                {t('register.phoneLabel')}
                            </Text>
                            <DeliveryPhoneInput
                                national={national}
                                onChangeNational={setNational}
                                countryCode={countryCode}
                                onChangeCountryCode={setCountryCode}
                                onE164Change={setE164}
                                showError={submitted}
                            />
                        </Row>

                        {/* Password (login only) */}
                        {tab === 'login' && (
                            <Row delay={300}>
                                <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 13, color: '#1E1E1E', marginBottom: 8, marginTop: 16, textAlign }}>
                                    {t('register.passwordLabel')}
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
                                        placeholder={t('register.passwordPlaceholder')}
                                        secureTextEntry={!showPassword}
                                        style={{
                                            flex: 1, marginHorizontal: 10,
                                            fontFamily: 'Tajawal_400Regular',
                                            fontSize: 15, color: '#1E1E1E', textAlign,
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
                                    label={tab === 'register' ? t('register.sendOtp') : t('register.signIn')}
                                    onPress={handleSubmit}
                                    disabled={!canSubmit || isPending}
                                    loading={isPending}
                                    icon={<Ionicons name={tab === 'register' ? 'arrow-forward-circle-outline' : 'log-in-outline'} size={22} color="#fff" />}
                                    iconPosition="right"
                                />
                            </View>
                        </Row>

                        {/* Login with OTP fallback */}
                        {tab === 'login' && (
                            <Row delay={400}>
                                <TouchableOpacity
                                    onPress={handleLoginWithOtp}
                                    disabled={!phoneValid || isPending}
                                    style={{ alignItems: 'center', marginTop: 16, opacity: !phoneValid || isPending ? 0.5 : 1 }}
                                >
                                    <Text style={{ fontFamily: 'Tajawal_500Medium', fontSize: 13, color: '#F55905' }}>
                                        {t('register.loginWithOtp')}
                                    </Text>
                                </TouchableOpacity>
                            </Row>
                        )}

                        {/* Back */}
                        <Row delay={460}>
                            <TouchableOpacity
                                onPress={() => router.back()}
                                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 20 }}
                            >
                                <Ionicons name={isRTL ? 'arrow-forward-outline' : 'arrow-back-outline'} size={16} color="#767777" />
                                <Text style={{ fontFamily: 'Tajawal_400Regular', fontSize: 13, color: '#767777' }}>
                                    {t('register.backToHome')}
                                </Text>
                            </TouchableOpacity>
                        </Row>
                    </ScrollView>
                </Animated.View>
            </KeyboardAvoidingView>
        </View>
    );
}
