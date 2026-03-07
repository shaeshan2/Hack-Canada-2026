# DeedScan

A basic frontend and backend where:
- sellers can create house listings
- regular users can register/login and browse listings
- authentication is handled by Auth0
- relational data is managed with Prisma

## Stack
- Next.js (Pages Router, TypeScript)
- Auth0 (`@auth0/nextjs-auth0`)
- Prisma ORM + SQLite

## 1) Install

```bash
npm install
```

## 2) Configure environment

Copy `.env.example` to `.env` and fill in your Auth0 values.

```bash
cp .env.example .env
```

In Auth0, configure these app URLs:
- Allowed Callback URLs: `http://localhost:3000/api/auth/callback`
- Allowed Logout URLs: `http://localhost:3000`
- Allowed Web Origins: `http://localhost:3000`

Role-aware signup UX:
- `Sign up as buyer` sets initial DB role to `buyer`
- `Sign up as seller` sets initial DB role to `seller_pending`

## 3) Create DB

```bash
npm run prisma:migrate -- --name init
npm run prisma:generate
```

## 4) Run

**Option A — Next.js only (REST APIs):**
```bash
npm run dev
```
Open `http://localhost:3000`.

**Option B — Next.js + WebSocket chat server (full stack):**
```bash
# Terminal 1
npm run dev

# Terminal 2
npm run server:ws
```
Or run both in one process:
```bash
node scripts/run-all.js
```

## 5) Test the APIs

With the dev server running (`npm run dev`), you can test from another terminal:

```bash
# Listings
curl -s http://localhost:3000/api/listings | jq

# Single listing (use a real id from the list above)
curl -s http://localhost:3000/api/listings/<LISTING_ID> | jq

# Nearby listings (optional: lat, lng, radius_km, price_min, price_max, bedrooms)
curl -s "http://localhost:3000/api/listings/nearby?radius_km=50" | jq

# Price estimate (mock if GEMINI_API_KEY not set)
curl -s -X POST http://localhost:3000/api/price-estimate \
  -H "Content-Type: application/json" \
  -d '{"address":"123 Main St, Toronto, ON","sqft":1200,"bedrooms":3}' | jq

# QR code for a listing (use a real listing id)
curl -s -X POST http://localhost:3000/api/qr/generate \
  -H "Content-Type: application/json" \
  -d '{"listingId":"<LISTING_ID>"}' | jq

# Fraud check for a listing (updates confidenceScore)
curl -s -X POST http://localhost:3000/api/listings/<LISTING_ID>/fraud-check | jq
```

**Auth-protected endpoints** (require logged-in session cookie):
- `POST /api/auth/verify-token` — returns current user id and role
- `POST /api/listings` — create listing (`seller_verified` only)
- `POST /api/profile/role` — self-switch allowed only: `BUYER` <-> `SELLER_PENDING`
- `GET /api/messages?listingId=...&otherUserId=...` — chat history
- `POST /api/messages` — send message (`buyer` or `admin`; body: `recipientId`, `listingId`, `content`)

**WebSocket (chat):** Connect to `http://localhost:3001` with Socket.io; send `userId` in handshake auth or query. Event `send_message` with `{ recipientId, listingId, content }`; listen for `new_message`.

## Main routes
- `/` browse listings
- `/seller` seller dashboard (requires login and seller role)

## Main APIs
- `GET /api/listings` — list all listings
- `GET /api/listings/[id]` — single listing
- `GET /api/listings/nearby` — nearby (query: lat, lng, radius_km, price_min, price_max, bedrooms)
- `POST /api/listings` — create listing (seller-only; body may include sqft, bedrooms, latitude, longitude)
- `POST /api/listings/[id]/fraud-check` — run fraud check, set confidenceScore
- `POST /api/price-estimate` — AI/mock price range (body: address, sqft, bedrooms)
- `POST /api/qr/generate` — QR code for App Clip URL (body: listingId)
- `POST /api/auth/verify-token` — current user id & role (session)
- `GET /api/messages?listingId=...&otherUserId=...` — chat history (auth)
- `POST /api/messages` — send message (auth; body: recipientId, listingId, content)
- `POST /api/profile/role` — set role (`BUYER` or `SELLER_PENDING`)

## Prisma schema summary
- `User` (`id`, `auth0Id`, `email`, `name`, `role`, `blockedReason`)
- `Listing` (`id`, `title`, `description`, `address`, `price`, `imageUrl`, `sqft`, `bedrooms`, `latitude`, `longitude`, `confidenceScore`, `sellerId`)
- `Message` (`id`, `content`, `read`, `senderId`, `recipientId`, `listingId`, `createdAt`)

Relationships:
- one `User` (seller) → many `Listing`
- `Message` links two users and a listing

## Auth0 tenant checklist
For tenant `deedscan.us.auth0.com`:
- Enable passwordless login: Email OTP (6 digits), magic link fallback.
- Enable social providers as needed: Google, Apple.
- Add user metadata fields: `role` and `blocked_reason`.
- Create Auth0 roles: `seller_verified`, `seller_pending`, `buyer`, `admin`.
- Add Post Login Action:
  - deny login when user is blocked
  - enforce your free-plan messaging policy (for example 2-week limit)
