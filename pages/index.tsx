import { GetServerSideProps } from "next";
import Link from "next/link";
import { useMemo, useState, useEffect, useRef } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import "../lib/auth0-env";
import { auth0 } from "../lib/auth0";
import { prisma } from "../lib/prisma";
import { ensureDbUser } from "../lib/session-user";
import {
  clearSignupIntentCookie,
  getSignupIntentRole,
} from "../lib/signup-intent";

/* ── Types ──────────────────────────────────────────── */
type ListingView = {
  id: string;
  title: string;
  description: string;
  address: string;
  price: number;
  confidenceScore: number | null;
  imageUrl: string | null;
  createdAt: string;
  seller: {
    id: string;
    name: string | null;
    email: string;
  };
};

type HomeProps = {
  listings: ListingView[];
  user: { name?: string; email?: string } | null;
  role: "BUYER" | "SELLER_PENDING" | "SELLER_VERIFIED" | "ADMIN" | null;
};

/* ── Helpers ────────────────────────────────────────── */
function cad(n: number) {
  return n.toLocaleString("en-CA", { maximumFractionDigits: 0 });
}

function confidenceLabel(score: number | null) {
  if (score == null) return { text: "Pending", cls: "na" };
  if (score >= 85) return { text: `${score}/100`, cls: "high" };
  if (score >= 60) return { text: `${score}/100`, cls: "medium" };
  return { text: `${score}/100`, cls: "low" };
}

const COMMISSION_RATE = 0.05; // 5% typical agent commission

/* ── Buyer Steps ────────────────────────────────────── */
const BUYER_STEPS = [
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
];

/* ── Seller Steps ───────────────────────────────────── */
const SELLER_STEPS = [
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
];

/* ── Buyer Value Props ──────────────────────────────── */
const BUYER_VALUES = [
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
];

/* ── Seller Value Props ─────────────────────────────── */
const SELLER_VALUES = [
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
];

