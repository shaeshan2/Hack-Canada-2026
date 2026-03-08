## Team Name: DeedScan

## Clip experiences (two)

This submission includes two DeedScan App Clip experiences:

- **DeedScanListingExperience** — Hardcoded demo listing; no API. Yard Sign touchpoint.  
  **URL pattern:** `deedscan.app/clip` (optional query: `deedscan.app/clip?id=demo_listing_001`).

- **DeedScanClipExperience** — API-backed listing; fetches from backend. On-Site touchpoint.  
  **URL pattern:** `deedscan.app/clip/:id` (e.g. `deedscan.app/clip/demo_listing_001`).  
  For lab compatibility, the clip also accepts `deedscan.app/clip/42` (id `42` is mapped to `demo_listing_001` for the API call).

---

## What Great Looks Like

Your submission is strong when it is:
- **Specific**: one clear fan moment, one clear problem, one clear outcome
- **Clip-shaped**: value in under 30 seconds, no heavy onboarding
- **Business-aware**: connects to revenue (venue, online, or both)
- **Testable**: prototype actually runs in the simulator with your URL pattern

---

### 1. Problem Framing

**Problem:** Buyers walk past for-sale signs and end up on sites built around 5% commissions. With DeedScan: scan → instant listing + neighbourhood snapshot + direct seller contact. Zero friction.

---

### 2. Proposed Solution

**Invocation:** Physical QR code on a yard sign encodes `deedscan.app/clip` or `deedscan.app/clip?id=demo_listing_001`.

**Core action:** View listing + neighbourhood info → tap Message Seller. Under 20 seconds.

**Why a Clip not an app:** Purely ephemeral lookup — people won't install an app to view one listing they passed on the street.

---

### 3. Platform Extensions (if applicable)

None required. The Clip uses hardcoded demo data (Yard Sign) and API-backed data (On-Site), with deep-links into the web app for messaging (localhost:3000 for local Auth0).

---

### 4. Prototype Description

**What does your working prototype demonstrate?**

**DeedScanListingExperience (Yard Sign tab):**
- Hardcoded demo — no API. Tap card or enter `deedscan.app/clip`.
- Uses kit design system: `ClipHeader` (title, address, house icon), glass-effect container for price + specs (beds, sqft, 0% Commission).
- **Price-drop notification:** When the user backgrounds the clip, a local notification is scheduled to fire ~3 seconds later ("🏠 Price Drop Alert — Seller just reduced the price by $5,000"). Only one notification per app session. When the user returns (or taps the notification), the price updates: original price is crossed out, new price ($1,494,000 CAD) appears beside it with a blue "Price reduced by $5,000" pill. The change animates in with a subtle opacity + scale transition.
- AI fraud score badge, Neighbourhood Snapshot sheet, Message Seller CTA. Message Seller opens localhost:3000.

**DeedScanClipExperience (On-Site tab):**
- API-backed. Tap "DeedScan Property View" card or enter `deedscan.app/clip/demo_listing_001` (or `deedscan.app/clip/42`; the clip maps `42` → `demo_listing_001` so it works with the lab default sample URL).
- Requires backend at `http://localhost:3000` with `GET /api/listings/demo_listing_001`.
- Photo gallery, property detail with glass-effect card, confidence badge (Verified/Pending/Low), Message Seller / View Full Listing CTAs, optional "More nearby" horizontal scroll when nearby listings are returned.

---

### 5. Impact Hypothesis

**Impact:** Removes the real estate agent as gatekeeper at the very first touchpoint in the transaction.

---

### Notification Strategy

DeedScan uses time-sensitive push notifications to re-engage users when listing context is fresh. This aligns with the 8-hour ephemeral push window concept for App Clips.

**Yard Sign clip (DeedScanListingExperience):**
- **When:** Notification is scheduled when the user backgrounds the clip (e.g. leaves to check another app or locks the phone).
- **Delay:** Fires ~3 seconds after the user leaves.
- **Frequency:** One notification per app session — no repeated alerts.
- **Content:** "🏠 Price Drop Alert — [Listing title] — Seller just reduced the price by $5,000. Tap to view."
- **On return:** When the user taps the notification or switches back to the app after 3+ seconds, the clip shows the reduced price: original price struck through, new price ($1,494,000 CAD) displayed, and a blue "Price reduced by $5,000" pill. The update animates in.
- **Rationale:** Keeps the buyer engaged when they've just walked past a sign; a price drop is a high-intent nudge to return.

---

### Demo Video

**Required for PR acceptance.** Add a link to a short screen recording that shows:
- Tap card (or enter URL) → property loads
- Message Seller and/or Neighbourhood sheet
- **Yard Sign:** Background the app → wait ~3 seconds → receive price-drop notification → return to clip → see reduced price (strikethrough + new price + blue pill)

Upload the video (e.g. Google Drive, Loom, YouTube unlisted, or GitHub), then replace the placeholder below with the actual URL.

**Link:** [Demo Video](https://youtube.com/shorts/wzLnYR_VtZU?feature=share)

### Screenshot(s)

**Required for PR acceptance.** Screenshots are stored in `Submissions/deedscan/screenshots/` and embedded below.

| Experience | Description |
|------------|-------------|
| **On-Site (API-backed)** | Property detail, Verified badge, Message Seller / View Full Listing, More nearby |
| **Yard Sign (hardcoded)** | ClipHeader, glass price+specs card, savings pill, AI badge, price-drop alert cue, Neighbourhood Snapshot, Message Seller |

#### Property view — On-Site clip (DeedScanClipExperience)

![Property view — On-Site](screenshots/property-view-on-site.png)

#### Property view — Yard Sign clip (DeedScanListingExperience)

![Property view — Yard Sign](screenshots/property-view-yard-sign.png)

*(Optional: add screenshots for price-drop state (strikethrough + new price), Neighbourhood "See more" sheet, or Message Seller CTA.)*
