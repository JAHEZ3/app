# Jahaz — API Routes Reference

All services run independently on their own port and listen on NATS for internal events.
Full URL is always: `http://localhost:<PORT>/<PREFIX>/<route>`

---

## Service Map

| Service              | Port | Base URL prefix     |
| -------------------- | ---- | ------------------- |
| API Gateway          | 3000 | `/api/gateway`      |
| Delivery Service     | 3002 | `/api/delivery`     |
| Restaurant Service   | 3003 | `/api/restaurant`   |
| Auth Service         | 3004 | `/api/auth`         |
| Customer Service     | 3005 | `/api/customer`     |
| Manager Service      | 3006 | `/api/manager`      |
| Notification Service | 3007 | `/api/notification` |
| Payment Service      | 3008 | `/api/payment`      |
| Order Service        | 3001 | `/api/order`        |

---

## Legend

| Symbol | Meaning                                        |
| ------ | ---------------------------------------------- |
| 🔓     | No auth required (public)                      |
| 🔑     | `Authorization: Bearer <accessToken>` required |
| 👤     | Role: `customer`                               |
| 🚗     | Role: `delivery`                               |
| 🍽️     | Role: `restaurant_owner`                       |
| 🧑‍💼     | Role: `manager`                                |
| 📎     | `multipart/form-data` (file upload)            |

---

## Auth Service — `http://localhost:3004/api/auth`

### Registration — Step 1 (phone → OTP, status: PENDING)

| Method | Route                  | Auth | Body    | Description                           |
| ------ | ---------------------- | ---- | ------- | ------------------------------------- |
| POST   | `/customer/register`   | 🔓   | `phone` | Register customer — sends OTP         |
| POST   | `/delivery/register`   | 🔓   | `phone` | Register delivery agent — sends OTP   |
| POST   | `/restaurant/register` | 🔓   | `phone` | Register restaurant owner — sends OTP |

**Response:** `{ data: { phone }, message }` — `409` if phone already registered under same role.

---

### Registration — Step 2 (verify OTP → SUSPENDED + tokens)

| Method | Route         | Auth | Body           | Description                                                       |
| ------ | ------------- | ---- | -------------- | ----------------------------------------------------------------- |
| POST   | `/verify-otp` | 🔓   | `phone`, `otp` | Verify registration OTP → returns `{ accessToken, refreshToken }` |
| POST   | `/resend-otp` | 🔓   | `phone`        | Resend registration OTP (max 3 per 24 h)                          |

---

### Login — Customer (OTP-based, two-step)

| Method | Route                    | Auth | Body           | Description                                      |
| ------ | ------------------------ | ---- | -------------- | ------------------------------------------------ |
| POST   | `/customer/login`        | 🔓   | `phone`        | Step 1 — sends LOGIN OTP                         |
| POST   | `/customer/verify-login` | 🔓   | `phone`, `otp` | Step 2 — returns `{ accessToken, refreshToken }` |

> If the customer is SUSPENDED + profile not completed, tokens are still returned so they can reach `POST /api/customer/profile`.

---

### Login — Delivery / Restaurant / Manager (password-based)

| Method | Route               | Auth | Body                | Description            |
| ------ | ------------------- | ---- | ------------------- | ---------------------- |
| POST   | `/delivery/login`   | 🔓   | `phone`, `password` | Login delivery agent   |
| POST   | `/restaurant/login` | 🔓   | `phone`, `password` | Login restaurant owner |
| POST   | `/manager/login`    | 🔓   | `email`, `password` | Login manager          |

> Rate limit: 5 failed attempts → 15-minute lockout.

---

### Password Management

| Method | Route              | Auth | Body                                     | Description                                          |
| ------ | ------------------ | ---- | ---------------------------------------- | ---------------------------------------------------- |
| POST   | `/forgot-password` | 🔓   | `phone` or `email`                       | Sends password-reset OTP                             |
| POST   | `/reset-password`  | 🔓   | `phone` or `email`, `otp`, `newPassword` | Verify OTP and set new password                      |
| POST   | `/change-password` | 🔑   | `oldPassword`, `newPassword`             | Change password while logged in (revokes all tokens) |

---

### Token Management

