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
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AppButton from '@/components/ui/AppButton';
import { useSubmitDeliveryProfile } from '../hooks/useSubmitDeliveryProfile';
import { useGetDeliveryQuestions } from '../hooks/useGetDeliveryQuestions';
import { Toast, useToast } from '../components/Toast';
import { DeliveryApplicationFormData, ImageAsset, PaymentFormData, PaymentType, VehicleType } from '../types';

// ─── Reusable sub-components ─────────────────────────────────────────────────

function SectionHeader({ icon, title, subtitle }: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle?: string;
}) {
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, marginTop: 8 }}>
            <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: '#FFF5F0', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={icon} size={20} color="#F55905" />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 16, color: '#1E1E1E' }}>{title}</Text>
                {subtitle && (
                    <Text style={{ fontFamily: 'Tajawal_400Regular', fontSize: 12, color: '#767777', lineHeight: 18 }}>
                        {subtitle}
                    </Text>
                )}
            </View>
        </View>
    );
}

// ─── Date Picker ─────────────────────────────────────────────────────────────

const MAX_DOB = new Date();
MAX_DOB.setFullYear(MAX_DOB.getFullYear() - 18); // must be 18+

function toISODate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function toDisplayDate(iso: string): string {
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
    });
}

function DatePickerField({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
    const [open, setOpen] = useState(false);

    // The live date used by the picker control (defaults to max allowed age)
    const pickerDate = value
        ? (() => { const [y, m, d] = value.split('-').map(Number); return new Date(y, m - 1, d); })()
        : MAX_DOB;

    const handleChange = useCallback((_: DateTimePickerEvent, selected?: Date) => {
        if (Platform.OS === 'android') setOpen(false);
        if (selected) onChange(toISODate(selected));
    }, [onChange]);

    const displayLabel = value ? toDisplayDate(value) : 'Select your date of birth';

    return (
        <View style={{ marginBottom: 14 }}>
            <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 13, color: '#1E1E1E', marginBottom: 6 }}>
                Date of Birth <Text style={{ color: '#F55905' }}>*</Text>
            </Text>

            <TouchableOpacity
                onPress={() => setOpen(true)}
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
                }}>
                    {displayLabel}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#c0c0c0" />
            </TouchableOpacity>

            {/* Android: picker renders as native dialog — just mount it when open */}
            {Platform.OS === 'android' && open && (
                <DateTimePicker
                    value={pickerDate}
                    mode="date"
                    display="default"
                    maximumDate={MAX_DOB}
                    minimumDate={new Date(1940, 0, 1)}
                    onChange={handleChange}
                />
            )}

            {/* iOS: wrap in a bottom-sheet modal for consistent UX */}
            {Platform.OS === 'ios' && (
                <Modal visible={open} transparent animationType="slide">
                    <TouchableOpacity
                        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
                        activeOpacity={1}
                        onPress={() => setOpen(false)}
                    />
                    <View style={{
                        backgroundColor: '#fff',
                        borderTopLeftRadius: 24, borderTopRightRadius: 24,
                        paddingBottom: 32,
                    }}>
                        {/* Handle + header */}
                        <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
                            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#e5e5e5' }} />
                        </View>
                        <View style={{
                            flexDirection: 'row', alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingHorizontal: 20, paddingVertical: 12,
                            borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
                        }}>
                            <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 16, color: '#1E1E1E' }}>
                                Date of Birth
                            </Text>
                            <TouchableOpacity
                                onPress={() => setOpen(false)}
                                style={{
                                    backgroundColor: '#F55905', borderRadius: 20,
                                    paddingHorizontal: 18, paddingVertical: 8,
                                }}
                            >
                                <Text style={{ fontFamily: 'Tajawal_500Medium', fontSize: 14, color: '#fff' }}>
                                    Done
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <DateTimePicker
                            value={pickerDate}
                            mode="date"
                            display="spinner"
                            maximumDate={MAX_DOB}
                            minimumDate={new Date(1940, 0, 1)}
                            onChange={handleChange}
                            style={{ height: 200 }}
                        />
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
    const [focused, setFocused] = useState(false);
    return (
        <View style={{ marginBottom: 14 }}>
            <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 13, color: '#1E1E1E', marginBottom: 6 }}>
                {label}{required && <Text style={{ color: '#F55905' }}> *</Text>}
            </Text>
            <View style={{
                flexDirection: 'row',
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
                        style={{ marginRight: 10, marginTop: multiline ? 2 : 0 }}
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
                    }}
                />
                {rightSlot}
            </View>
        </View>
    );
}

