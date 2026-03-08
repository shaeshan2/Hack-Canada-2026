# App Clip Constraints

Real App Clips have hard constraints enforced by iOS. This simulator replicates the important ones so you can design within the same boundaries. Understanding these constraints is essential -- they're not limitations, they're a design language.

## URL-Based Invocation

App Clips are **always** triggered by a URL. There is no app icon on the home screen. There is no way to "open" a clip manually.

In the real world, that URL comes from one of these sources:

- **QR Code** -- printed on a physical surface (menu, sign, poster, product)
- **NFC Tag** -- embedded in an object (tap your phone to a sticker, card, or device)
- **Safari Smart Banner** -- appears when visiting a website that has an associated clip
- **Messages / SMS** -- a link shared in iMessage or SMS
- **Apple Maps** -- location-based clip cards (e.g., a restaurant on the map)
- **Siri Suggestions** -- iOS surfaces recently used clips
- **App Clip Codes** -- Apple's custom visual codes (like a branded QR code)

**In this simulator:** The InvocationConsole replaces all of these. You type a URL and tap Invoke. When designing your clip, think about which real invocation source would trigger it.

## 15 MB Size Limit

Real App Clips must be under 15 MB. This means:

- No large asset bundles
- No bundled ML models (use on-device APIs or server-side)
- No video files
- Minimal images

**In this simulator:** Not enforced, but keep it in mind. Your clip should be lightweight by nature.

## Ephemeral Lifecycle

App Clips are **not installed**. They appear, do their job, and disappear. Specifically:

- **No persistent storage across sessions.** UserDefaults and files are wiped after a period of inactivity (iOS decides when). Do not rely on saved state.
- **No login flows.** Users won't create accounts for a 30-second experience. Use Sign in with Apple if authentication is truly needed.
- **No onboarding.** No tutorials, no walkthrough screens, no "welcome" pages. The clip must be immediately useful.
- **No push notifications** (unless the user explicitly grants permission, which is rare for clips).
- **No background processing.** When the user leaves, the clip is done.

**In this simulator:** Nothing prevents you from using UserDefaults, but design as if you can't. The real thing won't let you keep it.

## The 30-Second Moment

Apple's guideline: an App Clip should deliver value in **under 30 seconds**. This isn't a strict technical limit -- the clip won't crash at 31 seconds. But it's the design intent.

Think of it this way: the user is standing in front of something. They scan a code. They need something done. They do it. They put their phone away. That's the moment.

**In this simulator:** The MomentTimer overlay counts seconds since invocation. Green means you're in the zone. Yellow (20s+) means you're pushing it. Red (30s+) means your experience is too complex for a clip.

## Single Focused Task

An App Clip does **one thing**. Not a mini-app with tabs. Not a feature sampler. One task, one screen, one outcome.

- Ordering a coffee: yes
- Browsing a full restaurant menu with filters and favorites: no
- Checking into a location: yes
- A full event management dashboard: no

**In this simulator:** Your ClipExperience is a single View. You can use sheets and alerts within it, but you shouldn't be building multi-screen navigation flows.

## Limited Frameworks

Real App Clips can use most iOS frameworks, but some are restricted:

**Available:** SwiftUI, UIKit, MapKit, CoreLocation, AVFoundation, CoreNFC, HealthKit (limited), CallKit, StoreKit (for App Store overlay)

**Not available or restricted:** Background fetch, Background audio, Certain Bluetooth operations, Full file system access

**In this simulator:** All iOS simulator frameworks are available. Just be aware that your idea should only rely on frameworks a real clip could use.

## The 8-Hour Push Notification Window

This is unique to App Clips and critical to this challenge. When a user opens an App Clip, the app can send **ephemeral push notifications for up to 8 hours** — without the user explicitly granting notification permission.

This means:
- Fan opens a Clip at 7 PM when doors open → the brand can push notifications until 3 AM
- Each notification can deep-link back to the Clip or to the online store
- The window resets each time the Clip is opened

**In the concert context, this is transformative:**
- **Show Day (7 PM):** "Intermission deal: 20% off vinyl for 15 minutes"
- **During show (9 PM):** "Order from your seat — pick up at Booth #3, no line"
- **Post-show (11 PM):** "Missed the merch booth? Free shipping until midnight"
- **Late night (2 AM):** "Last chance: only 12 tour-exclusive vinyls left"

**In this simulator:** Notifications are not enforced, but describe your notification strategy in SUBMISSION.md. Use the `NotificationPreview` component to visualize what your pushes would look like.

---

## Constraints in the Concert Context

Each App Clip constraint maps directly to the concert merch experience:

| Constraint | Concert Reality |
|---|---|
| **URL invocation** | QR codes on booth signage, NFC tags on wristbands, iMessage links from friends, Smart App Banners on artist websites |
| **15 MB size limit** | No bundled product images — load from server or use placeholders. Keep it lean. |
| **Ephemeral lifecycle** | Fan opens Clip at the show, buys merch, puts phone away. No account needed, no saved state. |
| **30-second moment** | Fan is standing in a crowded venue or sitting in their seat. Browse, tap, done. |
| **Single focused task** | "Buy this merch" or "Pre-order for pickup" — not a full shopping app with categories and wishlist. |
| **8-hour notifications** | The bridge between show-day and post-show. Time-sensitive offers when purchase intent is highest. |

---

## What This All Means for Design

The constraints of App Clips define a specific *shape* of experience:

1. **Instant value** -- no setup, no configuration, no learning curve
2. **Zero onboarding** -- the context IS the onboarding (the QR code on the table tells you what this does)
3. **Single task** -- do one thing well, then get out of the way
4. **Physical-digital bridge** -- most great clips connect a physical moment to a digital action
5. **No commitment required** -- the user gives you 30 seconds and zero personal data

If your idea doesn't fit this shape, it's probably an app, not a clip. And that's fine -- the challenge is to find ideas that *do* fit.

## The Key Question

> Would the user install a full app for this? If yes, it's probably an app.
> Would the user NOT install an app but still want this? That's a clip.
