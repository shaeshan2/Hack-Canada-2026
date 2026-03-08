# Reactiv ClipKit Lab

[![Build](https://github.com/reactivapp/reactivapp-clipkit-lab/actions/workflows/test.yml/badge.svg)](https://github.com/reactivapp/reactivapp-clipkit-lab/actions/workflows/test.yml)

An App Clip simulator for Hack Canada. Build creative App Clip experiences without needing entitlements, Associated Domains, or an Apple Developer account.

An App Clip is a lightweight slice of an app that lets users complete a specific task quickly without downloading the full app. They can be triggered by:

- Opening from an App Clip code or URL trigger
- Tapping an NFC tag
- Tapping a link sent via iMessage
- Tapping a Smart App Banner in Safari
- Siri suggestions or Apple Maps

No install, no login, no onboarding. Apple designed them for "30-second moments." Most people only think of them as "scan to pay." **Your challenge: what else should App Clips be used for that nobody has built yet?**

## About Reactiv

Reactiv is a platform for building and managing mobile commerce apps for e-commerce businesses. Its key differentiator is **Reactiv Clips**, powered by Apple's App Clip technology.

### Reactiv Clips

Reactiv Clips bring App Clip technology to any Shopify merchant. Install directly from the Shopify App Store, build Clip experiences with a drag-and-drop visual builder or generate them with AI, and go live without writing code. Clips support configurable push notifications, giving brands up to 8 hours of direct, time-sensitive engagement after a single interaction. No app install, no account creation. Just instant access and a direct communication channel.

Reactiv integrates natively with Shopify for product catalog, cart, and checkout, and supports third-party providers for payments and analytics.

Learn more: [Reactiv Mobile App Builder](https://reactiv.ai/)

## Problem Statements

Here are example problem statements from Reactiv. Pick one, combine elements from several, or invent your own and build a Clip that solves it. These are meant to spark ideas, not limit them. If you see a problem worth solving that isn't listed here, go for it.

When you're done, create a branch and open a pull request with a description that explains your solution. Include screen recordings of it working so judges can see the experience in action.

Starter templates are provided so you can focus on your solution, not scaffolding. Reactiv retains ownership of submitted code.

---

### AI-Powered Personalization

**Scenario:** A customer walks up to a coffee shop counter, opens a Clip from a code or link trigger, and gets instant personalized recommendations using context like time of day, weather, and location.

**The problem:** Personalization today requires accounts, history, and data collection. App Clips have none of that. But context is everywhere: time, location, weather, device locale, even the URL itself. AI can bridge the gap between zero knowledge and a tailored experience.

**Key questions to explore:**

- How do you personalize meaningfully with no user history or stored preferences?
- What contextual signals (time, location, weather, URL parameters) can drive smart defaults?
- How do you make AI-driven recommendations feel helpful rather than invasive in a zero-trust environment?

---

### In-Store Companion Shopping

**Scenario:** A shopper walks into a retail location. The store's App Clip surfaces via Apple Maps, Siri Suggestions, or a venue trigger link. The Clip becomes a companion shopping experience: browse products, view details and pricing, and self-checkout directly from the phone.

**The problem:** In-store shopping still relies on checkout lines, clunky kiosks, and staff availability. A Clip could replace all of that, but only if product discovery is fast and payment is seamless in an ephemeral, no-account experience.

**Key questions to explore:**

- How do you make product discovery fast and intuitive in a Clip?
- How does self-checkout work in an ephemeral, no-account experience?
- What does the transition from browsing to payment look like in under 30 seconds?

**Tip:** The Shopify Storefront API and Shopify CheckoutSheet Kit make it easy to handle product browsing and checkout. Stripe is another option for payment processing.

---

### Ad-to-Clip Commerce

**Scenario:** A shopper sees an ad on Instagram, taps it, and lands in an App Clip instead of a mobile website. A faster, more polished native experience. They browse products, add items to their cart, and leave. The Clip fires push notifications at intervals (15 minutes, 1 hour, 8 hours) to bring them back to complete checkout. After purchasing, the shopper is prompted to download the full app.

**The problem:** Mobile ad funnels are broken. Click-through rates are low, mobile web is slow, and users abandon carts constantly. A Clip offers a native-quality experience at web-link speed, but the challenge is keeping users engaged across sessions without a full app install.

**Key questions to explore:**

- How do you make the ad-to-Clip transition feel instant and seamless?
- How do you design a cart and checkout flow that survives the user leaving and returning?
- How do you use push notifications effectively without being intrusive?
- What does the handoff from Clip to full app look like?

**Tip:** The Shopify Storefront API and Shopify CheckoutSheet Kit make it easy to handle cart and checkout flows. Stripe is another option for payment processing.

---

### Live Events — Arenas, Concerts & Sports

**Scenario:** A fan arrives at a venue, opens a Clip from a trigger, and launches instantly into merch purchases, real-time engagement, signups, and more.

**The problem:** Artists and performers don't know who their audience is. Ticket platforms report sales totals but share zero fan-level data. Artists end up running ads just to reconnect with people who already showed up.

**Key questions to explore:**

- How can a Clip capture fan identity at scale with no app install and no friction?
- How can it power real-time engagement during an event?
- How can it enable merch sales and audience building in a single interaction?

Consider the full lifecycle of a concert-goer when deciding where your solution should intervene. Your solution should target **at least one** of these touchpoints and make a clear case for why it represents the most valuable opportunity.

1. **Discovery** — A fan learns about a concert in their city through social media ads, posts from friends, or organic search.
2. **Ticket Purchase** — The fan browses and buys tickets through Ticketmaster or a similar platform.
3. **The Wait** — The period between buying tickets and the show itself — often weeks or months. Fans are engaged but brands have no direct relationship with them.
4. **Show Day** — The fan arrives at the venue, waits in queues, and moves through the event experience. High purchase intent, high friction.
5. **Post-Show Afterglow** — The fan leaves the show in a heightened emotional state. Engagement and nostalgia are high in the hours and days that follow.

## Assumptions & Constraints

- **iOS only.** Your solution needs to work on iPhone. Reactiv Clips are an Apple technology (App Clips). Over 80% of North American mobile commerce occurs on iPhones, so an iOS-only solution is commercially reasonable.
- Avoid trivial builds (e.g., coupon/discount apps with no depth).
- Think commercially and technically. Aim for solutions that could ship or directly inform product roadmap decisions.
- Reasonable assumptions are allowed where integrations are unavailable (e.g., Shopify API access may be provided).
- All implementations should be runnable Swift-based Clips built on this starter kit.

## Requirements

- **macOS** with [Xcode 26+](https://developer.apple.com/xcode/) installed
- **iOS 26+** simulator or device
- **Swift 5.0**
- No external dependencies (no SPM, CocoaPods, or Carthage)

## Setup

1. Download [Xcode 26+](https://developer.apple.com/xcode/) from the Mac App Store or Apple Developer website (free, requires a Mac)
2. Clone this repository
3. Open `ReactivChallengeKit/ReactivChallengeKit.xcodeproj` in Xcode
4. Select an iPhone simulator
5. Build and Run (Cmd+R)

No dependencies. No SPM packages. If Xcode works, the project works.

### Why no App Clip setup is required here

This lab runs inside a **main app target** with a simulator shell. You do **not** need real App Clip plumbing to participate:

- No separate App Clip target
- No Associated Domains entitlement
- No `onContinueUserActivity` wiring
- No App Clip Code / invocation entitlement setup

Use this repo to focus on product decisions, flow quality, and 30-second UX — not App Clip setup plumbing.

## Zero-to-PR Quickstart

[Quick Start Video](https://drive.google.com/file/d/1DCc-6cTfAb-m0l9zo39bzyB5LHp56Wh4/view?usp=drivesdk)

### 0) Set the goal

You are building one focused App Clip experience that:
- Runs in simulator
- Is invokable by URL

That is it. Not a full app. Not multiple tabs. One clear moment.

### 1) Clone and run

1. Clone the repo
2. Open `ReactivChallengeKit/ReactivChallengeKit.xcodeproj`
3. Select an iPhone simulator
4. Press **Cmd + R**

You should see:
- Landing screen with example clips
- Invocation URL console at the bottom

If it does not build:
- Product -> Clean Build Folder (**Cmd + Shift + K**)
- Run again

### 2) Understand the playground

You can trigger experiences in two ways:
- Tap a card on landing
- Enter a URL in the console (simulates a real App Clip trigger)

Quickly scan:
- `docs/README.md` — docs index
- `docs/CONSTRAINTS.md` — App Clip limits
- `docs/SUBMISSION.md` — what judges expect

### 3) Create your submission folder

From repo root:

```bash
bash scripts/doctor.sh
bash scripts/create-submission.sh "Your Team Name"
```

Optional custom experience name:

```bash
bash scripts/create-submission.sh "Team 42" "Team42CampusCheckinExperience"
```

Important:
- Team names are slugged for folder names (`Team 42` -> `team-42`)
- The script prints the exact created folder and Swift file path

Then open:
- `Submissions/<team-slug>/<YourExperience>.swift`
- `Submissions/<team-slug>/SUBMISSION.md`

If Xcode shows your team file without Target Membership, that is expected in this lab.
Submissions compile through generated `GeneratedSubmissions.swift`.

### 4) Define your clip identity

In your experience file, set:
- `urlPattern`
- `clipName`
- `clipDescription`
- `teamName`
- `touchpoint`
- `invocationSource`

Example URL pattern:
- `example.com/store/:storeId/checkin`

Keep it realistic. Think like a real business.

### 5) Build the UI

Keep it simple and focused:
- Use provided components (`ClipHeader`, `MerchGrid`, `CartSummary`, etc.) or write your own
- Build one clear flow that finishes fast
- Use `ScrollView` so content does not fight host overlays
- Do not manually add `ConstraintBanner()` (host injects it)

If your clip takes more than 30 seconds to understand, it is too complex.

### 6) Make sure it appears

Run **Cmd + R**.

It should auto-register because:
- Build runs `scripts/generate-registry.sh`
- `SubmissionRegistry.swift` updates
- Router includes your clip

If it does not show up:

```bash
bash scripts/generate-registry.sh
```

Then rebuild.

### 7) Test URL invocation

If your pattern is:
- `example.com/store/:storeId/checkin`

Test with:
- `example.com/store/42/checkin`

Expected:
- Your clip opens
- Path parameters parse correctly

If invocation fails, your URL pattern is wrong. Fix that first.

### 8) Validate before opening PR

Quick checklist:
- Builds locally
- URL invocation works
- One complete flow works end-to-end
- Value is obvious in under 30 seconds
- `SUBMISSION.md` has all required sections
- Demo video/screenshots included

### 9) Submit

1. Commit only files under `Submissions/<team-slug>/` (unless maintainers ask otherwise)
2. Push your branch
3. Open a PR
4. Wait for CI check (`PR Validation - ClipKit Build / Build & Validate`)
5. Fix anything that fails

### 10) Final gut check

Ask yourself:
- What problem am I solving?
- How is this clip invoked?
- What is the core action?
- Why is this better as a Clip, not a full app?
- Why would a business care?

## What You Get

| Component             | What It Does                                                                     |
| --------------------- | -------------------------------------------------------------------------------- |
| **InvocationConsole** | URL input with send button. Simulates how real clips are triggered by URLs.      |
| **ClipRouter**        | Matches URLs against registered patterns and extracts path parameters.           |
| **ConstraintBanner**  | "App Clip Preview — Get the full app" bar. Always visible, just like real clips. |
| **MomentTimer**       | Seconds-since-invocation pill. Green < 20s, yellow < 30s, red >= 30s.            |

## What You Bring

Everything else is yours. Use any iOS framework: URLSession, CoreLocation, MapKit, AVFoundation, CoreNFC, or any SwiftUI view.

No mock services are provided. You choose the domain, the data, and the experience.

## What You Should Deliver

Your submission should address the following:

- **Problem framing** — Which touchpoint(s) in the customer journey are you targeting, and why? What friction or missed opportunity are you solving for?
- **Proposed solution** — How does your solution use Reactiv Clips? How is the Clip invoked? What does the user experience look like end-to-end?
- **Platform extensions (if applicable)** — If your solution requires new Reactiv Clips capabilities, describe what they are and how they would work.
- **Prototype or mockup** — A visual demonstration of the key user flows (wireframes, clickable prototype, or equivalent).
- **Impact hypothesis** — How does your solution increase merchandise revenue? Be specific about which channel (venue, online, or both) and why.

## Project Structure

```
ReactivChallengeKit/
  ReactivChallengeKit.xcodeproj
  ReactivChallengeKit/
    ReactivChallengeKitApp.swift
    SubmissionRegistry.swift
    GeneratedSubmissions.swift
    Simulator/
      SimulatorShell.swift
      ClipRouter.swift
      LandingView.swift
      InvocationConsole.swift
      ConstraintBanner.swift
      MomentTimer.swift
    Protocol/
      ClipExperience.swift
      ClipContext.swift
    Components/
      ... reusable UI building blocks ...
    Examples/
      VenueMerchExperience.swift
      TrailCheckInExperience.swift
      EmptyClipExperience.swift
    MockData/
      ChallengeMockData.swift
Submissions/
  _template/
  <team-slug>/
scripts/
  doctor.sh
  create-submission.sh
  generate-registry.sh
docs/
  README.md
  CONSTRAINTS.md
  JOURNEY.md
  SUBMISSION.md
```

## Challenge Rules

1. Your clip must be invoked via URL (use the InvocationConsole)
2. Your experience should deliver value in under 30 seconds (watch the timer)
3. Your clip should make sense as a no-install, ephemeral experience
4. Fill out `SUBMISSION.md` with your team info and idea description
5. Read `CONSTRAINTS.md` to understand real App Clip constraints

## Judging Criteria

| Criteria                   | Weight |
| -------------------------- | ------ |
| Novelty of use case        | 30%    |
| Constraint awareness       | 25%    |
| Real-world trigger quality | 20%    |
| Execution / demo           | 15%    |
| Scalability of the idea    | 10%    |

The question is NOT "can you build an iOS app?" The question is: **"what experience fits the shape of an App Clip that nobody has thought of?"**

## Supporting Resources

- [Apple App Clips Developer Documentation](https://developer.apple.com/documentation/appclip)
