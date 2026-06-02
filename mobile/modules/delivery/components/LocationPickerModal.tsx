import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Appearance,
    Modal,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { PROVIDER_GOOGLE, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { LIGHT_THEME, DARK_THEME } from '@/modules/Order/tracking/mapStyles';
import { useDeliveryT } from '@/hooks/useAppTranslation';
import { useRTL } from '@/hooks/useRTL';

export interface PickedLocation {
    lat: number;
    lng: number;
    /** Reverse-geocoded city (or locality, region, subregion — whatever is available). */
    city: string;
    /** Best-effort full address line for UI display. */
    address?: string;
}

interface Props {
    visible: boolean;
    initial?: { lat: number; lng: number } | null;
    onClose: () => void;
    onConfirm: (loc: PickedLocation) => void;
}

const DEFAULT_REGION: Region = {
    // Gaza fallback so the map always renders something even before GPS.
    latitude: 31.5017,
    longitude: 34.4668,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
};

const buildCity = (place: Location.LocationGeocodedAddress | undefined): string => {
    if (!place) return '';
    return (
        place.city ||
        place.subregion ||
        place.region ||
        place.district ||
        place.country ||
        ''
    );
};

const buildAddress = (place: Location.LocationGeocodedAddress | undefined): string => {
    if (!place) return '';
    return [place.street, place.name, place.city, place.region, place.country]
        .filter(Boolean)
        .join(', ');
};

export default function LocationPickerModal({ visible, initial, onClose, onConfirm }: Props) {
    const { t } = useDeliveryT();
    const isRTL = useRTL();
    const writingDirection = isRTL ? 'rtl' : 'ltr';
    const scheme = useColorScheme() ?? Appearance.getColorScheme() ?? 'light';
    const theme = scheme === 'dark' ? DARK_THEME : LIGHT_THEME;

    const mapRef = useRef<MapView | null>(null);
    const reverseGeocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [center, setCenter] = useState<{ lat: number; lng: number } | null>(
        initial ?? null,
    );
    const [city, setCity] = useState('');
    const [address, setAddress] = useState('');
    const [permissionDenied, setPermissionDenied] = useState(false);
    const [geocoding, setGeocoding] = useState(false);

    const initialRegion: Region = initial
        ? { ...DEFAULT_REGION, latitude: initial.lat, longitude: initial.lng }
        : DEFAULT_REGION;

    // ── Get current GPS once on open if no initial point provided ───────────
    useEffect(() => {
        if (!visible || initial || center) return;
        let cancelled = false;
        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    if (!cancelled) setPermissionDenied(true);
                    return;
                }
                const loc = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                });
                if (cancelled) return;
                const next = { lat: loc.coords.latitude, lng: loc.coords.longitude };
                setCenter(next);
                mapRef.current?.animateToRegion(
                    { ...DEFAULT_REGION, latitude: next.lat, longitude: next.lng },
                    600,
                );
            } catch {
                /* swallow — user can still pick manually */
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [visible, initial, center]);

    // ── Reverse-geocode the centered point (debounced) ──────────────────────
    useEffect(() => {
        if (!center) return;
        if (reverseGeocodeTimer.current) clearTimeout(reverseGeocodeTimer.current);
        reverseGeocodeTimer.current = setTimeout(async () => {
            setGeocoding(true);
            try {
                const results = await Location.reverseGeocodeAsync({
                    latitude: center.lat,
                    longitude: center.lng,
                });
                const top = results[0];
                setCity(buildCity(top));
                setAddress(buildAddress(top));
            } catch {
                // Reverse-geocode fails on simulators / no-internet; keep prior text.
            } finally {
                setGeocoding(false);
            }
        }, 400);
        return () => {
            if (reverseGeocodeTimer.current) clearTimeout(reverseGeocodeTimer.current);
        };
    }, [center]);

    const handleRegionChangeComplete = useCallback((region: Region) => {
        setCenter({ lat: region.latitude, lng: region.longitude });
    }, []);

    const recenterToMe = useCallback(async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setPermissionDenied(true);
                return;
            }
            const loc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });
            const next = { lat: loc.coords.latitude, lng: loc.coords.longitude };
            mapRef.current?.animateToRegion(
                { ...DEFAULT_REGION, latitude: next.lat, longitude: next.lng },
                600,
            );
        } catch {
            /* ignore */
        }
    }, []);

    const handleConfirm = useCallback(() => {
        if (!center) return;
        onConfirm({ lat: center.lat, lng: center.lng, city, address });
    }, [center, city, address, onConfirm]);

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <View style={[styles.root, { backgroundColor: theme.surface }]}>
                <StatusBar
                    barStyle={theme.isDark ? 'light-content' : 'dark-content'}
                    translucent
                    backgroundColor="transparent"
                />

                <MapView
                    ref={(r) => { mapRef.current = r; }}
                    style={StyleSheet.absoluteFill}
                    provider={PROVIDER_GOOGLE}
                    initialRegion={initialRegion}
                    customMapStyle={theme.mapStyle}
                    showsCompass={false}
                    showsPointsOfInterest={false}
                    toolbarEnabled={false}
                    onRegionChangeComplete={handleRegionChangeComplete}
                />

                {/* Center-anchored pin — stays put while the map moves under it */}
                <View pointerEvents="none" style={styles.pinAnchor}>
                    <View style={[styles.pinBubble, { backgroundColor: '#F55905' }]}>
                        <Ionicons name="location" size={20} color="#fff" />
                    </View>
                    <View style={[styles.pinTip, { borderTopColor: '#F55905' }]} />
                    <View style={styles.pinShadow} />
                </View>

                {/* Top header */}
                <SafeAreaView pointerEvents="box-none" edges={['top']} style={styles.headerSafe}>
                    <View style={[styles.header, isRTL && styles.rowReverse]}>
                        <TouchableOpacity
                            onPress={onClose}
                            style={[styles.iconBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
                            accessibilityLabel={t('application.locationPicker.close')}
                        >
                            <Ionicons name="close" size={22} color={theme.onSurface} />
                        </TouchableOpacity>
                        <View style={[styles.headerTitleWrap, { backgroundColor: theme.card, borderColor: theme.border }]}>
                            <Text
                                style={[styles.headerTitle, { color: theme.onSurface, writingDirection }]}
                                numberOfLines={1}
                            >
                                {t('application.locationPicker.title')}
                            </Text>
                            <Text
                                style={[styles.headerSubtitle, { color: theme.outline, writingDirection }]}
                                numberOfLines={1}
                            >
                                {t('application.locationPicker.hint')}
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={recenterToMe}
                            style={[styles.iconBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
                            accessibilityLabel={t('application.locationPicker.useMyLocation')}
                        >
                            <Ionicons name="locate" size={20} color={theme.onSurface} />
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>

                {permissionDenied ? (
                    <View style={styles.banner}>
                        <View style={styles.bannerBubble}>
                            <Ionicons name="alert-circle" size={16} color="#fff" />
                            <Text style={styles.bannerText} numberOfLines={2}>
                                {t('application.locationPicker.permissionDenied')}
                            </Text>
                        </View>
                    </View>
                ) : null}

                {/* Bottom sheet with confirm */}
                <SafeAreaView pointerEvents="box-none" edges={['bottom']} style={styles.bottomSafe}>
                    <View style={[styles.bottomCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <View style={[styles.bottomTopRow, isRTL && styles.rowReverse]}>
                            <View style={styles.bottomIcon}>
                                <Ionicons name="map" size={18} color="#F55905" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text
                                    style={[styles.bottomLabel, { color: theme.outline, writingDirection }]}
                                    numberOfLines={1}
                                >
                                    {t('application.locationPicker.selectedLabel')}
                                </Text>
                                {geocoding ? (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                                        <ActivityIndicator size="small" color="#F55905" />
                                        <Text style={[styles.bottomValue, { color: theme.onSurface }]}>
                                            {t('application.locationPicker.finding')}
                                        </Text>
                                    </View>
                                ) : (
                                    <Text
                                        style={[styles.bottomValue, { color: theme.onSurface, writingDirection }]}
                                        numberOfLines={2}
                                    >
                                        {city || address || t('application.locationPicker.dragHint')}
                                    </Text>
                                )}
                            </View>
                        </View>

                        <TouchableOpacity
                            onPress={handleConfirm}
                            disabled={!center}
                            style={[styles.confirmBtn, !center && { opacity: 0.5 }]}
                        >
                            <Text style={styles.confirmBtnText}>
                                {t('application.locationPicker.confirm')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    rowReverse: { flexDirection: 'row-reverse' },
    headerSafe: { position: 'absolute', top: 0, left: 0, right: 0 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingTop: 8 },
    iconBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    headerTitleWrap: {
        flex: 1,
        height: 52,
        borderRadius: 18,
        paddingHorizontal: 14,
        justifyContent: 'center',
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    headerTitle: { fontFamily: 'Cairo_700Bold', fontSize: 14 },
    headerSubtitle: { fontFamily: 'Tajawal_400Regular', fontSize: 11, marginTop: 2 },
    pinAnchor: {
        position: 'absolute',
        left: '50%',
        top: '50%',
        marginLeft: -20,
        marginTop: -52,
        alignItems: 'center',
    },
    pinBubble: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: '#fff',
    },
    pinTip: {
        width: 0,
        height: 0,
        borderLeftWidth: 6,
        borderRightWidth: 6,
        borderTopWidth: 10,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        marginTop: -2,
    },
    pinShadow: {
        width: 12,
        height: 4,
        borderRadius: 6,
        backgroundColor: 'rgba(0,0,0,0.2)',
        marginTop: 4,
    },
    banner: { position: 'absolute', top: Platform.OS === 'ios' ? 110 : 80, left: 16, right: 16, alignItems: 'center' },
    bannerBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: '#B91C1C',
    },
    bannerText: { color: '#fff', fontFamily: 'Tajawal_500Medium', fontSize: 12, flexShrink: 1 },
    bottomSafe: { position: 'absolute', bottom: 0, left: 0, right: 0 },
    bottomCard: {
        marginHorizontal: 14,
        marginBottom: 12,
        padding: 14,
        borderRadius: 22,
        borderWidth: 1,
        gap: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.12,
        shadowRadius: 18,
        elevation: 8,
    },
    bottomTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    bottomIcon: {
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: '#FFF5F0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    bottomLabel: { fontFamily: 'Tajawal_400Regular', fontSize: 11 },
    bottomValue: { fontFamily: 'Cairo_700Bold', fontSize: 14, marginTop: 2 },
    confirmBtn: {
        backgroundColor: '#F55905',
        height: 50,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmBtnText: { color: '#fff', fontFamily: 'Cairo_700Bold', fontSize: 14 },
});
