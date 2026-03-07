# DeedScan — Next Steps to Complete & Win the Hackathon

This doc maps the **full project scope** to what’s done vs missing, and gives **ordered steps** to finish the product and stand out to judges.

---

## Prize tracks (reminder)

| Track | Prize | How you hit it |
|-------|--------|------------------|
| **ClipKit (Reactiv)** | $5,000 | App Clip launches from QR on physical for-sale sign |
| **Auth0** | Headphones | Passwordless + seller verification + buyer messaging + fraud blocking |
| **Vultr** | Screens | Backend on Vultr: Gemini pricing, fraud, WebSocket |
| **Antigravity** | Swag | Build in Google Antigravity IDE (document in Devpost) |

---

## What’s already done

- **Landing:** Hero, savings calculator, how-it-works, listings grid, nav (Messages, Dashboard, Log out), account banner
- **Auth:** Auth0 login/signup (buyer vs seller intent), session, verify-token, role in DB (BUYER, SELLER_PENDING, SELLER_VERIFIED, ADMIN)
- **Listings:** Create (with photo upload), list, single listing, nearby (filters), confidence score (mock fraud-check on create)
- **Price estimate:** POST /api/price-estimate (Gemini or mock)
- **QR:** POST /api/qr/generate returns qrDataUrl + App Clip URL
- **Messages:** REST + WebSocket chat; conversations list; listing detail “Message seller”; real-time + typing when WS server running
- **Seller dashboard:** Create listing only (no “my listings” or QR download yet)
- **DB:** User, Listing, Photo, Message; roles; BlockedReason
- **Docs:** README, docs/API.md, .env.example

---

## What’s missing (by impact)

### Critical for demo & prizes

1. **Seller “My Listings” + QR download**
   - **Why:** Demo says “Download QR” and “attach to your for-sale sign.” Right now sellers can’t see their listings or get a QR.
   - **Steps:**
     - Add `GET /api/listings/mine` (or filter `GET /api/listings` by current user when auth) returning only the seller’s listings.
     - On seller dashboard: add a section “Your listings” (or a separate `/seller/listings` page) listing each listing with title, address, price, confidence badge.
     - Per listing: “Download QR” button → call `POST /api/qr/generate` with that listing’s id → show the image and a “Download” / “Print” link (e.g. open qrDataUrl in new tab or use download attribute).
   - **Done when:** Seller can open dashboard, see their listings, and download a QR for each.

2. **Admin review dashboard** (pending sellers → approve/reject)
   - **Why:** Spec and Auth0 track: “Admin approves in dashboard”; “seller_verified” must be set by an admin flow, not self-serve.
   - **Steps:**
     - Add `GET /api/admin/pending-sellers`: returns users where `role === SELLER_PENDING` (and optionally where they’ve submitted docs if you add that).
     - Add `POST /api/admin/approve-seller`: body `{ userId }` → set user’s role to `SELLER_VERIFIED`.
     - Add `POST /api/admin/reject-seller`: body `{ userId, reason? }` → optionally set role or leave PENDING and store reason; optionally notify.
     - Add page `pages/admin/review.tsx`: protected (getServerSideProps or middleware: only allow if `role === ADMIN`). List pending sellers (name, email, submitted date). Per user: “Approve” and “Reject” buttons calling the APIs above.
     - Optional: “Block” that sets `blockedReason` and optionally calls Auth0 Management API to block the user.
   - **Done when:** Admin can open `/admin/review`, see pending sellers, and approve or reject them.

3. **Seller verification page** (`/seller/verify`)
   - **Why:** Home already links “Complete Verification” for SELLER_PENDING; without this page the link 404s.
   - **Steps:**
     - Add `pages/seller/verify.tsx`: protected, only for `role === SELLER_PENDING`. Show copy: “Upload your government ID and proof of ownership for review.”
     - Optional (quick): Two file inputs (gov ID image, proof PDF) → `POST /api/seller/verify-upload` saving files somewhere (e.g. `public/verifications/` or S3) and storing references on User or a new `VerificationDocument` model. Then admin can review in `/admin/review`.
     - Minimal (no upload): Static “Your account is pending. An admin will approve you soon.” so the link doesn’t 404.
   - **Done when:** `/seller/verify` loads for SELLER_PENDING and either shows upload UI or a clear “pending” message.

