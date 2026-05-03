# JAHEZ Mobile — Project Reference

## Tech Stack

| Layer | Library |
|---|---|
| Framework | React Native 0.81 + Expo ~54 |
| Routing | Expo Router v6 (file-based) |
| Language | TypeScript ~5.9 |
| Styling | NativeWind v4 (Tailwind CSS) |
| Server state | TanStack React Query v5 |
| Client state | Zustand v5 |
| HTTP | Axios v1 |
| i18n | i18next + react-i18next |
| Fonts | Cairo, Tajawal (expo-google-fonts) |
| Storage | expo-secure-store |
| React | 19.1 |

---

## Directory Layout

```
app/mobile/
├── app/                    # Expo Router screens (file-based routing)
│   ├── _layout.tsx         # Root layout — providers, fonts, splash guard
│   ├── index.tsx           # Entry → SplashScreen
│   ├── onboarding.tsx
│   ├── auth/
│   │   ├── login.tsx
│   │   ├── otp.tsx
│   │   ├── terms.tsx
│   │   └── complete-profile.tsx
│   ├── home/
│   │   └── Home.tsx
│   └── delivery/
│       ├── _layout.tsx     # Delivery sub-stack
│       ├── index.tsx       # Delivery entry / guard
│       ├── register.tsx
│       ├── otp.tsx
│       ├── application.tsx
│       ├── pending.tsx
│       ├── rejected.tsx
│       └── dashboard.tsx
├── modules/                # Feature modules
│   ├── Auth/
│   ├── Profile/
│   ├── Onboarding/
│   └── delivery/
├── components/
│   ├── protectedRoute.tsx
│   └── ui/
│       ├── AppButton.tsx
│       ├── AppText.tsx
│       └── LanguageSwitcher.tsx
├── store/                  # Zustand stores
├── hooks/                  # Global hooks
├── lib/
│   ├── api.ts              # Axios instances + interceptors
│   └── i18n.ts             # i18next setup
├── locales/
│   ├── en/  {common, auth, home, profile, orders, delivery}.json
│   └── ar/  {common, auth, home, profile, orders, delivery}.json
└── types/
```

---

## Module Architecture

Each feature module follows this internal layout:

```
modules/<Feature>/
├── index.tsx           # Context + createXModule() factory
├── repository/
│   ├── XRepository.ts  # Interface (contract)
│   └── restRepository.ts  # Axios implementation
├── entities/           # Domain model
├── dto/                # API response shape
├── adapter/            # DTO → entity mapping
├── hooks/              # React Query hooks (useX)
├── screens/            # UI screens
├── components/         # Module-local components
└── types/              # Module-local types
```

### Module factory pattern

Every module exposes a `createXModule()` factory that builds the repository and wraps it in a React Context `Provider`. This is the only DI mechanism — screens get the repository via `useX()`:

```ts
// _layout.tsx
const { Provider: AuthProvider } = createAuthModule();
const { Provider: DeliveryProvider } = createDeliveryModule();
```

```ts
// inside a hook
const repo = useDelivery(); // throws if called outside DeliveryProvider
```

---

## Navigation Flow

```
index (SplashScreen)
  ├── Onboarding (first launch)
  └── auth/login
        └── auth/otp
              └── auth/complete-profile
                    └── home/Home

delivery/index (DeliveryGuard — status-based routing)
  ├── delivery/register → delivery/otp → delivery/application
  ├── delivery/pending   (PENDING_APPROVAL)
  ├── delivery/rejected  (REJECTED)
  └── delivery/dashboard (ACTIVE)
```

The delivery entry screen acts as a guard: it reads `lastKnownStatus` from `useDeliveryStore` and redirects accordingly. `gestureEnabled: false` is used on all one-way steps.

---

## State Management

### Zustand stores (`store/`)

| Store | Purpose |
|---|---|
| `useAuthStore` | Customer `accessToken` + `AuthStatus` |
| `useDeliveryStore` | Delivery agent `accessToken`, `authStatus`, `lastKnownStatus` |
| `useLanguageStore` | Active language (`ar`/`en`) |
| `useOnboardingStore` | First-launch flag |
| `usePhoneNumber` | Temp phone during customer auth flow |
| `useDeliveryPhoneStore` | Temp phone during delivery auth flow |

`lastKnownStatus` is intentionally **not cleared** on `clearTokens()` — it lets the guard route instantly after re-auth without a server round-trip.

---

## HTTP & Token Refresh

`lib/api.ts` exports three Axios instances:

