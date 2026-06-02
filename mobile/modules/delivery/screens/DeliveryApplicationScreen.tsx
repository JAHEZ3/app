import React, { useCallback, useMemo, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    Image,
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, {
    DateTimePickerAndroid,
    DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AppButton from '@/components/ui/AppButton';
import { useDeliveryT } from '@/hooks/useAppTranslation';
import { useRTL } from '@/hooks/useRTL';
import { useSubmitDeliveryProfile } from '../hooks/useSubmitDeliveryProfile';
import { Toast, useToast } from '../components/Toast';
import LocationPickerModal, { PickedLocation } from '../components/LocationPickerModal';
import { DeliveryApplicationFormData, ImageAsset, PaymentFormData, PaymentType, VehicleType } from '../types';

// ─── Reusable sub-components ─────────────────────────────────────────────────

function SectionHeader({ icon, title, subtitle }: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle?: string;
}) {
    const isRTL = useRTL();
    const textAlign = isRTL ? 'right' : 'left';
    return (
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 12, marginBottom: 16, marginTop: 8 }}>
            <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: '#FFF5F0', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={icon} size={20} color="#F55905" />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 16, color: '#1E1E1E', textAlign }}>{title}</Text>
                {subtitle && (
                    <Text style={{ fontFamily: 'Tajawal_400Regular', fontSize: 12, color: '#767777', lineHeight: 18, textAlign }}>
                        {subtitle}
                    </Text>
                )}
            </View>
        </View>
    );
}

// ─── Date Picker ─────────────────────────────────────────────────────────────

// Computed once — represents "exactly 18 years ago today" at midnight.
function makeMaxDOB(): Date {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    d.setHours(0, 0, 0, 0);
    return d;
}
const MAX_DOB = makeMaxDOB();
const MIN_DOB = new Date(1940, 0, 1);

function toISODate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function fromISODate(iso: string): Date {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
}

function toDisplayDate(iso: string): string {
    if (!iso) return '';
    return fromISODate(iso).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
    });
}

function DatePickerField({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
    const { t } = useDeliveryT();
    const isRTL = useRTL();
    const [open, setOpen] = useState(false);

    // `pendingDate` tracks what is currently shown in the spinner/picker.
    // It is separate from `value` (the committed form value) so that:
    //   • On iOS the user can scroll freely and only commit on "Done".
    //   • Pressing "Cancel" / the backdrop discards the scroll position.
    //   • Pressing "Done" without scrolling still commits a sensible date.
    const [pendingDate, setPendingDate] = useState<Date>(MAX_DOB);

    const handleChange = useCallback((_: DateTimePickerEvent, selected?: Date) => {
        if (!selected) {
            return;
        }
        setPendingDate(selected);
        if (Platform.OS === 'android') {
            // Android native dialog: commit immediately.
            onChange(toISODate(selected));
        }
        // iOS spinner: keep the modal open; commit happens on "Done".
    }, [onChange]);

    const handleOpen = useCallback(() => {
        const nextDate = value ? fromISODate(value) : MAX_DOB;

        // Android's native dialog is more reliable when opened imperatively.
        if (Platform.OS === 'android') {
            setPendingDate(nextDate);
            DateTimePickerAndroid.open({
                value: nextDate,
                mode: 'date',
                display: 'calendar',
                maximumDate: MAX_DOB,
                minimumDate: MIN_DOB,
                onChange: handleChange,
            });
            return;
        }

        // iOS uses the bottom-sheet modal below.
        setPendingDate(nextDate);
        setOpen(true);
    }, [value, handleChange]);

    // iOS "Done" — commit whatever the spinner is currently showing.
    const handleDone = useCallback(() => {
        onChange(toISODate(pendingDate));
        setOpen(false);
    }, [pendingDate, onChange]);

    // iOS "Cancel" / backdrop tap — discard scroll, leave form value unchanged.
    const handleCancel = useCallback(() => setOpen(false), []);

    const displayLabel = value ? toDisplayDate(value) : t('application.selectDateOfBirth');

    return (
        <View style={{ marginBottom: 14 }}>
            <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 13, color: '#1E1E1E', marginBottom: 6 }}>
                {t('application.dateOfBirth')} <Text style={{ color: '#F55905' }}>*</Text>
            </Text>

            <TouchableOpacity
                onPress={handleOpen}
                style={{
                    flexDirection: 'row', alignItems: 'center',
                    borderWidth: 1.5,
                    borderColor: value ? '#F55905' : '#e5e5e5',
                    borderRadius: 14,
                    backgroundColor: value ? '#fffbf9' : '#fafafa',
                    paddingHorizontal: 14, height: 52,
                    gap: 10,
                }}
            >
                <Ionicons name="calendar-outline" size={18} color={value ? '#F55905' : '#c0c0c0'} />
                <Text style={{
                    flex: 1,
                    fontFamily: value ? 'Tajawal_500Medium' : 'Tajawal_400Regular',
                    fontSize: 14,
                    color: value ? '#1E1E1E' : '#c0c0c0',
                    textAlign: isRTL ? 'right' : 'left',
                }}>
                    {displayLabel}
                </Text>
                <Ionicons name={isRTL ? 'chevron-back' : 'chevron-down'} size={16} color="#c0c0c0" />
            </TouchableOpacity>

            {/* ── iOS: bottom-sheet modal with spinner ─────────────────────── */}
            {Platform.OS === 'ios' && (
                <Modal visible={open} transparent animationType="slide" statusBarTranslucent>
                    {/* Outer flex container is required for the backdrop + sheet
                        to lay out correctly inside a transparent Modal. */}
                    <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                        {/* Semi-transparent backdrop — tap to cancel */}
                        <TouchableOpacity
                            style={{
                                position: 'absolute',
                                top: 0, left: 0, right: 0, bottom: 0,
                                backgroundColor: 'rgba(0,0,0,0.45)',
                            }}
                            activeOpacity={1}
                            onPress={handleCancel}
                        />

                        {/* Bottom sheet */}
                        <View style={{
                            backgroundColor: '#fff',
                            borderTopLeftRadius: 24, borderTopRightRadius: 24,
                            paddingBottom: 36,
                        }}>
                            {/* Drag handle */}
                            <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 2 }}>
                                <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#e0e0e0' }} />
                            </View>

                            {/* Header: Cancel  |  Title  |  Done */}
                            <View style={{
                                flexDirection: 'row', alignItems: 'center',
                                justifyContent: 'space-between',
                                paddingHorizontal: 20, paddingVertical: 12,
                                borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
                            }}>
                                <TouchableOpacity
                                    onPress={handleCancel}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                    <Text style={{ fontFamily: 'Tajawal_400Regular', fontSize: 15, color: '#767777' }}>
                                        {t('application.cancel')}
                                    </Text>
                                </TouchableOpacity>

                                <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 16, color: '#1E1E1E' }}>
                                    {t('application.dateOfBirth')}
                                </Text>

                                <TouchableOpacity
                                    onPress={handleDone}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                    <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 15, color: '#F55905' }}>
                                        {t('application.done')}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {/* Spinner */}
                            <DateTimePicker
                                value={pendingDate}
                                mode="date"
                                display="spinner"
                                maximumDate={MAX_DOB}
                                minimumDate={MIN_DOB}
                                onChange={handleChange}
                                style={{ height: 216 }}
                            />
                        </View>
                    </View>
                </Modal>
            )}
        </View>
    );
}

