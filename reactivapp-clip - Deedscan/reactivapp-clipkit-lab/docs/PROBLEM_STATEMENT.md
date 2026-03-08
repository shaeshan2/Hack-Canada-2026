# Problem Statement: Reactiv ClipKit Lab

# Overview

This problem statement is for Hack Canada teams. You are not expected to build a production system. Your goal is to **design and prototype a solution** that uses Reactiv Clips to address a real friction point in the concert merchandise experience — and, where relevant, propose enhancements to the Reactiv Clips platform itself.

---

# Company Backgrounds

## Merchant Context

Many merchant partners run merchandise stores for major performing artists. Their catalog includes artist-branded apparel (t-shirts, hoodies), physical music (vinyl records, CDs), and collectibles. They typically operate through two sales channels.

**Concert Venue Booths** — A major share of revenue comes from physical merchandise booths at concert venues on show day. Significant sales potential is often left on the table because fans who want merchandise are discouraged by long lines and in-person payment friction.

**Artist Websites** — Merchants also operate artist-branded e-commerce stores. Online sales are often more profitable per unit, because venue sales require sharing a percentage of revenue with the venue operator.

> **A key constraint:** Merchants often do not sell concert tickets directly. Tickets are sold by third-party platforms that usually do not share fan-level customer data. This makes proactive pre/post-show engagement difficult.

## Reactiv

Reactiv provides a platform for building and managing mobile commerce apps for e-commerce businesses. Its key differentiator is **Reactiv Clips**, powered by Apple's App Clip technology.

**What is an App Clip?**

An App Clip is a lightweight slice of an app that lets users complete a specific task quickly — without downloading the full app. App Clips can be triggered in several ways:

- Scanning an **App Clip code** (similar to a QR code)
- Tapping an **NFC tag**
- Tapping a **link sent via iMessage**
- Tapping a **Smart App Banner** in Safari
- Through **Siri suggestions** or **Apple Maps**

**Reactiv Clips — Key Capability:**

When a user opens a Reactiv Clip for a brand, that brand can send the user **push notifications for up to 8 hours**. This creates a short but powerful window for targeted, time-sensitive engagement.

---

# The Problem

Merchants want to increase merchandise sales — both online and at concert venues — but face several structural challenges:

1. **No direct customer relationship before the show** — merchants cannot reach ticket buyers proactively, because ticketing platforms do not share customer data.
2. **Lost venue sales** — Many fans want to buy merchandise at shows but are deterred by long lines or the friction of cash and card transactions in a crowded venue.
3. **Revenue split at venues** — In-venue sales are less profitable than online sales, because merchants share a percentage with the venue.

**Your challenge:** Use Reactiv Clips to reduce friction at one or more touchpoints in the customer journey — helping brands capture sales they currently miss, whether online or at the venue.

---

# The Concert Customer Journey

Consider the full lifecycle of a concert-goer when deciding where your solution should intervene. Your solution should target **at least one** of these touchpoints and make a clear case for why it represents the most valuable opportunity.

1. **Discovery** — A fan learns about a concert in their city through social media ads, posts from friends, or organic search.
2. **Ticket Purchase** — The fan browses and buys tickets through Ticketmaster or a similar platform.
3. **The Wait** — The period between buying tickets and the show itself — often weeks or months. Fans are engaged but have no direct relationship with the merchant.
4. **Show Day** — The fan arrives at the venue, waits in queues, and moves through the event experience. High purchase intent, high friction.
5. **Post-Show Afterglow** — The fan leaves the show in a heightened emotional state. Engagement and nostalgia are high in the hours and days that follow.

---

# Assumptions & Constraints

You may assume the following:

1. **iOS only.** Your solution needs to work on iPhone. Reactiv Clips are an Apple technology (App Clips). Over 80% of North American mobile commerce occurs on iPhones, so an iOS-only solution is commercially reasonable.
2. **Reactiv platform capabilities are given.** The Reactiv platform will provide App Clip invocation (via all methods listed above), push notifications for up to 8 hours after a Clip is opened, and the ability to build and manage a branded mobile storefront per artist — all without custom code from your team.
3. **Extending Reactiv Clips is in scope.** You may propose new features or enhancements to the Reactiv Clips platform itself — not just applications of existing features. Be explicit about what is a new capability vs. what already exists.
4. **No ticketing integration is available.** Assume no programmatic access to ticketing customer or ticket data. Any solution must work around this constraint.

---

# What You Should Deliver

Your submission should address the following:

- **Problem framing** — Which touchpoint(s) in the customer journey are you targeting, and why? What friction or missed opportunity are you solving for?
- **Proposed solution** — How does your solution use Reactiv Clips? How is the Clip invoked? What does the user experience look like end-to-end?
- **Platform extensions** *(if applicable)* — If your solution requires new Reactiv Clips capabilities, describe what they are and how they would work.
- **Prototype or mockup** — A working prototype in the ReactivChallengeKit simulator demonstrating the key user flows.
- **Impact hypothesis** — How does your solution increase merchandise revenue? Be specific about which channel (venue, online, or both) and why.

---

# Supporting Resources

- [Apple App Clips Developer Documentation](https://developer.apple.com/documentation/appclip)
- [CONSTRAINTS.md](CONSTRAINTS.md) — App Clip constraints and how they apply to this challenge
- [JOURNEY.md](JOURNEY.md) — Detailed guide for each concert customer journey touchpoint