| Method | Route      | Auth | Body           | Description                             |
| ------ | ---------- | ---- | -------------- | --------------------------------------- |
| POST   | `/refresh` | 🔓   | `refreshToken` | Rotate refresh token — returns new pair |
| DELETE | `/logout`  | 🔑   | `refreshToken` | Revoke refresh token                    |

---

## Customer Service — `http://localhost:3005/api/customer`

### Status flow: PENDING → (OTP verified) → SUSPENDED → (profile complete) → ACTIVE

| Method | Route      | Auth     | Body / Files                      | Description                                       |
| ------ | ---------- | -------- | --------------------------------- | ------------------------------------------------- |
| GET    | `/profile` | 🔑 👤    | —                                 | Get own profile (avatarUrl is a presigned S3 URL) |
| POST   | `/profile` | 🔑 👤 📎 | See below                         | **Complete profile** — triggers ACTIVE status     |
| PATCH  | `/profile` | 🔑 👤 📎 | Any profile fields (all optional) | Update profile                                    |

**POST/PATCH `/profile` — multipart/form-data:**

| Field         | Type            | Required | Notes                   |
| ------------- | --------------- | -------- | ----------------------- |
| `firstName`   | text            | Yes      |                         |
| `lastName`    | text            | Yes      |                         |
| `locationLat` | number          | Yes      | GPS latitude            |
| `locationLng` | number          | Yes      | GPS longitude           |
| `dateOfBirth` | text (ISO date) | No       |                         |
| `avatar`      | file (image)    | No       | Max 5 MB — stored in S3 |

---

## Delivery Service — `http://localhost:3002/api/delivery`

### Status flow: PENDING → (OTP verified) → SUSPENDED → (profile submitted) → PENDING_APPROVAL → (manager approves) → ACTIVE

#### Agent — Profile

| Method | Route                | Auth     | Body / Files | Description                                      |
| ------ | -------------------- | -------- | ------------ | ------------------------------------------------ |
| GET    | `/profile/questions` | 🔓       | —            | Get the 3 fixed application questions            |
| GET    | `/profile`           | 🔑 🚗    | —            | Get own profile + presigned photo URLs           |
| POST   | `/profile`           | 🔑 🚗 📎 | See below    | **Submit application** — sends to manager review |

**POST `/profile` — multipart/form-data:**

| Field                   | Type            | Required             | Notes                                                |
| ----------------------- | --------------- | -------------------- | ---------------------------------------------------- |
| `firstName`             | text            | Yes                  |                                                      |
| `lastName`              | text            | Yes                  |                                                      |
| `dateOfBirth`           | text (ISO date) | Yes                  |                                                      |
| `nationalIdNumber`      | text            | Yes                  | ID card number                                       |
| `city`                  | text            | Yes                  | Operating zone                                       |
| `vehicleType`           | text (enum)     | Yes                  | `motorcycle` \| `bicycle` \| `car` \| `on_foot`      |
| `vehicleLicenseNumber`  | text            | If `vehicleType=car` | Vehicle registration number                          |
| `emergencyContactName`  | text            | Yes                  |                                                      |
| `emergencyContactPhone` | text            | Yes                  | Mobile number                                        |
| `paymentInfo`           | text (JSON)     | Yes                  | See payment info format below                        |
| `password`              | text            | Yes                  | Set for the first time here                          |
| `termsAccepted`         | text (`"true"`) | Yes                  | Must be `"true"`                                     |
| `answers`               | text (JSON)     | Yes                  | Exactly 3 items — one per fixed question (see below) |
| `profilePicture`        | file (image)    | Yes                  | Max 5 MB                                             |
| `idPicture`             | file (image)    | Yes                  | Photo of national ID, max 5 MB                       |

**Fixed application questions** (returned by `GET /profile/questions`, must be echoed back in `answers`):

1. `"Why do you want to join our delivery team?"`
2. `"Do you have previous experience in delivery or a related field? If yes, describe it briefly."`
3. `"How do you handle difficult situations with customers or tight deadlines?"`

**`answers` example (JSON string for form-data):**

```json
[
  {
    "question": "Why do you want to join our delivery team?",
    "answer": "I want a flexible schedule and enjoy driving."
  },
  {
    "question": "Do you have previous experience in delivery or a related field? If yes, describe it briefly.",
    "answer": "Yes, 1 year with a local courier company."
  },
  {
    "question": "How do you handle difficult situations with customers or tight deadlines?",
    "answer": "I stay calm and communicate clearly with the customer."
  }
]
```

