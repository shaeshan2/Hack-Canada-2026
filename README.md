# DeedScan

> **No agent. No commission.** A Canadian real estate marketplace built for Hack Canada 2026.

Sellers plant a for-sale sign, scan a QR code, and their listing is live in minutes. Buyers browse, get an AI price comparison, and message the seller directly — no agent, no 5% cut. Every listing runs an automated fraud-confidence score before it goes public.

---

## What it does

| Role       | What they get                                                                                                        |
| ---------- | -------------------------------------------------------------------------------------------------------------------- |
| **Seller** | Create a listing with photos, get a QR code for an Apple App Clip sign, run AI fraud-check, manage verification docs |
| **Buyer**  | Browse listings in CAD, view neighborhood scores + map, get AI price estimate, real-time chat with seller            |
| **Admin**  | Review seller verification submissions and flagged listings from a dedicated dashboard                               |

Key features:

- **AI fraud detection** — Gemini analyzes listing data and returns a 0–100 confidence score with breakdown
- **AI price estimate** — Gemini gives a CAD price range with explanation for any address
- **Neighborhood scoring** — walkability, transit, and school scores with interactive Leaflet map
- **Real-time chat** — Socket.io WebSocket server with typing indicators
- **Seller verification** — gov ID + ownership proof upload, admin review queue
- **App Clip QR** — QR codes that deep-link to a native iOS App Clip
- **Role-based access** — Auth0 + Prisma enforce buyer / seller_pending / seller_verified / admin

---

## Stack

| Layer        | Technology                                                         |
| ------------ | ------------------------------------------------------------------ |
| Framework    | Next.js 16, Pages Router, TypeScript                               |
| Auth         | Auth0 (`@auth0/nextjs-auth0` v4), RBAC with custom API permissions |
| Database     | Prisma ORM + SQLite (dev)                                          |
| AI           | Google Gemini (`@google/genai`)                                    |
| Real-time    | Socket.io WebSocket server                                         |
| Maps         | Leaflet (dynamic import, SSR-safe)                                 |
| Validation   | Zod, centralized error codes (`lib/api/`)                          |
| File storage | Local (`public/uploads`) — S3-ready via `UPLOAD_PROVIDER`          |

---

## Quick start

### 1. Install

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in Auth0 values. See `.env.example` for all required and optional variables.

In Auth0 → Application settings:

- Allowed Callback URLs: `http://localhost:3000/auth/callback`
- Allowed Logout URLs: `http://localhost:3000`
- Allowed Web Origins: `http://localhost:3000`

> **Note:** Auth routes are handled by `proxy.ts` middleware (Next.js 16). Do **not** set `AUTH0_AUDIENCE` in `.env` — it is not required and will cause login to fail.

### 3. Set up the database

```bash
npm run prisma:migrate -- --name init
npm run prisma:generate
```

Seed demo data (optional):

```bash
npm run seed:demo
```

### 4. Run

Next.js only:

```bash
npm run dev
```

Full stack with WebSocket chat:

```bash
# Terminal 1
npm run dev
# Terminal 2
npm run server:ws
```

Or both at once:

```bash
node scripts/run-all.js
```

Open `http://localhost:3000`.

---

## Admin dashboard

`/admin/review` — seller verification queue and flagged listing review.

Access requires the `ADMIN` role in the DB. When `AUTH0_AUDIENCE` is not set (the default dev setup), the DB role is the sole authority — no Auth0 role configuration needed.

Promote a user:

```bash
npm run promote:admin -- <email>
```

The user must log out and back in after promotion.

**Optional full Auth0 RBAC setup** (production only):

- Dashboard → APIs → create a Custom API, set its identifier as `AUTH0_AUDIENCE` in `.env`
- Add permission `admin:review` to that API
- API Settings: enable **RBAC** and **Add Permissions in the Access Token**
- The M2M app (`AUTH0_M2M_CLIENT_ID/SECRET`) needs Management API scopes: `read:users`, `read:roles`, `create:roles`, `update:roles`, `create:role_members`
- Run `npm run promote:admin -- <email>` to sync both Auth0 role and DB