4. **“Run fraud check” in the UI**
   - **Why:** Judges want to see “fraud checks run” and confidence score; today it runs on create but there’s no manual trigger or breakdown.
   - **Steps:**
     - On listing detail (`/listings/[id]`) or seller’s listing row: add “Run fraud check” (for seller or admin). On click → `POST /api/listings/[id]/fraud-check` → show returned `confidenceScore`, `badge`, and `breakdown` (e.g. in a small modal or inline).
   - **Done when:** User can trigger a fraud check from the UI and see the result.

### High impact (differentiation)

5. **Blocked users cannot log in**
   - **Why:** Auth0 track and spec: “block fraudsters permanently”; you have `blockedReason` but don’t enforce it.
   - **Steps:**
     - In `ensureDbUser` (or right after in APIs/pages that use it): if `user.blockedReason != null`, throw or return a “blocked” response; in pages redirect to a “Your account is blocked” page.
     - Optional: Auth0 Post Login Action that calls your API or reads app_metadata to deny login when blocked.
   - **Done when:** Setting `blockedReason` prevents the user from using the app (and ideally from logging in).

6. **Search / filters on home**
   - **Why:** Spec: “Natural language input” and “Filter sidebar (price, bedrooms, location).”
   - **Steps:**
     - Add a search/filter bar on home (or above the listings section): price min/max, bedrooms, optional location/radius. On submit or change → call `GET /api/listings/nearby` with query params and replace or filter the listed results.
     - Optional: “Natural language” input that you parse (e.g. “3-bed under 700k Toronto”) and map to the same params; or a later step with Gemini.
   - **Done when:** Users can filter listings by price, bedrooms, and optionally location.

7. **Admin: list and review pending sellers with documents**
   - **Why:** Stronger story: “Admin reviews gov ID + proof of ownership.”
   - **Steps:**
     - If you added verification uploads (step 3), in `/admin/review` show links or inline previews (e.g. images, PDF via `react-pdf`) for each pending seller’s docs. Approve/Reject/Block with optional reason.
   - **Done when:** Admin sees pending sellers and their documents before approving or rejecting.

### App Clip (ClipKit prize — $5k)

8. **App Clip or “clip” experience**
   - **Why:** ClipKit prize requires “App Clip launches from QR on physical for-sale sign.”
   - **Options:**
     - **A (full):** Separate Xcode project with App Clip target; QR points to your App Clip URL; App Clip fetches `GET /api/listings/[id]` and shows listing + “Message seller.” Requires iOS dev and App Clip setup.
     - **B (web fallback):** Add a route in Next.js (e.g. `/clip` or `/listings/[id]/clip`) that reads `?id=...`, fetches the listing, and shows a minimal, mobile-optimized “listing + message seller” page. QR points to `https://yourdomain.com/clip?id=...`. You can demo “scan QR → browser opens → same experience” and note “App Clip will use this URL” for the real native app later.
   - **Steps (B):**
     - Create `pages/clip.tsx` (or `pages/listings/[id]/clip.tsx`): get `id` from query, fetch listing, render minimal page (photos, address, price, confidence, “Message seller” → link to login then messages). Ensure `NEXT_PUBLIC_APP_CLIP_URL` points to this (e.g. `https://yourdomain.com/clip`). QR already uses `?id=...`.
   - **Done when:** Scanning the QR (or opening the link) opens a focused listing view and path to message seller; you can document “App Clip will replace this with native” for Devpost.

### Polish

9. **Price estimate on listing detail**
   - **Why:** Spec: “Trigger Gemini pricing endpoint → display suggested price” on listing.
   - **Steps:** On `/listings/[id]` add “Get suggested price” → call `POST /api/price-estimate` with address, sqft, bedrooms → show `price_range` and `explanation`.
   - **Done when:** Buyers or sellers can see an AI price suggestion on the listing page.