**GET `/profile` — response fields:**

```json
{
  "data": {
    "id", "userId", "fullName", "firstName", "lastName", "phone",
    "dateOfBirth", "idNumber", "city", "vehicleType", "vehicleLicenseNumber",
    "emergencyContactName", "emergencyContactPhone", "paymentInfo",
    "status", "rating", "totalDeliveries", "walletBalance",
    "profilePictureUrl",   // presigned S3 URL (1 hour)
    "idPictureUrl",        // presigned S3 URL (1 hour)
    "applicationStatus",   // "pending" | "approved" | "rejected" | null
    "rejectionReason"      // string | null
  }
}
```

---

#### Manager — Application Review

| Method | Route                               | Auth  | Body     | Description                            |
| ------ | ----------------------------------- | ----- | -------- | -------------------------------------- |
| GET    | `/manager/applications`             | 🔑 🧑‍💼 | —        | List all pending delivery applications |
| PATCH  | `/manager/applications/:id/approve` | 🔑 🧑‍💼 | —        | Approve agent → ACTIVE                 |
| PATCH  | `/manager/applications/:id/reject`  | 🔑 🧑‍💼 | `reason` | Reject agent (can resubmit)            |

---

## Restaurant Service — `http://localhost:3003/api/restaurant`

### Status flow: PENDING → (OTP verified) → SUSPENDED → (profile submitted) → PENDING_APPROVAL → (manager approves) → ACTIVE

#### Public (no auth)

| Method | Route  | Auth | Query        | Description                               |
| ------ | ------ | ---- | ------------ | ----------------------------------------- |
| GET    | `/`    | 🔓   | `?city=Gaza` | List all active restaurants               |
| GET    | `/:id` | 🔓   | —            | Get restaurant detail with full menu tree |

---

#### Restaurant Owner — Profile & Settings

| Method | Route          | Auth     | Body / Files           | Description                                    |
| ------ | -------------- | -------- | ---------------------- | ---------------------------------------------- |
| GET    | `/profile`     | 🔑 🍽️    | —                      | Get own profile + presigned photo URLs         |
| POST   | `/profile`     | 🔑 🍽️ 📎 | See below              | **Complete profile** — sends to manager review |
| PATCH  | `/profile`     | 🔑 🍽️    | Any profile fields     | Update profile                                 |
| PATCH  | `/settings`    | 🔑 🍽️    | `minOrderAmount`, etc. | Update restaurant settings                     |
| PATCH  | `/toggle-open` | 🔑 🍽️    | —                      | Toggle open/closed state                       |

**POST `/profile` — multipart/form-data:**

| Field                   | Type            | Required | Notes                                                                                                                                                                |
| ----------------------- | --------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `restaurantName`        | text            | Yes      |                                                                                                                                                                      |
| `ownerName`             | text            | Yes      |                                                                                                                                                                      |
| `ownerNationalIdNumber` | text            | Yes      | Owner's national ID number                                                                                                                                           |
| `commercialRegNumber`   | text            | Yes      | Commercial registration number                                                                                                                                       |
| `restaurantPhone`       | text            | Yes      | Public-facing business phone                                                                                                                                         |
| `street`                | text            | Yes      | Street address                                                                                                                                                       |
| `city`                  | text            | Yes      | City                                                                                                                                                                 |
| `cuisineType`           | text (enum)     | Yes      | `fast_food` \| `sweets` \| `drinks` \| `kitchen` \| `pizza` \| `shawarma` \| `grills` \| `seafood` \| `sandwiches` \| `breakfast` \| `healthy` \| `asian` \| `other` |
| `paymentInfo`           | text (JSON)     | Yes      | See payment info format below                                                                                                                                        |
| `password`              | text            | Yes      | Set for the first time here                                                                                                                                          |
| `termsAccepted`         | text (`"true"`) | Yes      | Must be `"true"`                                                                                                                                                     |
| `lat`                   | number          | No       | GPS latitude (-90 to 90)                                                                                                                                             |
| `lng`                   | number          | No       | GPS longitude (-180 to 180)                                                                                                                                          |
| `description`           | text            | No       |                                                                                                                                                                      |
| `logo`                  | file (image)    | Yes      | Restaurant logo, max 5 MB                                                                                                                                            |
| `ownerIdPicture`        | file (image)    | Yes      | Owner national ID photo, max 5 MB                                                                                                                                    |

