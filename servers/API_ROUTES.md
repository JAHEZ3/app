# Jahaz — API Routes Reference

All services run independently on their own port and listen on NATS for internal events.
Every service uses the prefix shown below, so the full URL is always:

```
http://localhost:<PORT>/<PREFIX>/<route>
```

---

## Service Map

| Service             | Port | Base URL prefix        |
|---------------------|------|------------------------|
| API Gateway         | 3000 | `/api/gateway`         |
| Order Service       | 3001 | `/api/order`           |
| Delivery Service    | 3002 | `/api/delivery`        |
| Restaurant Service  | 3003 | `/api/restaurant`      |
| Auth Service        | 3004 | `/api/auth`            |
| Customer Service    | 3005 | `/api/customer`        |
| Manager Service     | 3006 | `/api/manager`         |
| Notification Service| 3007 | `/api/notification`    |
| Payment Service     | 3008 | `/api/payment`         |

---

## Legend

| Symbol | Meaning |
|--------|---------|
| 🔓 | No auth required (public) |
| 🔑 | `Authorization: Bearer <accessToken>` required |
| 👤 | Role: `customer` |
| 🚗 | Role: `delivery` |
| 🍽️ | Role: `restaurant_owner` |
| 🧑‍💼 | Role: `manager` |
| 📎 | `multipart/form-data` (file upload) |

---

## Auth Service — `http://localhost:3004/api/auth`

### Registration (Step 1 — phone → OTP)

| Method | Route | Auth | Body | Description |
|--------|-------|------|------|-------------|
| POST | `/customer/register` | 🔓 | `phone` | Register a customer — sends OTP |
| POST | `/delivery/register` | 🔓 | `phone` | Register a delivery agent — sends OTP |
| POST | `/restaurant/register` | 🔓 | `phone` | Register a restaurant owner — sends OTP |

**Response (all three):** `{ phone }` — if phone already exists: `409 Phone already registered`.

---

### Registration (Step 2 — verify OTP)

| Method | Route | Auth | Body | Description |
|--------|-------|------|------|-------------|
| POST | `/verify-otp` | 🔓 | `phone`, `otp` | Verify registration OTP — status becomes SUSPENDED, returns `{ accessToken, refreshToken }` |
| POST | `/resend-otp` | 🔓 | `phone` | Resend registration OTP (max 3 per 24 h) |

---

### Login — Customer (OTP-based)

| Method | Route | Auth | Body | Description |
|--------|-------|------|------|-------------|
| POST | `/customer/login` | 🔓 | `phone` | Step 1 — sends LOGIN OTP |
| POST | `/customer/verify-login` | 🔓 | `phone`, `otp` | Step 2 — returns `{ accessToken, refreshToken }` |

> If the customer is SUSPENDED + profile not completed, tokens are still returned so the customer can call `/api/customer/profile` to complete their profile.

---

### Login — Delivery / Restaurant / Manager (password-based)

| Method | Route | Auth | Body | Description |
|--------|-------|------|------|-------------|
| POST | `/delivery/login` | 🔓 | `phone`, `password` | Login delivery agent — returns tokens |
| POST | `/restaurant/login` | 🔓 | `phone`, `password` | Login restaurant owner — returns tokens |
| POST | `/manager/login` | 🔓 | `phone`, `password` | Login manager — returns tokens |

---

### Password Management

| Method | Route | Auth | Body | Description |
|--------|-------|------|------|-------------|
| POST | `/forgot-password` | 🔓 | `phone` | Sends a password-reset OTP |
| POST | `/reset-password` | 🔓 | `userId`, `otp`, `newPassword` | Verifies OTP and sets new password |
| POST | `/change-password` | 🔑 | `currentPassword`, `newPassword` | Change password while logged in |

---

### Token Management