const VEHICLE_OPTIONS: { value: VehicleType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { value: 'motorcycle', label: 'Motorcycle', icon: 'bicycle' },
    { value: 'bicycle', label: 'Bicycle', icon: 'bicycle' },
    { value: 'car', label: 'Car', icon: 'car' },
    { value: 'on_foot', label: 'On Foot', icon: 'walk' },
];

function VehicleSelector({ value, onChange }: { value: VehicleType | ''; onChange: (v: VehicleType) => void }) {
    return (
        <View style={{ marginBottom: 14 }}>
            <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 13, color: '#1E1E1E', marginBottom: 8 }}>
                Vehicle Type <Text style={{ color: '#F55905' }}>*</Text>
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {VEHICLE_OPTIONS.map((opt) => {
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

const PAYMENT_OPTIONS: { value: PaymentType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { value: 'bank_account', label: 'Bank Account', icon: 'business-outline' },
    { value: 'wallet', label: 'Wallet', icon: 'wallet-outline' },
];

function PaymentSelector({
    payment,
    onChange,
}: {
    payment: PaymentFormData;
    onChange: <K extends keyof PaymentFormData>(key: K, val: PaymentFormData[K]) => void;
}) {
    return (
        <View style={{ marginBottom: 14 }}>
            <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 13, color: '#1E1E1E', marginBottom: 8 }}>
                Payment Method <Text style={{ color: '#F55905' }}>*</Text>
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                {PAYMENT_OPTIONS.map((opt) => {
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

            {payment.type === 'bank_account' && (
                <>
                    <Field
                        label="Bank Name" required
                        value={payment.bankName}
                        onChangeText={(v) => onChange('bankName', v)}
                        placeholder="e.g. Al Rajhi Bank"
                        icon="business-outline"
                    />
                    <Field
                        label="IBAN" required
                        value={payment.iban}
                        onChangeText={(v) => onChange('iban', v)}
                        placeholder="SA00 0000 0000 0000 0000 0000"
                        icon="card-outline"
                    />
                    <Field
                        label="Account Number"
                        value={payment.accountNumber}
                        onChangeText={(v) => onChange('accountNumber', v)}
                        placeholder="Optional"
                        keyboardType="numeric"
                        icon="document-text-outline"
                    />
                </>
            )}

            {payment.type === 'wallet' && (
                <Field
                    label="Wallet Number" required
                    value={payment.walletNumber}
                    onChangeText={(v) => onChange('walletNumber', v)}
                    placeholder="+966 5X XXX XXXX"
                    keyboardType="phone-pad"
                    icon="phone-portrait-outline"
                />
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
    const [loading, setLoading] = useState(false);

    const pick = useCallback(async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Please allow access to your photo library.');
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
                                Tap to change
                            </Text>
                        </View>
                    </>
                ) : (
                    <View style={{ alignItems: 'center', gap: 8 }}>
                        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF5F0', alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name="camera-outline" size={22} color="#F55905" />
                        </View>
                        <Text style={{ fontFamily: 'Tajawal_500Medium', fontSize: 13, color: '#767777' }}>
                            Tap to upload
                        </Text>
                        <Text style={{ fontFamily: 'Tajawal_400Regular', fontSize: 11, color: '#c0c0c0' }}>
                            Max 5 MB · JPG, PNG
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
        </View>
    );
}

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEPS = ['Personal Info', 'Vehicle & Contact', 'Documents'];

function StepIndicator({ step, total }: { step: number; total: number }) {
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16 }}>
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
    bankName: '',
    iban: '',
    accountNumber: '',
    walletNumber: '',
};

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
    const [step, setStep] = useState(0);
    const [form, setForm] = useState<DeliveryApplicationFormData>(EMPTY_FORM);
    const [showPassword, setShowPassword] = useState(false);
    const { toast, show: showToast, hide: hideToast } = useToast();

    const { mutateAsync: submit, isPending } = useSubmitDeliveryProfile();
    const { data: questions = [], isLoading: questionsLoading, isError: questionsError } = useGetDeliveryQuestions();

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
                showToast('First and last name are required.', 'error'); return false;
            }
            if (!form.dateOfBirth) {
                showToast('Please select your date of birth.', 'error'); return false;
            }
            if (!form.nationalIdNumber.trim()) {
                showToast('National ID number is required.', 'error'); return false;
            }
            if (!form.city.trim()) {
                showToast('City is required.', 'error'); return false;
            }
        }
        if (step === 1) {
            if (!form.vehicleType) {
                showToast('Please select a vehicle type.', 'error'); return false;
            }
            if (form.vehicleType === 'car' && !form.vehicleLicenseNumber?.trim()) {
                showToast('License number is required for car.', 'error'); return false;
            }
            if (!form.emergencyContactName.trim() || !form.emergencyContactPhone.trim()) {
                showToast('Emergency contact name and phone are required.', 'error'); return false;
            }
            if (!form.payment.type) {
                showToast('Please select a payment method.', 'error'); return false;
            }
            if (form.payment.type === 'bank_account') {
                if (!form.payment.bankName.trim() || !form.payment.iban.trim()) {
                    showToast('Bank name and IBAN are required.', 'error'); return false;
                }
            } else if (form.payment.type === 'wallet') {
                if (!form.payment.walletNumber.trim()) {
                    showToast('Wallet number is required.', 'error'); return false;
                }
            }
        }
        if (step === 2) {
            if (!form.profilePicture) {
                showToast('Please upload your profile photo.', 'error'); return false;
            }
            if (!form.idPicture) {
                showToast('Please upload your national ID photo.', 'error'); return false;
            }
            if (!form.password || form.password.length < 8) {
                showToast('Password must be at least 8 characters.', 'error'); return false;
            }
            if (!form.termsAccepted) {
                showToast('Please accept the terms and conditions.', 'error'); return false;
            }
            // Guard: questions must have loaded and all 3 must be answered
            if (questionsError || questions.length === 0) {
                showToast('Questions failed to load. Please go back and try again.', 'error'); return false;
            }
            const hasUnanswered = answers.some((a) => !a.answer.trim());
            if (hasUnanswered) {
                showToast('Please answer all application questions.', 'error'); return false;
            }
        }
        return true;
    }, [step, form, questions, answers, questionsError, showToast]);

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
            const msg = axiosMsg ?? (err instanceof Error ? err.message : 'Submission failed. Please try again.');
            showToast(msg, 'error');
        }
    }, [step, validateStep, form, answers, submit, showToast]);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F7F7F7' }} edges={['top', 'bottom']}>
            <StatusBar barStyle="dark-content" backgroundColor="#F7F7F7" />
            <Toast {...toast} onHide={hideToast} />

            {/* Top bar */}
            <View style={{
                flexDirection: 'row', alignItems: 'center',
                paddingHorizontal: 20, paddingVertical: 14,
                backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
            }}>
                {step > 0 ? (
                    <TouchableOpacity
                        onPress={() => setStep((s) => s - 1)}
                        style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#F7F7F7', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <Ionicons name="arrow-back" size={20} color="#1E1E1E" />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#F7F7F7', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <Ionicons name="close" size={20} color="#1E1E1E" />
                    </TouchableOpacity>
                )}
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 16, color: '#1E1E1E' }}>
                        {STEPS[step]}
                    </Text>
                    <Text style={{ fontFamily: 'Tajawal_400Regular', fontSize: 12, color: '#767777' }}>
                        Step {step + 1} of {STEPS.length}
                    </Text>
                </View>
            </View>

            <StepIndicator step={step} total={STEPS.length} />

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* ── Step 0: Personal Info ── */}
                {step === 0 && (
                    <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 20 }}>
                        <SectionHeader icon="person-outline" title="Personal Information" subtitle="Fill in your personal details" />
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={{ flex: 1 }}>
                                <Field
                                    label="First Name" required
                                    value={form.firstName}
                                    onChangeText={(v) => update('firstName', v)}
                                    placeholder="Ahmad"
                                    icon="person-outline"
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Field
                                    label="Last Name" required
                                    value={form.lastName}
                                    onChangeText={(v) => update('lastName', v)}
                                    placeholder="Al-Rashidi"
                                />
                            </View>
                        </View>
                        <DatePickerField
                            value={form.dateOfBirth}
                            onChange={(iso) => update('dateOfBirth', iso)}
                        />
                        <Field
                            label="National ID Number" required
                            value={form.nationalIdNumber}
                            onChangeText={(v) => update('nationalIdNumber', v)}
                            placeholder="1XXXXXXXXX"
                            keyboardType="numeric"
                            icon="card-outline"
                        />
                        <Field
                            label="City" required
                            value={form.city}
                            onChangeText={(v) => update('city', v)}
                            placeholder="Riyadh"
                            icon="location-outline"
                        />
                    </View>
                )}

                {/* ── Step 1: Vehicle & Emergency Contact ── */}
                {step === 1 && (
                    <View style={{ gap: 16 }}>
                        <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 20 }}>
                            <SectionHeader icon="car-outline" title="Vehicle Details" />
                            <VehicleSelector
                                value={form.vehicleType}
                                onChange={(v) => update('vehicleType', v)}
                            />
                            {form.vehicleType === 'car' && (
                                <Field
                                    label="Vehicle License Number" required
                                    value={form.vehicleLicenseNumber ?? ''}
                                    onChangeText={(v) => update('vehicleLicenseNumber', v)}
                                    placeholder="ABC-1234"
                                    icon="document-text-outline"
                                />
                            )}
                        </View>

                        <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 20 }}>
                            <SectionHeader
                                icon="call-outline"
                                title="Emergency Contact"
                                subtitle="Someone we can reach in case of emergency"
                            />
                            <Field
                                label="Contact Name" required
                                value={form.emergencyContactName}
                                onChangeText={(v) => update('emergencyContactName', v)}
                                placeholder="Full name"
                                icon="person-outline"
                            />
                            <Field
                                label="Contact Phone" required
                                value={form.emergencyContactPhone}
                                onChangeText={(v) => update('emergencyContactPhone', v)}
                                placeholder="+966 5X XXX XXXX"
                                keyboardType="phone-pad"
                                icon="phone-portrait-outline"
                            />
                        </View>

                        <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 20 }}>
                            <SectionHeader
                                icon="wallet-outline"
                                title="Payment Info"
                                subtitle="How would you like to receive your earnings?"
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
                                title="Photos & Documents"
                                subtitle="Upload clear photos — max 5 MB each"
                            />
                            <ImagePickerField
                                label="Profile Photo" required
                                value={form.profilePicture}
                                onPick={(a) => update('profilePicture', a)}
                            />
                            <ImagePickerField
                                label="National ID Photo" required
                                value={form.idPicture}
                                onPick={(a) => update('idPicture', a)}
                            />
                        </View>

                        <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 20 }}>
                            <SectionHeader
                                icon="help-circle-outline"
                                title="Application Questions"
                                subtitle="Answer honestly — these help us know you better"
                            />
                            {questionsLoading ? (
                                <ActivityIndicator color="#F55905" style={{ marginVertical: 20 }} />
                            ) : questionsError || questions.length === 0 ? (
                                <View style={{ alignItems: 'center', paddingVertical: 16, gap: 8 }}>
                                    <Ionicons name="alert-circle-outline" size={28} color="#b02500" />
                                    <Text style={{ fontFamily: 'Tajawal_400Regular', fontSize: 13, color: '#b02500', textAlign: 'center' }}>
                                        Failed to load questions. Please go back and try again.
                                    </Text>
                                </View>
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
                                            placeholder="Your answer..."
                                            multiline
                                            numberOfLines={3}
                                            style={{
                                                borderWidth: 1.5, borderColor: '#e5e5e5', borderRadius: 14,
                                                padding: 12, fontFamily: 'Tajawal_400Regular', fontSize: 13,
                                                color: '#1E1E1E', backgroundColor: '#fafafa',
                                                textAlignVertical: 'top', minHeight: 80,
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
                                title="Set Password"
                                subtitle="Create a password for future logins"
                            />
                            <Field
                                label="Password" required
                                value={form.password}
                                onChangeText={(v) => update('password', v)}
                                placeholder="Minimum 8 characters"
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
                                flexDirection: 'row', alignItems: 'flex-start', gap: 12,
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
                            <Text style={{ flex: 1, fontFamily: 'Tajawal_400Regular', fontSize: 13, color: '#767777', lineHeight: 20 }}>
                                I agree to the{' '}
                                <Text style={{ color: '#F55905', fontFamily: 'Tajawal_500Medium' }}>
                                    Terms and Conditions
                                </Text>
                                {' '}and confirm all provided information is accurate.
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
                    label={step < 2 ? 'Continue' : 'Submit Application'}
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
