# DeedScan API Reference

Base URL: same origin as the app (e.g. `http://localhost:3000`).

## API naming

We use **REST-style** paths. The original spec mentioned `POST /api/listing/create` and `POST /api/fraud-check`; we use:

- `POST /api/listings` — create listing (equivalent to `/api/listing/create`)
- `POST /api/listings/[id]/fraud-check` — run fraud check for a listing

All listing and message responses use consistent shapes; errors use `{ error: string, code: string }` with HTTP status set accordingly.

## Error format

- **Shape:** `{ error: string, code?: string }`
- **Codes:** `BAD_REQUEST` (400), `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `VALIDATION_ERROR` (422), `INTERNAL_ERROR` (500)

## Endpoints

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET    | `/api/auth/login`   | No  | Redirect to Auth0 login |
| GET    | `/api/auth/logout`  | No  | Logout and redirect |
| GET    | `/api/auth/callback`| No  | Auth0 callback |
| POST   | `/api/auth/verify-token` | Session | Returns `{ authenticated, userId, role, ... }` |

### Listings

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET    | `/api/listings` | No | List all listings (includes `photos`, `seller`) |
| GET    | `/api/listings/[id]` | No | Single listing by id (includes `photos`, `seller`) |
| GET    | `/api/listings/nearby` | No | Query: `lat`, `lng`, `radius_km`, `price_min`, `price_max`, `bedrooms` |
| POST   | `/api/listings` | Yes (SELLER_VERIFIED) | Create listing. Body: `title`, `description`, `address`, `price`, optional `imageUrl`, `sqft`, `bedrooms`, `latitude`, `longitude`, `photoUrls` (array of URLs from upload). Returns listing with `confidenceScore` and `badge` after fraud-check. |
| POST   | `/api/listings/[id]/fraud-check` | No | Run fraud check; returns `confidenceScore`, `badge`, `breakdown` |

### Upload & QR

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST   | `/api/upload` | Yes (SELLER_VERIFIED) | Multipart form: `files` (one or more images). Returns `{ urls: string[] }`. Use these in `photoUrls` when creating a listing. |
| POST   | `/api/qr/generate` | No | Body: `{ listingId }`. Returns `{ qrDataUrl, url }`. |
| POST   | `/api/price-estimate` | No | Body: `{ address, sqft?, bedrooms? }`. Returns `{ price_range, explanation }` (CAD). |

### Messages

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET    | `/api/messages` | Yes | Query: `listingId` (required), `otherUserId` (optional). Returns messages for the thread. |
| POST   | `/api/messages` | Yes (BUYER or ADMIN) | Body: `{ recipientId, listingId, content }`. Creates message. |

### Profile

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST   | `/api/profile/role` | Yes | Body: `{ role: "BUYER" \| "SELLER_PENDING" }`. Only these two roles are self-assignable. |

## Config (lib/config.ts)

The app reads config from `process.env`. See `.env.example` for all variables. Required in development: `AUTH0_*`, `DATABASE_URL`. Optional: `GEMINI_API_KEY`, `WS_PORT`, `NEXT_PUBLIC_APP_CLIP_URL`, `UPLOAD_DIR`, `UPLOAD_PROVIDER`.