| Method | Route | Auth | Body | Description |
|--------|-------|------|------|-------------|
| POST | `/refresh` | 🔓 | `refreshToken` | Get a new access token |
| DELETE | `/logout` | 🔑 | `refreshToken` | Invalidate refresh token |

---

## Customer Service — `http://localhost:3005/api/customer`

### Status flow: PENDING → (OTP verified) → SUSPENDED → (profile complete) → ACTIVE

| Method | Route | Auth | Body | Description |
|--------|-------|------|------|-------------|
| POST | `/profile` | 🔑 👤 | `firstName`, `lastName`, `locationLat`, `locationLng`, `[dateOfBirth]`, `[avatarUrl]` | **Complete profile** — triggers ACTIVE status |
| GET | `/profile` | 🔑 👤 | — | Get own profile |
| PATCH | `/profile` | 🔑 👤 | Any profile fields (all optional) | Update profile fields |

---

## Delivery Service — `http://localhost:3002/api/delivery`

### Status flow: PENDING → (OTP verified) → SUSPENDED → (profile submitted) → PENDING_APPROVAL → (manager approves) → ACTIVE

#### Profile completion

| Method | Route | Auth | Body / Files | Description |
|--------|-------|------|--------------|-------------|
| GET | `/profile/questions` | 🔓 | — | Get 2 random application questions |
| POST | `/profile/complete` | 🔑 🚗 📎 | See below | **Submit application** — sends to manager review |

**POST `/profile/complete` — multipart/form-data fields:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `firstName` | text | Yes | |
| `lastName` | text | Yes | |
| `dateOfBirth` | text (ISO date) | Yes | |
| `nationalIdNumber` | text | Yes | ID card number |
| `city` | text | Yes | Operating zone |
| `vehicleType` | text (enum) | Yes | `motorcycle`, `bicycle`, `car`, `on_foot` |
| `vehicleLicenseNumber` | text | Yes | Vehicle registration number |
| `emergencyContactName` | text | Yes | |
| `emergencyContactPhone` | text | Yes | Mobile number |
| `iban` | text | Yes | Bank account for payouts |
| `password` | text | Yes | Set for the first time here |
| `termsAccepted` | text (`"true"`) | Yes | Must be `"true"` |
| `answers` | text (JSON) | Yes | `[{ "question": "...", "answer": "..." }, ...]` — exactly 2 items matching the questions |
| `profilePicture` | file (image) | Yes | Max 5 MB |
| `idPicture` | file (image) | Yes | Photo of national ID, max 5 MB |

---

#### Manager — application review

| Method | Route | Auth | Body | Description |
|--------|-------|------|------|-------------|
| GET | `/manager/applications` | 🔑 🧑‍💼 | — | List all pending delivery applications |
| PATCH | `/manager/applications/:id/approve` | 🔑 🧑‍💼 | — | Approve agent — status becomes ACTIVE |
| PATCH | `/manager/applications/:id/reject` | 🔑 🧑‍💼 | `reason` | Reject agent — agent can resubmit |

---

## Restaurant Service — `http://localhost:3003/api/restaurant`

### Status flow: PENDING → (OTP verified) → SUSPENDED → (profile submitted) → PENDING_APPROVAL → (manager approves) → ACTIVE

---

#### Public (no auth)

| Method | Route | Auth | Query | Description |
|--------|-------|------|-------|-------------|
| GET | `/` | 🔓 | `?city=Riyadh` | List all active restaurants (filter by city) |
| GET | `/:id` | 🔓 | — | Get restaurant detail with full menu tree |

---

#### Restaurant Owner — Profile & Settings

| Method | Route | Auth | Body / Files | Description |
|--------|-------|------|--------------|-------------|
| POST | `/profile` | 🔑 🍽️ 📎 | See below | **Complete profile** — sends to manager review |
| GET | `/profile` | 🔑 🍽️ | — | Get own restaurant profile |
| PATCH | `/profile` | 🔑 🍽️ | Any profile fields | Update profile |
| POST | `/settings` | 🔑 🍽️ | `minOrderAmount`, etc. | Update restaurant settings |
| PATCH | `/toggle-open` | 🔑 🍽️ | — | Toggle open/closed state |

