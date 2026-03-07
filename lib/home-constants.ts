export const COMMISSION_RATE = 0.05; // 5% typical agent commission

export const BUYER_STEPS = [
  {
    icon: "🔍",
    title: "Browse & Discover",
    desc: "Explore verified listings across Canada. Filter by price, location, and more — no middlemen in your way.",
  },
  {
    icon: "💬",
    title: "Message Sellers Directly",
    desc: "Chat in real-time with property owners. No agent filtering your questions or delaying responses.",
  },
  {
    icon: "🏠",
    title: "Close the Deal",
    desc: "Negotiate directly. Save thousands by cutting out commission fees that get passed to you.",
  },
] as const;

export const SELLER_STEPS = [
  {
    icon: "✅",
    title: "Verify & List",
    desc: "Quick identity verification, then list your property with photos, details, and pricing — all for free.",
  },
  {
    icon: "📱",
    title: "QR Code For-Sale Sign",
    desc: "Get a unique QR code for your yard sign. Passers-by scan it to instantly view your full listing.",
  },
  {
    icon: "💰",
    title: "Keep Your Money",
    desc: "No 5% commission. On a $800K home, that's $40,000 back in your pocket. You earned it.",
  },
] as const;

export const BUYER_VALUES = [
  {
    icon: "🤝",
    title: "Direct Seller Access",
    desc: "Talk to the person who actually owns the home. No agents playing phone tag.",
  },
  {
    icon: "🤖",
    title: "AI Confidence Scores",
    desc: "Every listing gets a fraud-check confidence rating so you browse with peace of mind.",
  },
  {
    icon: "🚫",
    title: "No Hidden Fees",
    desc: "Agent commissions inflate home prices. We remove that markup entirely.",
  },
  {
    icon: "⚡",
    title: "Real-Time Chat",
    desc: "Instant messaging with sellers. Ask about the leaky faucet before it becomes your problem.",
  },
] as const;

export const SELLER_VALUES = [
  {
    icon: "💸",
    title: "Zero Commission",
    desc: "Keep every dollar of your sale. The average Canadian saves $40,000+ on an $800K home.",
  },
  {
    icon: "📲",
    title: "QR-Powered Signs",
    desc: "Your for-sale sign becomes interactive. Buyers scan and see your full listing instantly.",
  },
  {
    icon: "🛡️",
    title: "Verified Listings",
    desc: "Our verification system builds trust. Buyers know your listing is legitimate.",
  },
  {
    icon: "🎯",
    title: "Full Control",
    desc: "Set your price, manage inquiries, and close on your timeline. No agent telling you what to do.",
  },
] as const;
