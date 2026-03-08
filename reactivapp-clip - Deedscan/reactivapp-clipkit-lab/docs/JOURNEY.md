# Concert Customer Journey — Touchpoint Guide

Each touchpoint represents a moment where a Reactiv Clip could create value for both brand and user. Your solution should target **at least one** of these and make a clear case for why it is the most valuable opportunity.

---

## 1. Discovery

**When it happens:** A fan discovers a concert through social media, a friend's post, or organic search. They're interested but haven't committed yet.

**Emotional state:** Curious, excited, exploratory.

**How a Clip could be invoked:**
- Smart App Banner on the artist's website
- Link shared in iMessage or group chat
- Siri Suggestion after browsing concert info

**What the Clip could do:**
- Show exclusive merch tied to this tour
- Offer early-bird merch bundles (buy with ticket)
- Build hype with limited-edition previews

**Notification strategy:** After the fan opens the Clip, push a reminder: "Tickets going fast — grab a merch bundle before they sell out." The 8-hour window may be enough to convert browsing into a purchase.

**Revenue impact:** Online sales (higher margin, no venue split).

**Starter URL pattern:** `example.com/artist/:artistId/tour`

**Key question to answer:** How do you create merch awareness at the same moment the fan is deciding whether to go?

---

## 2. Ticket Purchase

**When it happens:** The fan is on Ticketmaster buying tickets. The merchant has no presence in this flow — Ticketmaster doesn't share customer data.

**Emotional state:** Committed, spending mode, peak excitement about the upcoming show.

**How a Clip could be invoked:**
- Smart App Banner on the artist's website (post-purchase redirect)
- iMessage link shared by the ticketing confirmation page
- QR code on a digital ticket confirmation

**What the Clip could do:**
- Offer a "merch bundle" add-on right after ticket purchase
- Let fans pre-order specific items (guaranteed size/style)
- Capture the fan's interest before they forget

**Notification strategy:** "Your Jelly Roll tickets are confirmed! Pre-order your tour hoodie and skip the merch line." Push within minutes of Clip open while the fan is still in spending mode.

**Revenue impact:** Online sales, potentially venue pickup (pre-order model).

**Starter URL pattern:** `example.com/show/:showId/preorder`

**Key question to answer:** How do you insert the merchant into a moment that Ticketmaster currently owns end-to-end, without any Ticketmaster integration?

---

## 3. The Wait

**When it happens:** Days, weeks, or months between ticket purchase and show day. The fan has tickets but no direct relationship with the merchant.

**Emotional state:** Anticipation building, periodic bursts of excitement, sharing plans with friends.

**How a Clip could be invoked:**
- iMessage link shared by a friend ("look what merch they have!")
- Smart App Banner on the artist's social media links
- Siri Suggestion based on calendar event for the show

**What the Clip could do:**
- Drip exclusive merch reveals (new items unlocked each week)
- Offer time-limited pre-orders with venue pickup
- Let fans browse and wishlist items before show day
- Create social sharing moments ("I just pre-ordered the tour vinyl!")

**Notification strategy:** Since Clips are ephemeral, each Clip open resets the 8-hour window. Strategy could involve periodic re-engagement: social media post → fan opens Clip → push notification with new merch drop → purchase.

**Revenue impact:** Online sales (pre-orders).

**Starter URL pattern:** `example.com/artist/:artistId/merch`

**Key question to answer:** How do you maintain engagement over weeks without a persistent app, using only ephemeral Clips?

---

## 4. Show Day

**When it happens:** The fan arrives at the venue. Doors open, the energy is high, merch booths have long lines.

**Emotional state:** Peak excitement, impatient, overwhelmed by crowds, high purchase intent.

**How a Clip could be invoked:**
- QR code printed on merch booth signage
- NFC tag embedded in the venue wristband
- QR code on the back of the ticket stub
- Apple Maps place card for the venue

**What the Clip could do:**
- Let fans browse and buy merch from their seat (skip the line)
- Show real-time booth wait times and inventory
- Enable mobile checkout with venue pickup ("Order now, pick up at Booth #3")
- Flash sales during intermission or between sets

**Notification strategy:** "Intermission special: 20% off all vinyl for the next 15 minutes." Time-sensitive pushes during natural breaks in the show. Post-show: "Your order is ready at Booth #3 — skip the exit line."

**Revenue impact:** Venue sales (capturing lost line-avoiders) + potentially online (order from seat, ship to home).

**Starter URL pattern:** `example.com/venue/:venueId/merch`

**Key question to answer:** How do you capture the fan who wants merch but won't wait in a 30-minute line?

---

## 5. Post-Show Afterglow

**When it happens:** The fan leaves the show. They're emotionally charged, reliving the experience, sharing photos and stories.

**Emotional state:** Euphoric, nostalgic, sentimental. The "I want to remember this night forever" feeling.

**How a Clip could be invoked:**
- QR code on exit signage or parking structure
- NFC tag at the exit gate
- iMessage link shared in the post-show group chat
- Push notification (if Clip was opened earlier that day — still within 8-hour window)

**What the Clip could do:**
- Offer show-exclusive merch with free shipping ("Missed the booth? We'll ship it to you.")
- Sell commemorative items (setlist poster, "I was there" merch)
- Capture email/phone for future show notifications (fan opts in)
- Offer a discount code for the online store

**Notification strategy:** This is where the 8-hour window is most powerful. If the fan opened a Clip at doors (7 PM), you can push until 3 AM. "Thanks for an incredible night — grab the tour vinyl before it's gone. Free shipping until midnight."

**Revenue impact:** Online sales (highest margin, no venue split). This is often the most profitable channel for merchants.

**Starter URL pattern:** `example.com/aftershow/:showId`

**Key question to answer:** How do you convert post-show emotion into a purchase before the feeling fades?

---

## Combining Touchpoints

The strongest solutions may chain multiple touchpoints together. For example:
1. **The Wait:** Fan opens Clip via social media → browses merch → wishlists items
2. **Show Day:** Fan scans QR at venue → Clip remembers nothing (ephemeral!), but the same catalog appears → buys from seat
3. **Post-Show:** Push notification at 11 PM → "Free shipping on everything you saw tonight" → fan buys the vinyl they were eyeing

Think about the 8-hour notification window as a bridge between touchpoints within a single day.