10. **Fraud-check auth**
    - **Why:** Only seller or admin should trigger a fraud check.
    - **Steps:** In `POST /api/listings/[id]/fraud-check` require auth and allow only if the user is the listing’s seller or has role ADMIN.
    - **Done when:** Unauthenticated or non-owner/non-admin can’t run fraud check.

11. **Real fraud checks** (if time)
    - **Why:** Spec lists perceptual hash, EXIF, reverse image, Canada Post, Gemini price sanity.
    - **Steps:** In `lib/api/fraud-check.ts` (or a separate service): add perceptual hash (e.g. Node `imghash` or call a small Python script), EXIF GPS (e.g. `exif-reader`), optional reverse image (Google Vision or TinEye API), optional Canada Post address validation, optional Gemini “is this price reasonable?”. Keep the same weighted score and badge logic.
    - **Done when:** At least one real check (e.g. perceptual hash or EXIF) runs and affects the score.

---

## Suggested order of work (to complete scope & stand out)

Do these in order so the demo script works and nothing is broken:

1. **Seller verification page** — Fix 404 on “Complete Verification” (minimal page or upload flow).
2. **Admin APIs + Admin review page** — Pending sellers list, approve/reject (and optional block). Then wire “Admin approves” in the demo.
3. **Seller “My Listings” + QR download** — So sellers can see their listings and download QR for the sign.
4. **“Run fraud check” in UI** — Button + show score/breakdown so judges see fraud detection.
5. **Blocked users** — Enforce `blockedReason` in app (and optionally in Auth0).
6. **Search/filters** — Use existing nearby API so home has filters (and optional map).
7. **Clip experience** — At least `/clip?id=...` web page so QR has a target; optionally add native App Clip later.
8. **Polish** — Price estimate on listing detail, auth on fraud-check, then real fraud checks if time.

---

## Demo script checklist (from your spec)

Use this to verify nothing is missing for the 3‑minute demo:

- [ ] Seller uploads gov ID + proof of ownership (needs `/seller/verify` + upload)
- [ ] Admin approves in dashboard (needs `/admin/review` + approve API)
- [ ] Seller enters address → Gemini price suggestion (you have API; optional on create form)
- [ ] Upload photos → fraud checks run → Verified badge (you have this; add “Run fraud check” button for clarity)
- [ ] Download QR (needs “My Listings” + QR download UI)
- [ ] Physical sign + scan QR → App Clip or clip page (needs `/clip` or native App Clip)
- [ ] Listing with photos + confidence (you have this)
- [ ] “Find Similar” (you have link; could wire to nearby with map later)
- [ ] “Message Seller” → Auth0 login (you have this)
- [ ] Send message → seller sees it live (you have this with WebSocket)
- [ ] Seller replies → buyer sees it in app (you have this)

---

## Quick reference: new files to add

| Step | New or updated |
|------|-----------------|
| Seller verify | `pages/seller/verify.tsx`; optional `pages/api/seller/verify-upload.ts` |
| Admin | `pages/admin/review.tsx`, `pages/api/admin/pending-sellers.ts`, `pages/api/admin/approve-seller.ts`, `pages/api/admin/reject-seller.ts` (and optional block) |
| My listings + QR | Extend `pages/seller.tsx` or add `pages/seller/listings.tsx`; use existing `POST /api/qr/generate` |
| Run fraud check in UI | Button + modal/section on `pages/listings/[id].tsx` or seller listing row |
| Blocked users | Update `lib/session-user.ts` or auth flow to check `blockedReason` |
| Search/filters | Component + state on `pages/index.tsx` calling `GET /api/listings/nearby` |
| Clip | `pages/clip.tsx` (or `pages/listings/[id]/clip.tsx`) |

Once these are done, the project will match the full scope and you’ll be in a strong position to win the hackathon and hit all four prize tracks.