// ─────────────────────────────────────────────────────────────────────────────

interface FieldProps {
    label: string;
    value: string;
    onChangeText: (t: string) => void;
    placeholder?: string;
    keyboardType?: 'default' | 'phone-pad' | 'numeric' | 'email-address';
    secureTextEntry?: boolean;
    multiline?: boolean;
    required?: boolean;
    icon?: keyof typeof Ionicons.glyphMap;
    rightSlot?: React.ReactNode;
}

function Field({
    label, value, onChangeText, placeholder,
    keyboardType = 'default', secureTextEntry, multiline,
    required, icon, rightSlot,
}: FieldProps) {
    const isRTL = useRTL();
    const [focused, setFocused] = useState(false);
    return (
        <View style={{ marginBottom: 14 }}>
            <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 13, color: '#1E1E1E', marginBottom: 6 }}>
                {label}{required && <Text style={{ color: '#F55905' }}> *</Text>}
            </Text>
            <View style={{
                flexDirection: isRTL ? 'row-reverse' : 'row',
                alignItems: multiline ? 'flex-start' : 'center',
                borderWidth: 1.5,
                borderColor: focused ? '#F55905' : '#e5e5e5',
                borderRadius: 14,
                backgroundColor: focused ? '#fffbf9' : '#fafafa',
                paddingHorizontal: 14,
                minHeight: multiline ? 88 : 52,
                paddingTop: multiline ? 12 : 0,
            }}>
                {icon && (
                    <Ionicons
                        name={icon} size={18}
                        color={focused ? '#F55905' : '#c0c0c0'}
                        style={{ marginRight: isRTL ? 0 : 10, marginLeft: isRTL ? 10 : 0, marginTop: multiline ? 2 : 0 }}
                    />
                )}
                <TextInput
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor="#c0c0c0"
                    keyboardType={keyboardType}
                    secureTextEntry={secureTextEntry}
                    multiline={multiline}
                    numberOfLines={multiline ? 3 : 1}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    style={{
                        flex: 1,
                        fontFamily: 'Tajawal_400Regular',
                        fontSize: 14,
                        color: '#1E1E1E',
                        textAlignVertical: multiline ? 'top' : 'center',
                        textAlign: isRTL ? 'right' : 'left',
                    }}
                />
                {rightSlot}
            </View>
        </View>
    );
}