---

## API reference

Full reference: [docs/API.md](docs/API.md)

| Method | Path                              | Auth              | Description                                                               |
| ------ | --------------------------------- | ----------------- | ------------------------------------------------------------------------- |
| GET    | `/api/listings`                   | No                | All listings                                                              |
| GET    | `/api/listings/[id]`              | No                | Single listing with photos + seller                                       |
| GET    | `/api/listings/nearby`            | No                | `lat`, `lng`, `radius_km`, `price_min`, `price_max`, `bedrooms`           |
| POST   | `/api/listings`                   | `SELLER_VERIFIED` | Create listing (`photoUrls`, `sqft`, `bedrooms`, `latitude`, `longitude`) |
| POST   | `/api/listings/[id]/fraud-check`  | No                | Run fraud check; returns `confidenceScore` + breakdown                    |
| GET    | `/api/listings/[id]/neighborhood` | No                | Walkability, transit, school scores + coordinates                         |
| POST   | `/api/upload`                     | `SELLER_VERIFIED` | Multipart photo upload; returns `{ urls }`                                |
| POST   | `/api/price-estimate`             | No                | Gemini CAD price range; body: `address`, `sqft`, `bedrooms`               |
| POST   | `/api/qr/generate`                | No                | App Clip QR code; body: `{ listingId }`                                   |
| GET    | `/api/messages`                   | Session           | Chat history; query: `listingId`, `otherUserId`                           |
| POST   | `/api/messages`                   | Session           | Send message; body: `recipientId`, `listingId`, `content`                 |
| GET    | `/api/conversations`              | Session           | All conversations for current user                                        |
| POST   | `/api/auth/verify-token`          | Session           | Returns `{ userId, role }`                                                |
| POST   | `/api/seller/verification`        | `SELLER_PENDING`  | Submit gov ID + ownership proof                                           |
| POST   | `/api/upload/verification`        | Session           | Upload verification documents                                             |
| GET    | `/api/admin/review/queue`         | Admin             | Pending sellers + flagged listings                                        |
| POST   | `/api/admin/review/sellers/[id]`  | Admin             | Approve or reject seller                                                  |
| POST   | `/api/admin/review/flags/[id]`    | Admin             | Approve or ban flagged listing                                            |

**WebSocket** (`ws://localhost:3001`): authenticate with `{ auth: { userId } }`. Events:

- Emit: `send_message { recipientId, listingId, content }`, `typing_start/stop { listingId, recipientId }`
- Receive: `new_message`, `typing { listingId, userId, name }`, `typing_stop`, `error { code, message }`

---

## Data model

- `User` — `id`, `auth0Id`, `email`, `name`, `role`, `blockedReason`
- `Listing` — `title`, `description`, `address`, `price`, `sqft`, `bedrooms`, `lat/lng`, `confidenceScore`, `breakdownJson`, `flagsJson`, `sellerId`
- `Photo` — `url`, `order`, `listingId` (multiple photos per listing)
- `Message` — `content`, `read`, `senderId`, `recipientId`, `listingId`
- `SellerVerificationSubmission` — `govIdDocumentUrl`, `ownershipProofUrl`, `status`, `rejectionReason`
- `FraudFlag` — `confidenceScore`, `breakdownJson`, `matchedImagesJson`, `status`, `notes`

---

## Auth0 tenant setup checklist

- [ ] Configure application callback / logout / origin URLs
  - Callback: `http://localhost:3000/auth/callback`
  - Logout: `http://localhost:3000`
  - Web Origins: `http://localhost:3000`
- [ ] Do **not** set `AUTH0_AUDIENCE` for local dev — remove it from `.env` if present
- [ ] _(Production only)_ Create a Custom API with a proper identifier as `AUTH0_AUDIENCE`; add `admin:review` permission; enable RBAC + Add Permissions in Access Token
- [ ] _(Production only)_ Create roles: `buyer`, `seller_pending`, `seller_verified`, `admin`
- [ ] _(Production only)_ Create an M2M application authorized on the Management API with user/role scopes
- [ ] Add a Post Login Action to block flagged users
