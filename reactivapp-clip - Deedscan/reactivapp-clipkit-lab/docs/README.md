# Documentation Entry

Canonical guide:

- [Root README](../README.md)

Additional docs:

- [CONSTRAINTS.md](CONSTRAINTS.md)
- [JOURNEY.md](JOURNEY.md)
- [SUBMISSION.md](SUBMISSION.md)
- [PROBLEM_STATEMENT.md](PROBLEM_STATEMENT.md)
# Reactiv ClipKit Lab

An App Clip simulator for Hack Canada. Build creative App Clip experiences without needing entitlements, Associated Domains, or an Apple Developer account.

An App Clip is a lightweight slice of an app that lets users complete a specific task quickly, without downloading the full app. They can be triggered by:

- Opening from an App Clip code or URL trigger
- Tapping an NFC tag
- Tapping a link sent via iMessage
- Tapping a Smart App Banner in Safari
- Siri suggestions or Apple Maps

No install, no login, no onboarding. Apple designed them for "30-second moments." Most people only think of them as "scan to pay." **Your challenge: what else should App Clips be used for that nobody has built yet?**

## About Reactiv

Reactiv is a platform for building and managing mobile commerce apps for e-commerce businesses. Its key differentiator is **Reactiv Clips**, powered by Apple's App Clip technology.

### Reactiv Clips

Reactiv Clips bring App Clip technology to any Shopify merchant. Install directly from the Shopify App Store, build Clip experiences with a visual builder or generate them with AI, and go live without writing code. Clips support configurable push notifications, giving brands up to 8 hours of direct, time-sensitive engagement after a single interaction.