function VehicleSelector({ value, onChange }: { value: VehicleType | ''; onChange: (v: VehicleType) => void }) {
    const { t } = useDeliveryT();
    const options: { value: VehicleType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
        { value: 'motorcycle', label: t('application.vehicles.motorcycle'), icon: 'bicycle' },
        { value: 'bicycle', label: t('application.vehicles.bicycle'), icon: 'bicycle' },
        { value: 'car', label: t('application.vehicles.car'), icon: 'car' },
        { value: 'on_foot', label: t('application.vehicles.onFoot'), icon: 'walk' },
    ];
    return (
        <View style={{ marginBottom: 14 }}>
            <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 13, color: '#1E1E1E', marginBottom: 8 }}>
                {t('application.fields.vehicleType')} <Text style={{ color: '#F55905' }}>*</Text>
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {options.map((opt) => {
                    const selected = value === opt.value;
                    return (
                        <TouchableOpacity
                            key={opt.value}
                            onPress={() => onChange(opt.value)}
                            style={{
                                flexDirection: 'row', alignItems: 'center', gap: 6,
                                paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
                                borderWidth: 1.5,
                                borderColor: selected ? '#F55905' : '#e5e5e5',
                                backgroundColor: selected ? '#FFF5F0' : '#fafafa',
                            }}
                        >
                            <Ionicons name={opt.icon} size={16} color={selected ? '#F55905' : '#767777'} />
                            <Text style={{ fontFamily: 'Tajawal_500Medium', fontSize: 13, color: selected ? '#F55905' : '#767777' }}>
                                {opt.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

/**
 * Tiny brand mark used inside the bank/wallet picker tiles. Just a coloured
 * pill with the first Arabic letter — keeps us off image bundling but still
 * gives each option a distinct visual identity.
 */
function BrandMark({ brand, size = 28 }: { brand: PaymentBrand; size?: number }) {
    return (
        <View
            style={{
                width: size, height: size, borderRadius: size / 4,
                backgroundColor: brand.bg, alignItems: 'center', justifyContent: 'center',
            }}
        >
            <Text style={{ color: '#fff', fontFamily: 'Cairo_700Bold', fontSize: size * 0.45 }}>
                {brand.mark}
            </Text>
        </View>
    );
}

function BrandPicker({
    label,
    options,
    value,
    onSelect,
}: {
    label: string;
    options: PaymentBrand[];
    value: string;
    onSelect: (v: string) => void;
}) {
    const isRTL = useRTL();
    return (
        <View style={{ marginBottom: 14 }}>
            <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 13, color: '#1E1E1E', marginBottom: 8, textAlign: isRTL ? 'right' : 'left' }}>
                {label} <Text style={{ color: '#F55905' }}>*</Text>
            </Text>
            <View style={{ gap: 8 }}>
                {options.map((opt) => {
                    const selected = value === opt.value;
                    return (
                        <TouchableOpacity
                            key={opt.value}
                            onPress={() => onSelect(opt.value)}
                            activeOpacity={0.85}
                            style={{
                                flexDirection: isRTL ? 'row-reverse' : 'row',
                                alignItems: 'center', gap: 12,
                                padding: 12, borderRadius: 14,
                                borderWidth: 1.5,
                                borderColor: selected ? '#F55905' : '#e5e5e5',
                                backgroundColor: selected ? '#FFF5F0' : '#fafafa',
                            }}
                        >
                            <BrandMark brand={opt} />
                            <View style={{ flex: 1 }}>
                                <Text style={{
                                    fontFamily: 'Cairo_700Bold', fontSize: 14,
                                    color: selected ? '#F55905' : '#1E1E1E',
                                    textAlign: isRTL ? 'right' : 'left',
                                }}>
                                    {opt.label}
                                </Text>
                                <Text style={{
                                    fontFamily: 'Tajawal_400Regular', fontSize: 11,
                                    color: selected ? '#F55905' : '#767777',
                                    textAlign: isRTL ? 'right' : 'left',
                                }} numberOfLines={1}>
                                    {opt.value}
                                </Text>
                            </View>
                            <View style={{
                                width: 20, height: 20, borderRadius: 10,
                                borderWidth: 1.5,
                                borderColor: selected ? '#F55905' : '#cfcfcf',
                                backgroundColor: selected ? '#F55905' : 'transparent',
                                alignItems: 'center', justifyContent: 'center',
                            }}>
                                {selected && <Ionicons name="checkmark" size={12} color="#fff" />}
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

function PaymentSelector({
    payment,
    onChange,
}: {
    payment: PaymentFormData;
    onChange: <K extends keyof PaymentFormData>(key: K, val: PaymentFormData[K]) => void;
}) {
    const { t } = useDeliveryT();
    const options: { value: PaymentType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
        { value: 'bank_account', label: t('application.paymentOptions.bankAccount'), icon: 'business-outline' },
        { value: 'wallet', label: t('application.paymentOptions.wallet'), icon: 'wallet-outline' },
    ];
    return (
        <View style={{ marginBottom: 14 }}>
            <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 13, color: '#1E1E1E', marginBottom: 8 }}>
                {t('application.fields.paymentMethod')} <Text style={{ color: '#F55905' }}>*</Text>
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                {options.map((opt) => {
                    const selected = payment.type === opt.value;
                    return (
                        <TouchableOpacity
                            key={opt.value}
                            onPress={() => onChange('type', opt.value)}
                            style={{
                                flex: 1, flexDirection: 'row', alignItems: 'center',
                                justifyContent: 'center', gap: 6,
                                paddingVertical: 12, borderRadius: 12,
                                borderWidth: 1.5,
                                borderColor: selected ? '#F55905' : '#e5e5e5',
                                backgroundColor: selected ? '#FFF5F0' : '#fafafa',
                            }}
                        >
                            <Ionicons name={opt.icon} size={16} color={selected ? '#F55905' : '#767777'} />
                            <Text style={{ fontFamily: 'Tajawal_500Medium', fontSize: 13, color: selected ? '#F55905' : '#767777' }}>
                                {opt.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {payment.type !== '' && (
                <Field
                    label={t('application.fields.accountHolderName')} required
                    value={payment.accountHolderName}
                    onChangeText={(v) => onChange('accountHolderName', v)}
                    placeholder={t('application.placeholders.accountHolderName')}
                    icon="person-outline"
                />
            )}

            {payment.type === 'bank_account' && (
                <>
                    <BrandPicker
                        label={t('application.fields.bankName')}
                        options={BANK_OPTIONS}
                        value={payment.bankName}
                        onSelect={(v) => onChange('bankName', v)}
                    />
                    <Field
                        label={t('application.fields.iban')} required
                        value={payment.iban}
                        onChangeText={(v) => onChange('iban', v)}
                        placeholder={t('application.placeholders.iban')}
                        icon="card-outline"
                    />
                    <Field
                        label={t('application.fields.accountNumber')} required
                        value={payment.accountNumber}
                        onChangeText={(v) => onChange('accountNumber', v)}
                        placeholder={t('application.placeholders.accountNumber')}
                        keyboardType="numeric"
                        icon="document-text-outline"
                    />
                </>
            )}

            {payment.type === 'wallet' && (
                <>
                    <BrandPicker
                        label={t('application.fields.walletType')}
                        options={WALLET_OPTIONS}
                        value={payment.walletType}
                        onSelect={(v) => onChange('walletType', v)}
                    />
                    <Field
                        label={t('application.fields.accountNumber')} required
                        value={payment.accountNumber}
                        onChangeText={(v) => onChange('accountNumber', v)}
                        placeholder={t('application.placeholders.accountNumber')}
                        keyboardType="numeric"
                        icon="document-text-outline"
                    />
                    <Field
                        label={t('application.fields.walletPhone')} required
                        value={payment.walletPhone}
                        onChangeText={(v) => onChange('walletPhone', v)}
                        placeholder={t('application.placeholders.walletPhone')}
                        keyboardType="phone-pad"
                        icon="phone-portrait-outline"
                    />
                </>
            )}
        </View>
    );
}

function ImagePickerField({
    label, value, onPick, required,
}: {
    label: string;
    value: ImageAsset | null;
    onPick: (asset: ImageAsset) => void;
    required?: boolean;
}) {
    const { t } = useDeliveryT();
    const [loading, setLoading] = useState(false);

    const pick = useCallback(async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert(t('application.picker.permissionRequiredTitle'), t('application.picker.permissionRequiredMessage'));
            return;
        }
        setLoading(true);
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                quality: 0.7,
                aspect: [4, 3],
            });
            if (!result.canceled && result.assets[0]) {
                const asset = result.assets[0];
                const filename = asset.uri.split('/').pop() ?? 'image.jpg';
                const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
                onPick({
                    uri: asset.uri,
                    type: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
                    name: filename,
                });
            }
        } finally {
            setLoading(false);
        }
    }, [onPick]);

    return (
        <View style={{ marginBottom: 14 }}>
            <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 13, color: '#1E1E1E', marginBottom: 8 }}>
                {label}{required && <Text style={{ color: '#F55905' }}> *</Text>}
            </Text>
            <TouchableOpacity
                onPress={pick}
                disabled={loading}
                style={{
                    borderWidth: 1.5,
                    borderColor: value ? '#F55905' : '#e5e5e5',
                    borderStyle: value ? 'solid' : 'dashed',
                    borderRadius: 14,
                    height: 110,
                    overflow: 'hidden',
                    backgroundColor: value ? '#000' : '#fafafa',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                {loading ? (
                    <ActivityIndicator color="#F55905" />
                ) : value ? (
                    <>
                        <Image
                            source={{ uri: value.uri }}
                            style={{ width: '100%', height: '100%', opacity: 0.85 }}
                            resizeMode="cover"
                        />
                        <View style={{
                            position: 'absolute', bottom: 0, left: 0, right: 0,
                            backgroundColor: 'rgba(0,0,0,0.5)', paddingVertical: 6, alignItems: 'center',
                        }}>
                            <Text style={{ fontFamily: 'Tajawal_500Medium', fontSize: 12, color: '#fff' }}>
                                {t('application.picker.changePhoto')}
                            </Text>
                        </View>
                    </>
                ) : (
                    <View style={{ alignItems: 'center', gap: 8 }}>
                        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF5F0', alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name="camera-outline" size={22} color="#F55905" />
                        </View>
                        <Text style={{ fontFamily: 'Tajawal_500Medium', fontSize: 13, color: '#767777' }}>
                            {t('application.picker.tapToUpload')}
                        </Text>
                        <Text style={{ fontFamily: 'Tajawal_400Regular', fontSize: 11, color: '#c0c0c0' }}>
                            {t('application.picker.maxSizeHint')}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
        </View>
    );
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function getSteps(t: ReturnType<typeof useDeliveryT>['t']) {
    return [
        t('application.steps.personal'),
        t('application.steps.vehicleContact'),
        t('application.steps.documents'),
    ];
}

function StepIndicator({ step, total }: { step: number; total: number }) {
    const isRTL = useRTL();
    return (
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16 }}>
            {Array.from({ length: total }).map((_, i) => {
                const done = i < step;
                const active = i === step;
                return (
                    <React.Fragment key={i}>
                        <View style={{
                            width: active ? 32 : 28,
                            height: active ? 32 : 28,
                            borderRadius: active ? 16 : 14,
                            backgroundColor: done || active ? '#F55905' : '#e5e5e5',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            {done ? (
                                <Ionicons name="checkmark" size={14} color="#fff" />
                            ) : (
                                <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 12, color: active ? '#fff' : '#767777' }}>
                                    {i + 1}
                                </Text>
                            )}
                        </View>
                        {i < total - 1 && (
                            <View style={{ flex: 1, height: 2, backgroundColor: done ? '#F55905' : '#e5e5e5', marginHorizontal: 4 }} />
                        )}
                    </React.Fragment>
                );
            })}
        </View>
    );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

const EMPTY_PAYMENT: PaymentFormData = {
    type: '',
    accountHolderName: '',
    bankName: '',
    iban: '',
    accountNumber: '',
    walletType: '',
    walletPhone: '',
};

// Brand catalogues — must stay in sync with the restaurant complete-profile
// page in `dashboard/src/app/(auth)/complete-profile/page.tsx`. The `value`
// field is the canonical key persisted to `payment_info.bankName` / `walletType`.
interface PaymentBrand {
    value: string;
    label: string;
    mark: string;
    bg: string;
}
const BANK_OPTIONS: PaymentBrand[] = [
    { value: 'Bank of Palestine',        label: 'بنك فلسطين',           mark: 'ف', bg: '#059669' },
    { value: 'Palestine Islamic Bank',   label: 'بنك فلسطين الإسلامي',  mark: 'إ', bg: '#0D9488' },
    { value: 'Arab Islamic Bank',        label: 'البنك الإسلامي العربي', mark: 'ع', bg: '#D97706' },
];
const WALLET_OPTIONS: PaymentBrand[] = [
    { value: 'PalPay',     label: 'PalPay',     mark: 'P', bg: '#0284C7' },
    { value: 'Jawwal Pay', label: 'Jawwal Pay', mark: 'J', bg: '#C026D3' },
];

// Fallback honesty questions, used when the server-side question bank is empty
// or the request fails — keeps the application unblocked. The same wording is
// what the seed inserts, so no surprise for the operator reviewing answers.
const FALLBACK_QUESTIONS: { question: string }[] = [
    { question: 'هل لديك خبرة سابقة في توصيل الطلبات أو في مجال مماثل؟ إذا نعم، اشرحها باختصار.' },
    { question: 'ما المدة اليومية التي يمكنك تخصيصها للعمل، وفي أي أوقات؟' },
    { question: 'هل توافق على الالتزام بقواعد التعامل مع العملاء والحفاظ على نظافة وسلامة الطلب؟' },
];

const EMPTY_FORM: DeliveryApplicationFormData = {
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    nationalIdNumber: '',
    city: '',
    vehicleType: '' as VehicleType,
    vehicleLicenseNumber: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    payment: EMPTY_PAYMENT,
    password: '',
    termsAccepted: false,
    answers: [],
    profilePicture: null,
    idPicture: null,
};

export default function DeliveryApplicationScreen() {
    const { t } = useDeliveryT();
    const isRTL = useRTL();
    const [step, setStep] = useState(0);
    const [form, setForm] = useState<DeliveryApplicationFormData>(EMPTY_FORM);
    const [showPassword, setShowPassword] = useState(false);
    const { toast, show: showToast, hide: hideToast } = useToast();

    const { mutateAsync: submit, isPending } = useSubmitDeliveryProfile();
    // Questions are always rendered in Arabic — the server-side bank is bypassed
    // because the agent app ships an Arabic-first applicant experience.
    const questions = FALLBACK_QUESTIONS;
    const questionsLoading = false;
    const steps = useMemo(() => getSteps(t), [t]);
    const [pickerOpen, setPickerOpen] = useState(false);

    const update = useCallback(<K extends keyof DeliveryApplicationFormData>(
        key: K,
        val: DeliveryApplicationFormData[K],
    ) => {
        setForm((prev) => ({ ...prev, [key]: val }));
    }, []);

    const updatePayment = useCallback(<K extends keyof PaymentFormData>(key: K, val: PaymentFormData[K]) => {
        setForm((prev) => ({ ...prev, payment: { ...prev.payment, [key]: val } }));
    }, []);

    // Always derived fresh from questions + user answers — no stale memo
    const answers = useMemo(
        () => questions.map((q) => ({
            question: q.question,
            answer: form.answers.find((a) => a.question === q.question)?.answer ?? '',
        })),
        [questions, form.answers],
    );

    const setAnswer = useCallback((question: string, answer: string) => {
        setForm((prev) => ({
            ...prev,
            answers: prev.answers.some((a) => a.question === question)
                ? prev.answers.map((a) => a.question === question ? { ...a, answer } : a)
                : [...prev.answers, { question, answer }],
        }));
    }, []);

    const validateStep = useCallback((): boolean => {
        if (step === 0) {
            if (!form.firstName.trim() || !form.lastName.trim()) {
                showToast(t('application.validation.nameRequired'), 'error'); return false;
            }
            if (!form.dateOfBirth) {
                showToast(t('application.validation.dateOfBirthRequired'), 'error'); return false;
            }
            if (!form.nationalIdNumber.trim()) {
                showToast(t('application.validation.nationalIdRequired'), 'error'); return false;
            }
            if (!form.city.trim()) {
                showToast(t('application.validation.cityRequired'), 'error'); return false;
            }
        }
        if (step === 1) {
            if (!form.vehicleType) {
                showToast(t('application.validation.vehicleTypeRequired'), 'error'); return false;
            }
            if (form.vehicleType === 'car' && !form.vehicleLicenseNumber?.trim()) {
                showToast(t('application.validation.licenseRequired'), 'error'); return false;
            }
            if (!form.emergencyContactName.trim() || !form.emergencyContactPhone.trim()) {
                showToast(t('application.validation.emergencyRequired'), 'error'); return false;
            }
            if (!form.payment.type) {
                showToast(t('application.validation.paymentMethodRequired'), 'error'); return false;
            }
            if (!form.payment.accountHolderName.trim()) {
                showToast(t('application.validation.accountHolderRequired'), 'error'); return false;
            }
            if (form.payment.type === 'bank_account') {
                if (!form.payment.bankName.trim()) {
                    showToast(t('application.validation.bankRequired'), 'error'); return false;
                }
                if (!form.payment.iban.trim()) {
                    showToast(t('application.validation.ibanRequired'), 'error'); return false;
                }
                if (!form.payment.accountNumber.trim()) {
                    showToast(t('application.validation.accountNumberRequired'), 'error'); return false;
                }
            } else if (form.payment.type === 'wallet') {
                if (!form.payment.walletType.trim()) {
                    showToast(t('application.validation.walletTypeRequired'), 'error'); return false;
                }
                if (!form.payment.accountNumber.trim()) {
                    showToast(t('application.validation.accountNumberRequired'), 'error'); return false;
                }
                if (!form.payment.walletPhone.trim()) {
                    showToast(t('application.validation.walletPhoneRequired'), 'error'); return false;
                }
            }
        }
        if (step === 2) {
            if (!form.profilePicture) {
                showToast(t('application.validation.profilePhotoRequired'), 'error'); return false;
            }
            if (!form.idPicture) {
                showToast(t('application.validation.nationalIdPhotoRequired'), 'error'); return false;
            }
            if (!form.password || form.password.length < 8) {
                showToast(t('application.validation.passwordRequired'), 'error'); return false;
            }
            if (!form.termsAccepted) {
                showToast(t('application.validation.termsRequired'), 'error'); return false;
            }
            // Fallback questions cover the questions-failed path, so the only
            // hard requirement now is that every visible question has an answer.
            const hasUnanswered = answers.some((a) => !a.answer.trim());
            if (hasUnanswered) {
                showToast(t('application.validation.questionsRequired'), 'error'); return false;
            }
        }
        return true;
    }, [step, form, questions, answers, showToast, t]);

    // Single handler — no stale-closure risk
    const handleNext = useCallback(async () => {
        if (!validateStep()) return;

        if (step < 2) {
            setStep((s) => s + 1);
            return;
        }

        // Submit
        try {
            await submit({ ...form, answers });
        } catch (err: unknown) {
            const axiosMsg =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            const msg = axiosMsg ?? (err instanceof Error ? err.message : t('application.submissionFailed'));
            showToast(msg, 'error');
        }
    }, [step, validateStep, form, answers, submit, showToast, t]);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F7F7F7' }} edges={['top', 'bottom']}>
            <StatusBar barStyle="dark-content" backgroundColor="#F7F7F7" />
            <Toast {...toast} onHide={hideToast} />

            <LocationPickerModal
                visible={pickerOpen}
                initial={null}
                onClose={() => setPickerOpen(false)}
                onConfirm={(loc: PickedLocation) => {
                    setForm((prev) => ({
                        ...prev,
                        city: loc.city || prev.city,
                    }));
                    setPickerOpen(false);
                }}
            />

            {/* Top bar */}
            <View style={{
                flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center',
                paddingHorizontal: 20, paddingVertical: 14,
                backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
            }}>
                {step > 0 ? (
                    <TouchableOpacity
                        onPress={() => setStep((s) => s - 1)}
                        style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#F7F7F7', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={20} color="#1E1E1E" />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#F7F7F7', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <Ionicons name="close" size={20} color="#1E1E1E" />
                    </TouchableOpacity>
                )}
                <View style={{ flex: 1, marginLeft: isRTL ? 0 : 12, marginRight: isRTL ? 12 : 0 }}>
                    <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 16, color: '#1E1E1E' }}>
                        {steps[step]}
                    </Text>
                    <Text style={{ fontFamily: 'Tajawal_400Regular', fontSize: 12, color: '#767777' }}>
                        {t('application.steps.stepLabel', { current: step + 1, total: steps.length })}
                    </Text>
                </View>
            </View>

            <StepIndicator step={step} total={steps.length} />

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* ── Step 0: Personal Info ── */}
                {step === 0 && (
                    <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 20 }}>
                        <SectionHeader icon="person-outline" title={t('application.sections.personalTitle')} subtitle={t('application.sections.personalSubtitle')} />
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={{ flex: 1 }}>
                                <Field
                                    label={t('application.fields.firstName')} required
                                    value={form.firstName}
                                    onChangeText={(v) => update('firstName', v)}
                                    placeholder={t('application.placeholders.firstName')}
                                    icon="person-outline"
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Field
                                    label={t('application.fields.lastName')} required
                                    value={form.lastName}
                                    onChangeText={(v) => update('lastName', v)}
                                    placeholder={t('application.placeholders.lastName')}
                                />
                            </View>
                        </View>
                        <DatePickerField
                            value={form.dateOfBirth}
                            onChange={(iso) => update('dateOfBirth', iso)}
                        />
                        <Field
                            label={t('application.fields.nationalIdNumber')} required
                            value={form.nationalIdNumber}
                            onChangeText={(v) => update('nationalIdNumber', v)}
                            placeholder={t('application.placeholders.nationalIdNumber')}
                            keyboardType="numeric"
                            icon="card-outline"
                        />
                        {/* Location picker — the agent's service area, set on a map. */}
                        <View style={{ marginBottom: 12 }}>
                            <Text style={{
                                fontFamily: 'Cairo_700Bold',
                                fontSize: 12,
                                color: '#1E1E1E',
                                marginBottom: 6,
                                textAlign: isRTL ? 'right' : 'left',
                            }}>
                                {t('application.fields.city')} <Text style={{ color: '#F55905' }}>*</Text>
                            </Text>
                            <TouchableOpacity
                                onPress={() => setPickerOpen(true)}
                                activeOpacity={0.85}
                                style={{
                                    flexDirection: isRTL ? 'row-reverse' : 'row',
                                    alignItems: 'center',
                                    gap: 10,
                                    borderWidth: 1.5,
                                    borderColor: form.city ? '#F55905' : '#e5e5e5',
                                    borderRadius: 14,
                                    backgroundColor: '#fafafa',
                                    paddingHorizontal: 12,
                                    paddingVertical: 12,
                                    minHeight: 52,
                                }}
                            >
                                <View style={{
                                    width: 34,
                                    height: 34,
                                    borderRadius: 10,
                                    backgroundColor: form.city ? '#F55905' : '#FFF5F0',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}>
                                    <Ionicons
                                        name="map-outline"
                                        size={18}
                                        color={form.city ? '#fff' : '#F55905'}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    {form.city ? (
                                        <Text style={{
                                            fontFamily: 'Cairo_700Bold',
                                            fontSize: 13,
                                            color: '#1E1E1E',
                                            textAlign: isRTL ? 'right' : 'left',
                                        }} numberOfLines={1}>
                                            {form.city}
                                        </Text>
                                    ) : (
                                        <Text style={{
                                            fontFamily: 'Tajawal_400Regular',
                                            fontSize: 13,
                                            color: '#9a9a9a',
                                            textAlign: isRTL ? 'right' : 'left',
                                        }}>
                                            {t('application.placeholders.city')}
                                        </Text>
                                    )}
                                </View>
                                <Ionicons
                                    name={isRTL ? 'chevron-back' : 'chevron-forward'}
                                    size={18}
                                    color="#c0c0c0"
                                />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* ── Step 1: Vehicle & Emergency Contact ── */}
                {step === 1 && (
                    <View style={{ gap: 16 }}>
                        <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 20 }}>
                            <SectionHeader icon="car-outline" title={t('application.sections.vehicleTitle')} />
                            <VehicleSelector
                                value={form.vehicleType}
                                onChange={(v) => update('vehicleType', v)}
                            />
                            {form.vehicleType === 'car' && (
                                <Field
                                    label={t('application.fields.vehicleLicenseNumber')} required
                                    value={form.vehicleLicenseNumber ?? ''}
                                    onChangeText={(v) => update('vehicleLicenseNumber', v)}
                                    placeholder={t('application.placeholders.vehicleLicenseNumber')}
                                    icon="document-text-outline"
                                />
                            )}
                        </View>

                        <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 20 }}>
                            <SectionHeader
                                icon="call-outline"
                                title={t('application.sections.emergencyTitle')}
                                subtitle={t('application.sections.emergencySubtitle')}
                            />
                            <Field
                                label={t('application.fields.contactName')} required
                                value={form.emergencyContactName}
                                onChangeText={(v) => update('emergencyContactName', v)}
                                placeholder={t('application.placeholders.contactName')}
                                icon="person-outline"
                            />
                            <Field
                                label={t('application.fields.contactPhone')} required
                                value={form.emergencyContactPhone}
                                onChangeText={(v) => update('emergencyContactPhone', v)}
                                placeholder={t('application.placeholders.contactPhone')}
                                keyboardType="phone-pad"
                                icon="phone-portrait-outline"
                            />
                        </View>

                        <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 20 }}>
                            <SectionHeader
                                icon="wallet-outline"
                                title={t('application.sections.paymentTitle')}
                                subtitle={t('application.sections.paymentSubtitle')}
                            />
                            <PaymentSelector payment={form.payment} onChange={updatePayment} />
                        </View>
                    </View>
                )}

                {/* ── Step 2: Documents, Questions, Password, Terms ── */}
                {step === 2 && (
                    <View style={{ gap: 16 }}>
                        <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 20 }}>
                            <SectionHeader
                                icon="images-outline"
                                title={t('application.sections.photosTitle')}
                                subtitle="Upload clear photos — max 5 MB each"
                            />
                            <ImagePickerField
                                label={t('application.fields.profilePhoto')} required
                                value={form.profilePicture}
                                onPick={(a) => update('profilePicture', a)}
                            />
                            <ImagePickerField
                                label={t('application.fields.nationalIdPhoto')} required
                                value={form.idPicture}
                                onPick={(a) => update('idPicture', a)}
                            />
                        </View>

                        <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 20 }}>
                            <SectionHeader
                                icon="help-circle-outline"
                                title={t('application.sections.questionsTitle')}
                                subtitle="Answer honestly — these help us know you better"
                            />
                            {questionsLoading ? (
                                <ActivityIndicator color="#F55905" style={{ marginVertical: 20 }} />
                            ) : (
                                answers.map((qa, idx) => (
                                    <View key={qa.question} style={{ marginBottom: 16 }}>
                                        <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 13, color: '#1E1E1E', marginBottom: 8, lineHeight: 20 }}>
                                            {idx + 1}. {qa.question}{' '}
                                            <Text style={{ color: '#F55905' }}>*</Text>
                                        </Text>
                                        <TextInput
                                            value={qa.answer}
                                            onChangeText={(v) => setAnswer(qa.question, v)}
                                            placeholder={t('application.placeholders.answer')}
                                            multiline
                                            numberOfLines={3}
                                            style={{
                                                borderWidth: 1.5, borderColor: '#e5e5e5', borderRadius: 14,
                                                padding: 12, fontFamily: 'Tajawal_400Regular', fontSize: 13,
                                                color: '#1E1E1E', backgroundColor: '#fafafa',
                                                textAlignVertical: 'top', minHeight: 80, textAlign: isRTL ? 'right' : 'left',
                                            }}
                                        />
                                    </View>
                                ))
                            )}
                        </View>

                        {/* Password */}
                        <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 20 }}>
                            <SectionHeader
                                icon="lock-closed-outline"
                                title={t('application.sections.passwordTitle')}
                                subtitle={t('application.sections.passwordSubtitle')}
                            />
                            <Field
                                label={t('application.fields.password')} required
                                value={form.password}
                                onChangeText={(v) => update('password', v)}
                                placeholder={t('application.placeholders.password')}
                                secureTextEntry={!showPassword}
                                icon="lock-closed-outline"
                                rightSlot={
                                    <TouchableOpacity onPress={() => setShowPassword((p) => !p)}>
                                        <Ionicons
                                            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                            size={18} color="#767777"
                                        />
                                    </TouchableOpacity>
                                }
                            />
                        </View>

                        {/* Terms */}
                        <TouchableOpacity
                            onPress={() => update('termsAccepted', !form.termsAccepted)}
                            style={{
                                flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'flex-start', gap: 12,
                                backgroundColor: '#fff', borderRadius: 16, padding: 16,
                            }}
                        >
                            <View style={{
                                width: 22, height: 22, borderRadius: 6, borderWidth: 2,
                                borderColor: form.termsAccepted ? '#F55905' : '#e5e5e5',
                                backgroundColor: form.termsAccepted ? '#F55905' : 'transparent',
                                alignItems: 'center', justifyContent: 'center', marginTop: 1,
                            }}>
                                {form.termsAccepted && <Ionicons name="checkmark" size={14} color="#fff" />}
                            </View>
                            <Text style={{ flex: 1, fontFamily: 'Tajawal_400Regular', fontSize: 13, color: '#767777', lineHeight: 20, textAlign: isRTL ? 'right' : 'left' }}>
                                {t('application.termsPrefix')}{' '}
                                <Text style={{ color: '#F55905', fontFamily: 'Tajawal_500Medium' }}>
                                    {t('application.termsLink')}
                                </Text>
                                {' '}{t('application.termsSuffix')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>

            {/* Bottom CTA */}
            <View style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                backgroundColor: '#fff', padding: 20,
                borderTopWidth: 1, borderTopColor: '#f0f0f0',
                shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.06, shadowRadius: 12, elevation: 10,
            }}>
                <AppButton
                    label={step < 2 ? t('application.continue') : t('application.submitApplication')}
                    onPress={handleNext}
                    loading={isPending}
                    disabled={isPending}
                    icon={
                        <Ionicons
                            name={step < 2 ? 'arrow-forward-circle-outline' : 'checkmark-circle-outline'}
                            size={22} color="#fff"
                        />
                    }
                    iconPosition="right"
                />
            </View>
        </SafeAreaView>
    );
}