/* ── Component ──────────────────────────────────────── */
export default function Home({ listings, user, role }: HomeProps) {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [howTab, setHowTab] = useState<"buyer" | "seller">("buyer");
  const [homePrice, setHomePrice] = useState(800000);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [buyerQuery, setBuyerQuery] = useState("");
  const calcRef = useRef<HTMLDivElement>(null);

  const roleLabel =
    role === "SELLER_VERIFIED"
      ? "Verified Seller"
      : role === "SELLER_PENDING"
        ? "Seller (Pending)"
        : role === "ADMIN"
          ? "Admin"
          : "Buyer";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = showRoleModal ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [showRoleModal]);

  const savings = Math.round(homePrice * COMMISSION_RATE);
  const steps = howTab === "buyer" ? BUYER_STEPS : SELLER_STEPS;

  return (
    <>
      <Head>
        <title>DeedScan — No Agent. No Commission. Canadian Real Estate.</title>
        <meta
          name="description"
          content="Buy and sell homes directly in Canada. No agents, no 5% commission. Browse verified listings, chat with sellers, and keep more money in your pocket."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="landing-container">
        {/* ── Navbar ──────────────────────────────── */}
        <nav className={`navbar ${scrolled ? "scrolled" : ""}`}>
          <div className="section-inner">
            <a href="/" className="nav-logo">
              <span className="logo-icon">🏠</span>
              DeedScan
            </a>

            <ul className="nav-links">
              <li>
                <a href="#how-it-works">How It Works</a>
              </li>
              <li>
                <a href="#for-buyers">For Buyers</a>
              </li>
              <li>
                <a href="#for-sellers">For Sellers</a>
              </li>
              <li>
                <a href="#listings">Listings</a>
              </li>
            </ul>

            <div className="nav-auth">
              {!user ? (
                <>
                  <div className="nav-login-dropdown">
                    <button
                      type="button"
                      className="nav-btn nav-btn-ghost"
                      aria-haspopup="true"
                      aria-expanded="false"
                    >
                      Log In
                    </button>
                    <div className="nav-login-dropdown-menu" role="menu">
                      <a
                        href="/api/auth/login-buyer"
                        className="nav-login-dropdown-item"
                        role="menuitem"
                      >
                        As a Buyer
                      </a>
                      <a
                        href="/api/auth/login-seller"
                        className="nav-login-dropdown-item"
                        role="menuitem"
                      >
                        As a Seller
                      </a>
                    </div>
                  </div>
                  <button
                    className="nav-btn nav-btn-primary"
                    onClick={() => setShowRoleModal(true)}
                  >
                    Get Started
                  </button>
                </>
              ) : (
                <>
                  {role === "SELLER_VERIFIED" && (
                    <a href="/seller" className="nav-btn nav-btn-ghost">
                      Dashboard
                    </a>
                  )}
                  <a href="/messages" className="nav-btn nav-btn-ghost">
                    Messages
                  </a>
                  <a href="/api/auth/logout" className="nav-btn nav-btn-ghost">
                    Log Out
                  </a>
                </>
              )}
            </div>

            <button className="nav-mobile-toggle" aria-label="Menu">
              ☰
            </button>
          </div>
        </nav>

        {/* ── Hero ────────────────────────────────── */}
        <section className="hero">
          <div className="hero-bg">
            <img src="/images/hero-bg.png" alt="" aria-hidden="true" />
          </div>
          <div className="hero-content">
            <div className="hero-text animate-in">
              <div className="hero-badge">
                <span className="badge-dot" />
                Canada&#39;s commission-free marketplace
              </div>
              <h1>
                Scan the Sign.
                <br />
                <span className="highlight">Skip the Agent.</span>
              </h1>
              <p className="hero-subtitle">
                Buy and sell homes directly. No commissions. No middlemen. Just
                verified listings.
              </p>
              <form
                className="hero-search-inline"
                onSubmit={(event) => {
                  event.preventDefault();
                  const q = buyerQuery.trim();
                  if (!q) return;
                  void router.push(`/browse?q=${encodeURIComponent(q)}`);
                }}
              >
                <input
                  value={buyerQuery}
                  onChange={(event) => setBuyerQuery(event.target.value)}
                  placeholder="E.x. 3-bed under $700k in Mississauga"
                  aria-label="Search homes with natural language"
                />
                <button type="submit">✨ Search using AI</button>
              </form>
              <p className="hero-search-note">
                Natural-language search for buyers. Or{" "}
                <a href="/browse">browse all listings</a>.
              </p>
              <div className="hero-ctas">
                <a href="/api/auth/signup-seller" className="btn btn-outline">
                  List Your Property
                </a>
              </div>
            </div>

            <div className="hero-stats-card animate-in animate-in-delay-2">
              <div className="stats-card-label">Average Savings Per Sale</div>
              <div className="stats-card-value">${cad(40000)}</div>
              <div className="stats-card-detail">
                based on 5% commission on an $800K home
              </div>
              <div className="stats-card-items">
                <div className="stats-card-item">
                  <div className="stats-card-item-value">0%</div>
                  <div className="stats-card-item-label">Commission</div>
                </div>
                <div className="stats-card-item">
                  <div className="stats-card-item-value">100%</div>
                  <div className="stats-card-item-label">Yours to Keep</div>
                </div>
                <div className="stats-card-item">
                  <div className="stats-card-item-value">🛡️</div>
                  <div className="stats-card-item-label">Fraud Checked</div>
                </div>
                <div className="stats-card-item">
                  <div className="stats-card-item-value">💬</div>
                  <div className="stats-card-item-label">Direct Chat</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Logged-in Account Banner ────────────── */}
        {user && (
          <section className="section-inner" style={{ paddingTop: 24 }}>
            <div className="account-banner animate-in">
              <div className="account-info">
                <div className="account-avatar">
                  {(user.name?.[0] || user.email?.[0] || "U").toUpperCase()}
                </div>
                <div>
                  <div className="account-name">{user.name || user.email}</div>
                  <div className="account-role">{roleLabel}</div>
                </div>
              </div>
              <div className="account-actions">
                {role === "SELLER_VERIFIED" && (
                  <a
                    href="/seller"
                    className="btn btn-primary"
                    style={{ padding: "10px 20px", fontSize: "0.875rem" }}
                  >
                    Seller Dashboard
                  </a>
                )}
                {role === "SELLER_PENDING" && (
                  <a
                    href="/seller/verify"
                    className="btn btn-outline"
                    style={{ padding: "10px 20px", fontSize: "0.875rem" }}
                  >
                    Complete Verification
                  </a>
                )}
                {role === "ADMIN" && (
                  <a
                    href="/admin/review"
                    className="btn btn-outline"
                    style={{ padding: "10px 20px", fontSize: "0.875rem" }}
                  >
                    Admin Panel
                  </a>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ── Savings Calculator ──────────────────── */}
        <section className="savings-section" ref={calcRef}>
          <div className="section-inner">
            <div className="section-header animate-in">
              <div className="section-tag">💰 Savings Calculator</div>
              <h2>See How Much You&apos;ll Save</h2>
              <p>
                Agents typically charge 5% commission. On a Canadian home,
                that&#39;s tens of thousands of dollars. With DeedScan, you keep
                it all.
              </p>
            </div>

            <div className="calculator-grid">
              <div className="calc-input-card animate-in animate-in-delay-1">
                <h3>Enter your home price</h3>
                <div className="calc-input-group">
                  <label htmlFor="home-price">Home price (CAD)</label>
                  <input
                    id="home-price"
                    className="calc-input"
                    type="text"
                    value={`$${cad(homePrice)}`}
                    onChange={(e) => {
                      const num = parseInt(
                        e.target.value.replace(/[^0-9]/g, ""),
                        10,
                      );
                      if (!isNaN(num) && num >= 0)
                        setHomePrice(Math.min(num, 10000000));
                    }}
                  />
                  <input
                    className="calc-slider"
                    type="range"
                    min="100000"
                    max="5000000"
                    step="10000"
                    value={homePrice}
                    onChange={(e) => setHomePrice(Number(e.target.value))}
                    aria-label="Home price slider"
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.8rem",
                    color: "var(--text-muted)",
                  }}
                >
                  <span>$100K</span>
                  <span>$5M</span>
                </div>
              </div>

              <div className="comparison-card animate-in animate-in-delay-2">
                <h3>Commission Comparison</h3>
                <div className="comparison-row">
                  <div className="comp-box traditional">
                    <div className="comp-box-label">Traditional Agent</div>
                    <div className="comp-box-value">-${cad(savings)}</div>
                  </div>
                  <div className="comp-box dedscan">
                    <div className="comp-box-label">DeedScan</div>
                    <div className="comp-box-value">$0</div>
                  </div>
                </div>
                <div className="savings-total">
                  <div className="savings-total-label">You Save</div>
                  <div className="savings-total-value">${cad(savings)}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── How It Works ────────────────────────── */}
        <section className="how-section" id="how-it-works">
          <div className="section-inner">
            <div className="section-header animate-in">
              <div className="section-tag">🧩 How It Works</div>
              <h2>Simple, Transparent, Direct</h2>
              <p>
                Whether you&#39;re buying or selling, DeedScan keeps it
                straightforward.
              </p>
            </div>

            <div className="how-tabs animate-in animate-in-delay-1">
              <button
                className={`how-tab ${howTab === "buyer" ? "active" : ""}`}
                onClick={() => setHowTab("buyer")}
              >
                I&#39;m a Buyer
              </button>
              <button
                className={`how-tab ${howTab === "seller" ? "active" : ""}`}
                onClick={() => setHowTab("seller")}
              >
                I&#39;m a Seller
              </button>
            </div>

            <div className="how-steps">
              {steps.map((step, i) => (
                <div
                  key={`${howTab}-${i}`}
                  className={`step-card animate-in animate-in-delay-${i + 1}`}
                >
                  <span className="step-icon">{step.icon}</span>
                  <div className="step-number">{i + 1}</div>
                  <h3>{step.title}</h3>
                  <p>{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── For Buyers ──────────────────────────── */}
        <section className="value-section" id="for-buyers">
          <div className="section-inner">
            <div className="section-header animate-in">
              <div className="section-tag">🏡 For Buyers</div>
              <h2>Buy Smarter. Save More.</h2>
              <p>
                Direct access to sellers means lower prices, faster responses,
                and zero agent markup.
              </p>
            </div>
            <div className="value-grid">
              {BUYER_VALUES.map((v, i) => (
                <div
                  key={i}
                  className={`value-card animate-in animate-in-delay-${i + 1}`}
                >
                  <div className="value-card-icon">{v.icon}</div>
                  <div>
                    <h3>{v.title}</h3>
                    <p>{v.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── For Sellers ─────────────────────────── */}
        <section
          className="value-section"
          id="for-sellers"
          style={{ background: "var(--bg-primary)" }}
        >
          <div className="section-inner">
            <div className="section-header animate-in">
              <div className="section-tag">📣 For Sellers</div>
              <h2>List Free. Sell Direct. Keep Everything.</h2>
              <p>
                Your home, your sale, your profit. No agent taking a 5% cut.
              </p>
            </div>
            <div className="value-grid">
              {SELLER_VALUES.map((v, i) => (
                <div
                  key={i}
                  className={`value-card animate-in animate-in-delay-${i + 1}`}
                >
                  <div className="value-card-icon">{v.icon}</div>
                  <div>
                    <h3>{v.title}</h3>
                    <p>{v.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Listings ────────────────────────────── */}
        <section className="listings-section" id="listings">
          <div className="section-inner">
            <div className="section-header animate-in">
              <div className="section-tag">📍 Live Listings</div>
              <h2>Explore Properties</h2>
              <p>
                Browse verified, commission-free listings from real Canadian
                homeowners.
              </p>
            </div>

            {listings.length > 0 ? (
              <div className="listings-grid">
                {listings.map((listing, i) => {
                  const badge = confidenceLabel(listing.confidenceScore);
                  return (
                    <article
                      key={listing.id}
                      className={`listing-card animate-in animate-in-delay-${(i % 3) + 1}`}
                    >
                      {listing.imageUrl ? (
                        <img
                          className="listing-card-image"
                          src={listing.imageUrl}
                          alt={listing.title}
                        />
                      ) : (
                        <div className="listing-card-image-placeholder">🏠</div>
                      )}
                      <div className="listing-card-body">
                        <div className="listing-card-meta">
                          <span className={`confidence-badge ${badge.cls}`}>
                            {badge.cls === "high"
                              ? "✓ "
                              : badge.cls === "low"
                                ? "⚠ "
                                : ""}
                            {badge.text}
                          </span>
                        </div>
                        <div className="listing-card-price">
                          ${cad(listing.price)} CAD
                        </div>
                        <div className="listing-card-title">
                          <Link href={`/listings/${listing.id}`}>
                            {listing.title}
                          </Link>
                        </div>
                        <div className="listing-card-address">
                          📍 {listing.address}
                        </div>
                        <div className="listing-card-desc">
                          {listing.description}
                        </div>
                      </div>
                      <div className="listing-card-footer">
                        <span>Seller: {listing.seller.name || "Unknown"}</span>
                        {user && (
                          <a
                            href={`/messages?listingId=${listing.id}&otherUserId=${listing.seller.id}`}
                          >
                            Message seller
                          </a>
                        )}
                        <span>
                          {new Date(listing.createdAt).toLocaleDateString(
                            "en-CA",
                          )}
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="empty-listings animate-in">
                <p>No listings yet — be the first to list!</p>
                <a
                  href="/api/auth/signup-seller"
                  className="btn btn-primary"
                  style={{ marginTop: 16 }}
                >
                  List Your Property →
                </a>
              </div>
            )}
          </div>
        </section>

        {/* ── Footer CTA ─────────────────────────── */}
        <section className="footer-cta">
          <div className="section-inner animate-in">
            <h2>Ready to Skip the Middleman?</h2>
            <p>
              Join thousands of Canadians who are buying and selling homes
              commission-free.
            </p>
            <div className="footer-cta-buttons">
              <a href="/api/auth/signup-buyer" className="btn btn-primary">
                Sign Up as Buyer →
              </a>
              <a href="/api/auth/signup-seller" className="btn btn-outline">
                Sign Up as Seller →
              </a>
            </div>
          </div>
        </section>

        {/* ── Footer ──────────────────────────────── */}
        <footer className="footer">
          <div className="section-inner">
            <div className="footer-copy">
              © {new Date().getFullYear()} DeedScan. Built in Canada 🇨🇦
            </div>
            <div className="footer-links">
              <a href="#how-it-works">How It Works</a>
              <a href="#for-buyers">Buyers</a>
              <a href="#for-sellers">Sellers</a>
            </div>
          </div>
        </footer>
      </div>

      {/* ── Role Selection Modal ───────────────── */}
      {showRoleModal && (
        <div
          className="role-modal-overlay"
          onClick={() => setShowRoleModal(false)}
        >
          <div className="role-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="role-modal-close"
              onClick={() => setShowRoleModal(false)}
              aria-label="Close"
            >
              ✕
            </button>
            <div className="role-modal-header">
              <h2>How will you use DeedScan?</h2>
              <p>
                Choose your role to get started — you can always explore both
                later.
              </p>
            </div>
            <div className="role-cards">
              <a href="/api/auth/signup-buyer" className="role-card">
                <div className="role-card-icon">🏡</div>
                <h3>I&apos;m a Buyer</h3>
                <p>
                  Browse listings, message sellers directly, and find your next
                  home commission-free.
                </p>
                <span className="role-card-arrow">Get started →</span>
              </a>
              <a href="/api/auth/signup-seller" className="role-card">
                <div className="role-card-icon">📣</div>
                <h3>I&apos;m a Seller</h3>
                <p>
                  List your property, get a QR yard sign, and keep 100% of your
                  sale — zero commission.
                </p>
                <span className="role-card-arrow">Get started →</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Server-Side Data ───────────────────────────────── */
export const getServerSideProps: GetServerSideProps<HomeProps> = async ({
  req,
  res,
}) => {
  const session = await auth0.getSession(req);
  let user: HomeProps["user"] = null;
  let role: HomeProps["role"] = null;

  if (session?.user) {
    const signupRole = getSignupIntentRole(req);
    const dbUser = await ensureDbUser(session.user, signupRole);
    clearSignupIntentCookie(res);
    user = { name: session.user.name, email: session.user.email };
    role = dbUser.role as HomeProps["role"];
  }

  let listings: ListingView[] = [];
  try {
    const raw = await prisma.listing.findMany({
      include: {
        seller: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    listings = raw.map((l: (typeof raw)[number]) => ({
      id: l.id,
      title: l.title,
      description: l.description,
      address: l.address,
      price: l.price,
      confidenceScore: l.confidenceScore,
      imageUrl: l.imageUrl,
      createdAt: l.createdAt.toISOString(),
      seller: l.seller,
    }));
  } catch {
    // DB not migrated yet — show page without listings
  }

  return { props: { listings, user, role } };
};
