/**
 * Google Maps `customMapStyle` JSON. Light style softens roads and POI noise;
 * dark style is tuned to match the app's primary orange accent.
 */

export const MAP_STYLE_LIGHT = [
    { elementType: "geometry", stylers: [{ color: "#f5f5f7" }] },
    { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f7" }] },
    {
        featureType: "administrative.land_parcel",
        elementType: "labels.text.fill",
        stylers: [{ color: "#bdbdbd" }],
    },
    {
        featureType: "poi",
        elementType: "geometry",
        stylers: [{ color: "#ececec" }],
    },
    {
        featureType: "poi.business",
        stylers: [{ visibility: "off" }],
    },
    {
        featureType: "poi.park",
        elementType: "geometry",
        stylers: [{ color: "#dfeede" }],
    },
    {
        featureType: "road",
        elementType: "geometry",
        stylers: [{ color: "#ffffff" }],
    },
    {
        featureType: "road.arterial",
        elementType: "labels.text.fill",
        stylers: [{ color: "#757575" }],
    },
    {
        featureType: "road.highway",
        elementType: "geometry",
        stylers: [{ color: "#FFE4D2" }],
    },
    {
        featureType: "road.highway",
        elementType: "labels.text.fill",
        stylers: [{ color: "#616161" }],
    },
    {
        featureType: "transit",
        stylers: [{ visibility: "off" }],
    },
    {
        featureType: "water",
        elementType: "geometry",
        stylers: [{ color: "#cfe5ff" }],
    },
];

export const MAP_STYLE_DARK = [
    { elementType: "geometry", stylers: [{ color: "#1c1c1f" }] },
    { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#a8a8b0" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#1c1c1f" }] },
    {
        featureType: "administrative.land_parcel",
        stylers: [{ visibility: "off" }],
    },
    {
        featureType: "poi",
        elementType: "geometry",
        stylers: [{ color: "#262629" }],
    },
    {
        featureType: "poi.business",
        stylers: [{ visibility: "off" }],
    },
    {
        featureType: "poi.park",
        elementType: "geometry",
        stylers: [{ color: "#1f2a1f" }],
    },
    {
        featureType: "road",
        elementType: "geometry",
        stylers: [{ color: "#2a2a2e" }],
    },
    {
        featureType: "road.arterial",
        elementType: "labels.text.fill",
        stylers: [{ color: "#9a9aa0" }],
    },
    {
        featureType: "road.highway",
        elementType: "geometry",
        stylers: [{ color: "#3a2418" }],
    },
    {
        featureType: "road.highway",
        elementType: "labels.text.fill",
        stylers: [{ color: "#F55905" }],
    },
    {
        featureType: "transit",
        stylers: [{ visibility: "off" }],
    },
    {
        featureType: "water",
        elementType: "geometry",
        stylers: [{ color: "#0c1a2e" }],
    },
];

export interface TrackingTheme {
    isDark: boolean;
    mapStyle: typeof MAP_STYLE_LIGHT;
    surface: string;
    card: string;
    onSurface: string;
    outline: string;
    border: string;
    /** Color of the route polyline drawn from driver → drop-off. */
    routeStroke: string;
    /** Color of the destination pin. */
    destinationStroke: string;
    /** Background of the "Live" pill. */
    liveBg: string;
    liveDot: string;
    liveText: string;
    scrim: string;
}

export const LIGHT_THEME: TrackingTheme = {
    isDark: false,
    mapStyle: MAP_STYLE_LIGHT,
    surface: "#F7F7F7",
    card: "#FFFFFF",
    onSurface: "#1E1E1E",
    outline: "#767777",
    border: "#EFEFEF",
    routeStroke: "#F55905",
    destinationStroke: "#1E1E1E",
    liveBg: "#D9F5E2",
    liveDot: "#0F7A36",
    liveText: "#0F7A36",
    scrim: "rgba(0,0,0,0.04)",
};

export const DARK_THEME: TrackingTheme = {
    isDark: true,
    mapStyle: MAP_STYLE_DARK,
    surface: "#0F0F11",
    card: "#1C1C1F",
    onSurface: "#F5F5F7",
    outline: "#8E8E94",
    border: "#2A2A2E",
    routeStroke: "#FF7A2B",
    destinationStroke: "#F5F5F7",
    liveBg: "rgba(15,122,54,0.20)",
    liveDot: "#3DDC84",
    liveText: "#3DDC84",
    scrim: "rgba(255,255,255,0.04)",
};