**POST `/profile` — multipart/form-data fields:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `restaurantName` | text | Yes | |
| `ownerName` | text | Yes | |
| `ownerNationalIdNumber` | text | Yes | Owner's ID card number |
| `commercialRegNumber` | text | Yes | Saudi CR number (سجل تجاري) |
| `restaurantPhone` | text | Yes | Public-facing business phone |
| `lat` | number | Yes | GPS latitude (-90 to 90) |
| `lng` | number | Yes | GPS longitude (-180 to 180) |
| `iban` | text | Yes | Bank account for payouts |
| `password` | text | Yes | Set for the first time here |
| `termsAccepted` | text (`"true"`) | Yes | Must be `"true"` |
| `description` | text | No | |
| `street` | text | No | |
| `city` | text | No | |
| `cuisineType` | text | No | |
| `logo` | file (image) | Yes | Restaurant logo, max 5 MB |
| `ownerIdPicture` | file (image) | Yes | Owner national ID photo, max 5 MB |

---

#### Restaurant Owner — Operating Hours

| Method | Route | Auth | Body | Description |
|--------|-------|------|------|-------------|
| GET | `/hours` | 🔑 🍽️ | — | Get all configured hours |
| POST | `/hours` | 🔑 🍽️ | `hours: [{ dayOfWeek, openTime, closeTime }]` | Set / update hours |

---

#### Restaurant Owner — Menus

| Method | Route | Auth | Body | Description |
|--------|-------|------|------|-------------|
| GET | `/menus` | 🔑 🍽️ | — | List own menus |
| POST | `/menus` | 🔑 🍽️ | `name`, `[isActive]`, `[displayOrder]` | Create menu |
| PATCH | `/menus/:menuId` | 🔑 🍽️ | Menu fields | Update menu |
| DELETE | `/menus/:menuId` | 🔑 🍽️ | — | Delete menu |

---

#### Restaurant Owner — Menu Sections

| Method | Route | Auth | Body | Description |
|--------|-------|------|------|-------------|
| GET | `/menus/:menuId/sections` | 🔑 🍽️ | — | List sections in a menu |
| POST | `/menus/:menuId/sections` | 🔑 🍽️ | `name`, `[displayOrder]` | Create section |
| PATCH | `/sections/:sectionId` | 🔑 🍽️ | Section fields | Update section |
| DELETE | `/sections/:sectionId` | 🔑 🍽️ | — | Delete section |

---

#### Restaurant Owner — Meals

| Method | Route | Auth | Body | Description |
|--------|-------|------|------|-------------|
| GET | `/sections/:sectionId/meals` | 🔑 🍽️ | — | List meals in a section |
| POST | `/meals` | 🔑 🍽️ | `sectionId`, `name`, `basePrice`, `[description]`, `[imageUrl]`, `[discountPrice]`, `[calories]`, `[tags]`, `[displayOrder]` | Create meal |
| PATCH | `/meals/:mealId` | 🔑 🍽️ | Meal fields | Update meal |
| DELETE | `/meals/:mealId` | 🔑 🍽️ | — | Delete meal |
| PATCH | `/meals/:mealId/toggle-availability` | 🔑 🍽️ | — | Toggle meal on/off |

---

#### Restaurant Owner — Option Groups

| Method | Route | Auth | Body | Description |
|--------|-------|------|------|-------------|
| GET | `/meals/:mealId/option-groups` | 🔑 🍽️ | — | List option groups for a meal |
| POST | `/meals/:mealId/option-groups` | 🔑 🍽️ | `name`, `selectionType`, `[isRequired]`, `[maxSelections]` | Create option group |
| PATCH | `/option-groups/:groupId` | 🔑 🍽️ | Group fields | Update option group |
| DELETE | `/option-groups/:groupId` | 🔑 🍽️ | — | Delete option group |