**GET `/profile` — response fields:**

```json
{
  "data": {
    "id", "ownerUserId", "name", "description", "phone",
    "ownerName", "street", "city", "cuisineType", "lat", "lng",
    "minOrderAmount", "rating", "status", "isOpen", "paymentInfo",
    "logoUrl",           // presigned S3 URL (1 hour)
    "coverUrl",          // presigned S3 URL (1 hour) | null
    "ownerIdPictureUrl", // presigned S3 URL (1 hour)
    "applicationStatus", // "pending" | "approved" | "rejected" | null
    "rejectionReason"    // string | null
  }
}
```

---

#### Restaurant Owner — Operating Hours

| Method | Route    | Auth  | Body                                          | Description              |
| ------ | -------- | ----- | --------------------------------------------- | ------------------------ |
| GET    | `/hours` | 🔑 🍽️ | —                                             | Get all configured hours |
| POST   | `/hours` | 🔑 🍽️ | `hours: [{ dayOfWeek, openTime, closeTime }]` | Set / update hours       |

---

#### Restaurant Owner — Menus

| Method | Route            | Auth  | Body                                   | Description    |
| ------ | ---------------- | ----- | -------------------------------------- | -------------- |
| GET    | `/menus`         | 🔑 🍽️ | —                                      | List own menus |
| POST   | `/menus`         | 🔑 🍽️ | `name`, `[isActive]`, `[displayOrder]` | Create menu    |
| PATCH  | `/menus/:menuId` | 🔑 🍽️ | Menu fields                            | Update menu    |
| DELETE | `/menus/:menuId` | 🔑 🍽️ | —                                      | Delete menu    |

---

#### Restaurant Owner — Menu Sections

| Method | Route                     | Auth  | Body                     | Description             |
| ------ | ------------------------- | ----- | ------------------------ | ----------------------- |
| GET    | `/menus/:menuId/sections` | 🔑 🍽️ | —                        | List sections in a menu |
| POST   | `/menus/:menuId/sections` | 🔑 🍽️ | `name`, `[displayOrder]` | Create section          |
| PATCH  | `/sections/:sectionId`    | 🔑 🍽️ | Section fields           | Update section          |
| DELETE | `/sections/:sectionId`    | 🔑 🍽️ | —                        | Delete section          |

---

#### Restaurant Owner — Meals

| Method | Route                                | Auth  | Body                                                                                                                         | Description             |
| ------ | ------------------------------------ | ----- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| GET    | `/sections/:sectionId/meals`         | 🔑 🍽️ | —                                                                                                                            | List meals in a section |
| POST   | `/meals`                             | 🔑 🍽️ | `sectionId`, `name`, `basePrice`, `[description]`, `[imageUrl]`, `[discountPrice]`, `[calories]`, `[tags]`, `[displayOrder]` | Create meal             |
| PATCH  | `/meals/:mealId`                     | 🔑 🍽️ | Meal fields                                                                                                                  | Update meal             |
| DELETE | `/meals/:mealId`                     | 🔑 🍽️ | —                                                                                                                            | Delete meal             |
| PATCH  | `/meals/:mealId/toggle-availability` | 🔑 🍽️ | —                                                                                                                            | Toggle meal on/off      |

---

#### Restaurant Owner — Option Groups

| Method | Route                          | Auth  | Body                                                       | Description                   |
| ------ | ------------------------------ | ----- | ---------------------------------------------------------- | ----------------------------- |
| GET    | `/meals/:mealId/option-groups` | 🔑 🍽️ | —                                                          | List option groups for a meal |
| POST   | `/meals/:mealId/option-groups` | 🔑 🍽️ | `name`, `selectionType`, `[isRequired]`, `[maxSelections]` | Create option group           |
| PATCH  | `/option-groups/:groupId`      | 🔑 🍽️ | Group fields                                               | Update option group           |
| DELETE | `/option-groups/:groupId`      | 🔑 🍽️ | —                                                          | Delete option group           |

---

#### Restaurant Owner — Options

