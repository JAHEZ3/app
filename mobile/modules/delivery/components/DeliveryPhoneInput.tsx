import React, { useCallback, useState } from 'react';
import {
    View,
    TextInput,
    TouchableOpacity,
    Text,
    Modal,
    Pressable,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useDeliveryT } from '@/hooks/useAppTranslation';
import { useRTL } from '@/hooks/useRTL';
import {
    COUNTRY_CODES,
    CountryCode,
    DEFAULT_COUNTRY_CODE,
    isValidNational,
    sanitizeNational,
    toE164,
} from '@/lib/phone';

const COUNTRY_LABELS: Record<CountryCode, string> = {
    '+970': 'فلسطين — غزة / الضفة',
    '+972': 'فلسطين — شبكات أخرى',
};

interface DeliveryPhoneInputProps {
    /** Current national digits (without country code). */
    national: string;
    onChangeNational: (national: string) => void;
    countryCode: CountryCode;
    onChangeCountryCode: (code: CountryCode) => void;
    /** Called whenever the canonical E.164 changes (null while invalid). */
    onE164Change?: (e164: string | null) => void;
    /** Show the inline validation error after a failed submit / blur. */
    showError?: boolean;
}

/**
 * Premium phone input for the driver auth screens. Country selector limited to
 * the markets we serve (+970 / +972), live 9-digit validation, and emits the
 * canonical E.164 so the screen never has to assemble the number itself.
 */
export default function DeliveryPhoneInput({
    national,
    onChangeNational,
    countryCode,
    onChangeCountryCode,
    onE164Change,
    showError,
}: DeliveryPhoneInputProps) {
    const { t } = useDeliveryT();
    const isRTL = useRTL();
    const [pickerOpen, setPickerOpen] = useState(false);
    const [touched, setTouched] = useState(false);

    const focusAnim = useSharedValue(0);
    const chevronRot = useSharedValue(0);

    const emit = useCallback(
        (code: CountryCode, value: string) => {
            onE164Change?.(toE164(code, value));
        },
        [onE164Change],
    );

    const handleChange = useCallback(
        (text: string) => {
            const clean = sanitizeNational(text);
            onChangeNational(clean);
            emit(countryCode, clean);
        },
        [countryCode, onChangeNational, emit],
    );

    const handleSelectCode = useCallback(
        (code: CountryCode) => {
            onChangeCountryCode(code);
            emit(code, national);
            setPickerOpen(false);
            chevronRot.value = withTiming(0, { duration: 180 });
        },
        [national, onChangeCountryCode, emit, chevronRot],
    );

    const openPicker = () => {
        setPickerOpen(true);
        chevronRot.value = withTiming(1, { duration: 180 });
    };

    const invalid = (showError || touched) && national.length > 0 && !isValidNational(national);

    const borderStyle = useAnimatedStyle(() => ({
        borderColor: invalid
            ? '#E53935'
            : focusAnim.value === 1
              ? '#F55905'
              : '#e5e5e5',
        borderWidth: 1.5,
    }));

    const chevronStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${chevronRot.value * 180}deg` }],
    }));

    const textAlign = isRTL ? 'right' : 'left';

    return (
        <View>
            <Animated.View
                style={[
                    borderStyle,
                    {
                        flexDirection: 'row',
                        alignItems: 'center',
                        borderRadius: 14,
                        backgroundColor: '#fafafa',
                        height: 52,
                        overflow: 'hidden',
                    },
                ]}
            >
                {/* Country code selector */}
                <TouchableOpacity
                    onPress={openPicker}
                    activeOpacity={0.7}
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 5,
                        paddingHorizontal: 12,
                        height: '100%',
                    }}
                >
                    <Text style={{ fontSize: 20 }}>🇵🇸</Text>
                    <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 14, color: '#1E1E1E' }}>
                        {countryCode}
                    </Text>
                    <Animated.View style={chevronStyle}>
                        <Ionicons name="chevron-down" size={12} color="#767777" />
                    </Animated.View>
                </TouchableOpacity>

                <View style={{ width: 1, height: 26, backgroundColor: '#e5e5e5' }} />

                <TextInput
                    value={national}
                    onChangeText={handleChange}
                    onFocus={() => {
                        focusAnim.value = withTiming(1, { duration: 180 });
                    }}
                    onBlur={() => {
                        focusAnim.value = withTiming(0, { duration: 180 });
                        setTouched(true);
                    }}
                    placeholder={t('register.phonePlaceholder')}
                    placeholderTextColor="#c0c0c0"
                    keyboardType="phone-pad"
                    maxLength={9}
                    style={{
                        flex: 1,
                        marginHorizontal: 12,
                        fontFamily: 'Tajawal_400Regular',
                        fontSize: 15,
                        color: '#1E1E1E',
                        textAlign,
                        letterSpacing: 1,
                    }}
                />
            </Animated.View>

            {invalid && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
                    <Ionicons name="alert-circle" size={13} color="#E53935" />
                    <Text style={{ fontFamily: 'Tajawal_400Regular', fontSize: 12, color: '#E53935', textAlign }}>
                        {t('register.phoneInvalid')}
                    </Text>
                </View>
            )}

            <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
                <Pressable
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}
                    onPress={() => setPickerOpen(false)}
                >
                    <Pressable
                        style={{
                            backgroundColor: '#fff',
                            borderTopLeftRadius: 24,
                            borderTopRightRadius: 24,
                            paddingTop: 14,
                            paddingBottom: 36,
                            paddingHorizontal: 20,
                        }}
                        onPress={() => {}}
                    >
                        <View style={{ alignItems: 'center', marginBottom: 16 }}>
                            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#e5e5e5' }} />
                        </View>

                        {COUNTRY_CODES.map((code) => {
                            const selected = code === countryCode;
                            return (
                                <TouchableOpacity
                                    key={code}
                                    onPress={() => handleSelectCode(code)}
                                    activeOpacity={0.7}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        paddingVertical: 14,
                                        paddingHorizontal: 16,
                                        borderRadius: 14,
                                        marginBottom: 8,
                                        backgroundColor: selected ? '#FFF3EE' : '#F7F7F7',
                                        borderWidth: selected ? 1.5 : 1,
                                        borderColor: selected ? '#F55905' : '#eeeeee',
                                    }}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        <Text style={{ fontSize: 26 }}>🇵🇸</Text>
                                        <View>
                                            <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 15, color: selected ? '#F55905' : '#1E1E1E' }}>
                                                {code}
                                            </Text>
                                            <Text style={{ fontFamily: 'Tajawal_400Regular', fontSize: 12, color: '#767777' }}>
                                                {COUNTRY_LABELS[code]}
                                            </Text>
                                        </View>
                                    </View>
                                    {selected && <Ionicons name="checkmark-circle" size={20} color="#F55905" />}
                                </TouchableOpacity>
                            );
                        })}
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
}

export { DEFAULT_COUNTRY_CODE };