| Instance | Base URL env var | Used by |
|---|---|---|
| `authApi` | `EXPO_PUBLIC_API_URL_AUTH` | Auth endpoints, token refresh |
| `customerApi` | `EXPO_PUBLIC_API_URL_CUSTOMER` | Customer data |
| `deliveryApi` | `EXPO_PUBLIC_API_URL_DELIVERY` | Delivery agent API |

Both `customerApi` and `deliveryApi` implement **silent token refresh with a pending queue**: when a 401 arrives, the first failing request triggers a refresh call; all other concurrent requests are paused and re-played with the new token once it arrives. Tokens are persisted via `expo-secure-store` (`refreshToken` / `deliveryRefreshToken`).

`deliveryApi`'s interceptor uses a lazy `require()` for `useDeliveryStore` to avoid circular imports at module load time.

---

## i18n

- Supported: `ar` (Arabic, RTL) and `en` (English, LTR)
- Namespaces: `common`, `auth`, `home`, `profile`, `orders`, `delivery`
- Namespaces are **lazy-loaded** via `i18next-resources-to-backend`
- RTL is managed manually per component using `useRTL()` hook (system-level RTL is disabled via `I18nManager.forceRTL(false)`)
- Use `useAppTranslation()` / `useDeliveryT()` hooks — do not call `useTranslation()` directly

---

## Delivery Module

The delivery flow is a separate, parallel auth system — a delivery agent logs in with phone+OTP+password and gets independent tokens.

### Screens

| Screen | Route | Purpose |
|---|---|---|
| `DeliveryRegisterScreen` | `delivery/register` | Phone number entry |
| `DeliveryOTPScreen` | `delivery/otp` | OTP verification |
| `DeliveryApplicationScreen` | `delivery/application` | 3-step profile form |
| `DeliveryPendingScreen` | `delivery/pending` | Awaiting approval |
| `DeliveryRejectedScreen` | `delivery/rejected` | Application rejected |
| `DeliveryDashboardScreen` | `delivery/dashboard` | Active agent dashboard |

### Application form (`DeliveryApplicationScreen`)

A 3-step wizard. Each step validates before advancing:

| Step | Fields |
|---|---|
| 0 — Personal | First/last name, date of birth, national ID, city |
| 1 — Vehicle & Contact | Vehicle type, license (if car), emergency contact, payment method |
| 2 — Documents | Profile photo, ID photo, dynamic Q&A, password, terms acceptance |

Sub-components are co-located in the same file: `SectionHeader`, `Field`, `DatePickerField`, `VehicleSelector`, `PaymentSelector`, `ImagePickerField`, `StepIndicator`.

`DatePickerField` handles platform differences — Android uses `DateTimePickerAndroid.open()` imperatively; iOS uses a bottom-sheet modal with a spinner and separate `pendingDate` state to allow cancel without committing.

### Agent status type

```ts
type DeliveryAgentStatus = 'SUSPENDED' | 'PENDING_APPROVAL' | 'ACTIVE' | 'REJECTED';
```

Status is cached in `SecureStore` as `deliveryAgentStatus` and restored at app init before the refresh HTTP call completes, enabling instant navigation.

---

## App Initialization

`_layout.tsx` runs three init hooks before rendering:

1. `useAuthInit()` — restores customer session from stored refresh token
2. `useDeliveryInit()` — restores delivery session + cached agent status; has an 8 s hard timeout via `Promise.race`
3. `useLanguageInit()` — loads saved language preference

`SplashScreen.hideAsync()` is called only after both fonts and i18n are ready.

---

## Shared UI Components

| Component | Location | Notes |
|---|---|---|
| `AppButton` | `components/ui/AppButton` | Primary CTA button, supports `loading`, `disabled`, `icon`, `iconPosition` |
| `AppText` | `components/ui/AppText` | Text with font family + RTL alignment wired in |
| `LanguageSwitcher` | `components/ui/LanguageSwitcher` | Toggles AR/EN |
| `protectedRoute` | `components/protectedRoute` | HOC for auth-gated screens |

---

## Environment Variables

All prefixed `EXPO_PUBLIC_` (required by Expo's public env system):

```
EXPO_PUBLIC_API_URL_AUTH
EXPO_PUBLIC_API_URL_CUSTOMER
EXPO_PUBLIC_API_URL_DELIVERY
```

Set in `.env` at the `app/mobile/` root.

---

## Common Patterns

- **RTL layout**: check `const isRTL = useRTL()` and flip `flexDirection`, `textAlign`, icon chevron direction.
- **React Query mutations**: hooks in `modules/X/hooks/` wrap `useMutation` / `useQuery`; screens never call the repository directly.
- **No direct store writes from screens**: screens call hooks, hooks call the store.
- **`gestureEnabled: false`** on all screens where back-swipe would break the flow (OTP, form completion, dashboard).