| Method | Route                             | Auth  | Body                                    | Description             |
| ------ | --------------------------------- | ----- | --------------------------------------- | ----------------------- |
| GET    | `/option-groups/:groupId/options` | 🔑 🍽️ | —                                       | List options in a group |
| POST   | `/option-groups/:groupId/options` | 🔑 🍽️ | `name`, `[extraPrice]`, `[isAvailable]` | Create option           |
| PATCH  | `/options/:optionId`              | 🔑 🍽️ | Option fields                           | Update option           |
| DELETE | `/options/:optionId`              | 🔑 🍽️ | —                                       | Delete option           |

---

#### Manager — Application Review

| Method | Route                               | Auth  | Body     | Description                            |
| ------ | ----------------------------------- | ----- | -------- | -------------------------------------- |
| GET    | `/manager/applications`             | 🔑 🧑‍💼 | —        | List pending restaurant applications   |
| PATCH  | `/manager/applications/:id/approve` | 🔑 🧑‍💼 | —        | Approve restaurant → ACTIVE            |
| PATCH  | `/manager/applications/:id/reject`  | 🔑 🧑‍💼 | `reason` | Reject restaurant (owner can resubmit) |

---

## Payment Info Format (delivery + restaurant)

Send `paymentInfo` as a JSON string in form-data.

**Bank Account:**

```json
{
  "type": "bank_account",
  "bankName": "Bank of Palestine",
  "accountNumber": "1234567890",
  "iban": "PS92PALS000000000400123456702",
  "bankPhone": "0599000000"
}
```

`bankName` options: `"Bank of Palestine"` | `"Palestine Islamic Bank"` | `"Arab Islamic Bank"`
`bankPhone` is optional; all other fields required.

**Wallet:**

```json
{
  "type": "wallet",
  "walletType": "PalPay",
  "accountNumber": "0599000000",
  "phone": "0599000000"
}
```

`walletType` options: `"PalPay"` | `"Jawwal Pay"`
All fields required.

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

## Account Flow Summary

### Customer

1. `POST /api/auth/customer/register` → OTP sent
2. `POST /api/auth/verify-otp` → tokens issued (SUSPENDED)
3. `POST /api/customer/profile` → ACTIVE
4. `GET /api/customer/profile` → view profile

### Delivery Agent

1. `POST /api/auth/delivery/register` → OTP sent
2. `POST /api/auth/verify-otp` → tokens issued (SUSPENDED)
3. `GET /api/delivery/profile/questions` → get 3 fixed questions
4. `POST /api/delivery/profile` (multipart) → PENDING_APPROVAL
5. `GET /api/delivery/profile` → view profile + photo URLs
6. Manager: `PATCH /api/delivery/manager/applications/:id/approve` → ACTIVE

### Restaurant Owner

1. `POST /api/auth/restaurant/register` → OTP sent
2. `POST /api/auth/verify-otp` → tokens issued (SUSPENDED)
3. `POST /api/restaurant/profile` (multipart) → PENDING_APPROVAL
4. `GET /api/restaurant/profile` → view profile + photo URLs
5. Manager: `PATCH /api/restaurant/manager/applications/:id/approve` → ACTIVE

### Manager

> Created directly in the database — no public registration.
> Login: `POST /api/auth/manager/login` with `email` + `password`

---

## NATS Internal Events (not HTTP — reference only)

| Event                          | Publisher                   | Subscriber         | Effect                        |
| ------------------------------ | --------------------------- | ------------------ | ----------------------------- |
| `user.customer.created`        | auth-service                | customer-service   | Creates customer profile stub |
| `user.restaurant.created`      | auth-service                | restaurant-service | Creates restaurant stub       |
| `user.password.set`            | delivery/restaurant-service | auth-service       | Stores hashed password        |
| `customer.profile.completed`   | customer-service            | auth-service       | Sets user ACTIVE              |
| `delivery.profile.completed`   | delivery-service            | auth-service       | Sets profileCompleted = true  |
| `delivery.agent.approved`      | delivery-service            | auth-service       | Sets user ACTIVE              |
| `delivery.agent.rejected`      | delivery-service            | auth-service       | Resets profileCompleted       |
| `restaurant.profile.completed` | restaurant-service          | auth-service       | Sets profileCompleted = true  |
| `restaurant.owner.approved`    | restaurant-service          | auth-service       | Sets user ACTIVE              |
| `restaurant.owner.rejected`    | restaurant-service          | auth-service       | Resets profileCompleted       |