Learn more: [Reactiv Mobile App Builder](https://reactiv.ai/)

---

## Problem Statements (Pick One, Combine, or Invent Your Own)

You are not limited to a single domain. Use these as inspiration:

1. **AI-Powered Personalization**  
   Personalize instantly using context (time, location, weather, URL params) without login/history.

2. **In-Store Companion Shopping**  
   Help shoppers browse and self-checkout in under 30 seconds from in-store triggers.

3. **Ad-to-Clip Commerce**  
   Route ad traffic into a native Clip flow and recover intent with the 8-hour notification window.

4. **Live Events — Arenas, Concerts & Sports**  
   Capture fan engagement, merch intent, and audience growth at peak emotional moments.

For the event use case, see detailed journey context in [JOURNEY.md](JOURNEY.md) and full background in [PROBLEM_STATEMENT.md](PROBLEM_STATEMENT.md).

---

## Assumptions & Constraints

- **iOS only.** Build for iPhone.
- Build a **runnable Swift Clip experience** in this simulator (not just mockups).
- Avoid trivial ideas (e.g. generic coupon app with no depth).
- Design for App Clip shape: URL invocation, no onboarding, immediate value.
- Think commercially and technically: something that could ship or inform roadmap.

---

## Setup

1. Clone this repository
2. Open `ReactivChallengeKit/ReactivChallengeKit.xcodeproj` in Xcode
3. Select an iPhone simulator and press **Cmd+R**

No dependencies. No SPM packages. No CocoaPods. If Xcode builds, you're ready.

### Why no App Clip setup is required here

This lab runs inside a **main app target** plus simulator shell. You do **not** need real App Clip setup to build your submission:

- No separate App Clip target
- No Associated Domains entitlement
- No `onContinueUserActivity` implementation
- No App Clip invocation entitlement wiring

Focus on the product and UX first.

---

## 10-Minute Quickstart (First Success)

If you are new to SwiftUI or App Clips, follow this exactly:

1. Run the simulator (`Cmd+R`) and confirm the landing screen opens.
2. Copy template: `cp -r Submissions/_template Submissions/YourTeamName`
3. Open `Submissions/YourTeamName/MyClipExperience.swift`
4. Rename struct + fill these 4 fields:
   - `urlPattern`
   - `clipName`
   - `clipDescription`
   - `teamName`
5. Run again (`Cmd+R`) and confirm your clip appears on landing.
6. Use Invocation Console with a matching URL and verify your clip opens.

**You are done with setup when all 3 are true:**

- Your clip card appears on landing
- Your URL pattern invokes your clip correctly
- `Submissions/YourTeamName/SUBMISSION.md` is started

---

## Build Your Clip

### Step 1: Create your team directory

```
cp -r Submissions/_template Submissions/YourTeamName
```

### Step 2: Rename and edit your experience

Open `Submissions/YourTeamName/MyClipExperience.swift`. Rename the struct, set your URL pattern, and build your UI.
If Xcode shows Target Membership unchecked for your team file, that is expected in this lab.

```swift
struct PreShowHypeExperience: ClipExperience {
    static let urlPattern = "example.com/show/:showId/preorder"
    static let clipName = "Pre-Show Pre-Order"
    static let clipDescription = "Pre-order merch before the show — skip the line on show day."
    static let teamName = "Team Waterloo"

    let context: ClipContext
    @State private var cart: [Product] = []
    @State private var ordered = false

    var body: some View {
        ZStack {
            ClipBackground()
            ScrollView {
                VStack(spacing: 16) {
                    ArtistBanner(artist: ChallengeMockData.artists[0], venue: "Rogers Centre")

                    if ordered {
                        ClipSuccessOverlay(message: "Pre-order confirmed! Pick up at Booth #3.")
                    } else {
                        MerchGrid(products: ChallengeMockData.products) { product in
                            cart.append(product)
                        }
                        if !cart.isEmpty {
                            CartSummary(items: cart) { ordered = true }
                        }
                    }
                }
                .padding(.bottom, 16)
            }
        }
    }
}
```

Touchpoints are extendable. You can use built-ins (`.discovery`, `.purchase`, `.onSite`, `.reengagement`, `.utility`) or define your own:

```swift
static let touchpoint = JourneyTouchpoint(
    id: "campus-checkin",
    title: "Campus Check-In",
    icon: "person.badge.key.fill",
    context: "Student arrives and needs quick check-in.",
    notificationHint: "Send a completion reminder within the 8h window.",
    sortOrder: 35
)
```

### Step 3: Rebuild

The build script auto-discovers your experience from `Submissions/`. Run **Cmd+R** and your clip appears in the landing screen.
If it does not appear, run `bash scripts/generate-registry.sh` once and rebuild.
Submissions are compiled through `GeneratedSubmissions.swift`, so team-file target membership checkbox state does not block build.

### Step 4: Test

Type your invocation URL in the console at the bottom (e.g., `example.com/show/tonight/preorder`) and tap **Invoke**.

---

## Common Mistakes (Avoid These)

1. **URL does not open your clip**
   - `urlPattern` and tested URL must match segment-by-segment (including host/path shape).
2. **Clip not showing on landing**
   - Experience must conform to `ClipExperience` and live inside your `Submissions/YourTeamName/` folder.
3. **PR fails validation**
   - `SUBMISSION.md` still has placeholder values or files were edited outside `Submissions/YourTeamName/`.
4. **Layout overlaps with simulator chrome**
   - Use `ScrollView` and building blocks; do not manually add top spacers for host controls.
5. **Duplicated App Clip banner**
   - Do not add `ConstraintBanner()` in your submission; simulator host already injects it.

---

## Available Building Blocks

Pre-built components you can compose without deep SwiftUI knowledge. See `ReactivChallengeKit/Components/`.

| Component                                 | What It Does                                                           |
| ----------------------------------------- | ---------------------------------------------------------------------- |
| `ClipBackground()`                        | Neutral system background that adapts to light/dark mode               |
| `ClipHeader(title:subtitle:systemImage:)` | Title + subtitle + SF Symbol icon                                      |
| `ClipActionButton(title:icon:action:)`    | Large styled call-to-action button                                     |
| `ClipSuccessOverlay(message:)`            | Animated checkmark + confirmation message                              |
| `ArtistBanner(artist:venue:showDate:)`    | Artist name, tour name, venue — concert poster style                   |
| `MerchProductCard(product:onAddToCart:)`  | Single product with price and "Add" button                             |
| `MerchGrid(products:onAddToCart:)`        | 2-column product grid                                                  |
| `CartSummary(items:onCheckout:)`          | Expandable cart with total and checkout button                         |
| `NotificationPreview(template:)`          | Mock iOS notification bubble                                           |
| `NotificationTimeline(templates:)`        | Horizontal scroll of notification previews                             |
| `ConstraintBanner()`                      | "App Clip Preview — Get the full app" bar (injected by simulator host) |

---

## Mock Data

`ChallengeMockData` provides ready-to-use data so you can focus on the experience:

| Data                       | Access                                      |
| -------------------------- | ------------------------------------------- |
| Artist profiles            | `ChallengeMockData.artists`                 |
| Merch catalog (8 items)    | `ChallengeMockData.products`                |
| Featured products (top 4)  | `ChallengeMockData.featuredProducts`        |
| Products by category       | `ChallengeMockData.products(for: .apparel)` |
| Venue info                 | `ChallengeMockData.venues`                  |
| Show schedule              | `ChallengeMockData.shows`                   |
| Push notification examples | `ChallengeMockData.notificationTemplates`   |

---

## Submit

1. Fill out `Submissions/YourTeamName/SUBMISSION.md` with all 5 deliverables
2. Fork this repo, push your team directory, and open a PR
3. Your PR should only add files in `Submissions/YourTeamName/` — do not edit shared code
4. Include demo video link or screenshots in your submission

---

## Simulator Components (provided)

| Component             | What It Does                                                            |
| --------------------- | ----------------------------------------------------------------------- |
| **InvocationConsole** | URL text field + Invoke button. Simulates how real clips are triggered. |
| **ClipRouter**        | Matches URLs against registered patterns and extracts path parameters.  |
| **ConstraintBanner**  | "This is an App Clip" bar. Always visible, like real clips.             |
| **MomentTimer**       | Seconds-since-invocation. Green < 20s, yellow < 30s, red >= 30s.        |

---

## Constraints

Real App Clips have hard constraints. Read [CONSTRAINTS.md](CONSTRAINTS.md) to understand them — they're not limitations, they're a design language.

The question is NOT "can you build an iOS app?" The question is: **"what experience fits the shape of an App Clip that nobody has built yet?"**

## Supporting Resources

- [Apple App Clips Developer Documentation](https://developer.apple.com/documentation/appclip)