---

#### Restaurant Owner — Options

| Method | Route | Auth | Body | Description |
|--------|-------|------|------|-------------|
| GET | `/option-groups/:groupId/options` | 🔑 🍽️ | — | List options in a group |
| POST | `/option-groups/:groupId/options` | 🔑 🍽️ | `name`, `[extraPrice]`, `[isAvailable]` | Create option |
| PATCH | `/options/:optionId` | 🔑 🍽️ | Option fields | Update option |
| DELETE | `/options/:optionId` | 🔑 🍽️ | — | Delete option |

---

#### Manager — Application Review

| Method | Route | Auth | Body | Description |
|--------|-------|------|------|-------------|
| GET | `/manager/applications` | 🔑 🧑‍💼 | — | List pending restaurant applications |
| PATCH | `/manager/applications/:id/approve` | 🔑 🧑‍💼 | — | Approve restaurant — status becomes ACTIVE |
| PATCH | `/manager/applications/:id/reject` | 🔑 🧑‍💼 | `reason` | Reject restaurant — owner can resubmit |

---

## User Status Lifecycle

```
Registration:
  phone → register → [PENDING]
                         ↓
              verify OTP → [SUSPENDED]
                               ↓
              complete profile → submitted to manager (profileCompleted = true)
                                         ↓
                     manager approves → [ACTIVE]
                     manager rejects  → back to SUSPENDED (can resubmit)

Customer shortcut:
  verify OTP → complete profile → [ACTIVE immediately, no manager step]
```

---

## Account User Flow Summary

### Customer
1. `POST /api/auth/customer/register` → OTP sent
2. `POST /api/auth/verify-otp` → tokens issued (SUSPENDED)
3. `POST /api/customer/profile` → ACTIVE

### Delivery Agent
1. `POST /api/auth/delivery/register` → OTP sent
2. `POST /api/auth/verify-otp` → tokens issued (SUSPENDED)
3. `GET /api/delivery/profile/questions` → get 2 questions
4. `POST /api/delivery/profile/complete` (multipart) → PENDING_APPROVAL
5. Manager: `PATCH /api/delivery/manager/applications/:id/approve` → ACTIVE

### Restaurant Owner
1. `POST /api/auth/restaurant/register` → OTP sent
2. `POST /api/auth/verify-otp` → tokens issued (SUSPENDED)
3. `POST /api/restaurant/profile` (multipart) → PENDING_APPROVAL
4. Manager: `PATCH /api/restaurant/manager/applications/:id/approve` → ACTIVE

### Manager
> Created directly in the database or via a seed script — no public registration.
> Logs in with: `POST /api/auth/manager/login`

---

## NATS Internal Events (not HTTP — for reference only)

| Event | Publisher | Subscriber | Effect |
|-------|-----------|------------|--------|
| `user.customer.created` | auth-service | customer-service | Creates profile stub |
| `user.delivery.created` | auth-service | delivery-service | Creates agent stub |
| `user.restaurant.created` | auth-service | restaurant-service | Creates restaurant stub |
| `user.password.set` | delivery/restaurant-service | auth-service | Stores hashed password |
| `customer.profile.completed` | customer-service | auth-service | Sets user ACTIVE |
| `delivery.profile.completed` | delivery-service | auth-service | Sets profileCompleted = true |
| `delivery.agent.approved` | delivery-service | auth-service | Sets user ACTIVE |
| `delivery.agent.rejected` | delivery-service | auth-service | Resets profileCompleted |
| `restaurant.profile.completed` | restaurant-service | auth-service | Sets profileCompleted = true |
| `restaurant.owner.approved` | restaurant-service | auth-service | Sets user ACTIVE |
| `restaurant.owner.rejected` | restaurant-service | auth-service | Resets profileCompleted |
