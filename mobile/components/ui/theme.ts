import { Platform } from "react-native";

export const colors = {
  primary: "#F55905",
  onPrimary: "#ffffff",
  surface: "#F7F7F7",
  onSurface: "#1E1E1E",
  surfaceContainer: "#eeeeee",
  surfaceContainerHighest: "#e5e5e5",
  outline: "#767777",
  error: "#b02500",
  card: "#ffffff",
  scrim: "rgba(30,30,30,0.42)",
  faintPrimary: "rgba(245,89,5,0.1)",
  softPrimary: "rgba(245,89,5,0.16)",
  softSurface: "rgba(255,255,255,0.82)",
} as const;

export const radii = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
  pill: 999,
} as const;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  xxl: 36,
} as const;

export const shadows = {
  card: {
    shadowColor: colors.onSurface,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
    elevation: 5,
  },
  soft: {
    shadowColor: colors.onSurface,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  primary: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: Platform.OS === "android" ? 0.22 : 0.18,
    shadowRadius: 18,
    elevation: 6,
  },
} as const;

export const typography = {
  headline: "Cairo_700Bold",
  headlineSemi: "Cairo_600SemiBold",
  body: "Tajawal_400Regular",
  bodyMedium: "Tajawal_500Medium",
  bodyBold: "Tajawal_700Bold",
} as const;

export const screen = {
  horizontal: 20,
  bottomTabSpace: 118,
} as const;
