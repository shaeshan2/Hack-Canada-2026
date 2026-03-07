import "../lib/auth0-env";
import Head from "next/head";
import { FormEvent, useRef, useState } from "react";
import { auth0 } from "../lib/auth0";
import { prisma } from "../lib/prisma";
import { ensureDbUser } from "../lib/session-user";
import {
  clearSignupIntentCookie,
  getSignupIntentRole,
} from "../lib/signup-intent";

type MyListing = {
  id: string;
  title: string;
  address: string;
  price: number;
  confidenceScore: number | null;
  createdAt: string;
  photos: { url: string }[];
};

type SellerProps = {
  userName?: string | null;
  myListings: MyListing[];
};

type SuccessState = {
  listingId: string;
  confidenceScore: number;
  qrDataUrl: string | null;
};

function cad(n: number) {
  return n.toLocaleString("en-CA", { maximumFractionDigits: 0 });
}

function confidenceBadge(score: number | null) {
  if (score == null) return { label: "AI Pending", cls: "sd-badge na" };
  if (score >= 85) return { label: `${score}/100 ✓`, cls: "sd-badge high" };
  if (score >= 60) return { label: `${score}/100`, cls: "sd-badge medium" };
  return { label: `${score}/100 ⚠`, cls: "sd-badge low" };
}

export default function SellerPage({
  userName,
  myListings: initialListings,
}: SellerProps) {
  const [activeTab, setActiveTab] = useState<"create" | "listings">("create");
  const [listings, setListings] = useState<MyListing[]>(initialListings);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [price, setPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessState | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const files = fileInputRef.current?.files;
    if (!files || files.length === 0) {
      setError("Please add at least one photo.");
      setSubmitting(false);
      return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("address", address);
    formData.append("price", String(Number(price)));
    Array.from(files).forEach((f) => formData.append("photos", f));

    const res = await fetch("/api/listing/create", {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(data?.error ?? "Could not create listing. Please try again.");
      setSubmitting(false);
      return;
    }

    const payload = (await res.json()) as {
      listingId: string;
      initialConfidenceScore: number;
    };

    // Generate QR code
    let qrDataUrl: string | null = null;
    try {
      const qrRes = await fetch("/api/qr/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: payload.listingId }),
      });
      if (qrRes.ok) {
        const qrData = (await qrRes.json()) as { qrDataUrl: string };
        qrDataUrl = qrData.qrDataUrl;
      }
    } catch {
      // QR generation is non-critical
    }

    // Reset form
    setTitle("");
    setDescription("");
    setAddress("");
    setPrice("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    setSubmitting(false);
    setSuccess({
      listingId: payload.listingId,
      confidenceScore: payload.initialConfidenceScore,
      qrDataUrl,
    });

    // Refresh my listings
    void fetch("/api/listings")
      .then((r) => r.json())
      .then((all: (MyListing & { seller?: { id?: string } })[]) => {
        // The new listing will appear at the top; just prepend a stub so count updates
        setListings(
          all.map((l) => ({
            id: l.id,
            title: l.title,
            address: l.address,
            price: l.price,
            confidenceScore: l.confidenceScore,
            createdAt: l.createdAt,
            photos: l.photos ?? [],
          })),
        );
      })
      .catch(() => {});
  }

  function handleDownloadQR() {
    if (!success?.qrDataUrl) return;
    const a = document.createElement("a");
    a.href = success.qrDataUrl;
    a.download = `deedscan-qr-${success.listingId}.png`;
    a.click();
  }

  const badge = success ? confidenceBadge(success.confidenceScore) : null;

  return (
    <>
      <Head>
        <title>Seller Dashboard | DeedScan</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="seller-dashboard">
        {/* ── Navbar ── */}
        <nav className="sd-navbar">
          <a href="/" className="sd-logo">
            <span className="logo-icon">🏠</span>
            DeedScan
          </a>
          <div className="sd-nav-right">
            <a href="/messages" className="sd-nav-link">
              💬 Messages
            </a>
            <a href="/api/auth/logout" className="sd-nav-link sd-nav-logout">
              Log out
            </a>
          </div>
        </nav>

        <div className="sd-container">
          {/* ── Header ── */}
          <div className="sd-header animate-in">
            <div>
              <h1 className="sd-title">Seller Dashboard</h1>
              <p className="sd-subtitle">
                Welcome back{userName ? `, ${userName}` : ""}. List your
                property, manage listings, and connect with buyers —
                commission-free.
              </p>
            </div>
            <div className="sd-verified-badge">
              <span className="sd-verified-dot" />
              Verified Seller
            </div>
          </div>

          {/* ── Stats Row ── */}
          <div className="sd-stats animate-in animate-in-delay-1">
            <div className="sd-stat">
              <div className="sd-stat-value">{listings.length}</div>
              <div className="sd-stat-label">Active Listings</div>
            </div>
            <div className="sd-stat">
              <div className="sd-stat-value">0%</div>
              <div className="sd-stat-label">Commission</div>
            </div>
            <div className="sd-stat">
              <div className="sd-stat-value">
                {listings.length > 0
                  ? `$${cad(listings.reduce((s, l) => s + l.price, 0) * 0.05)}`
                  : "$0"}
              </div>
              <div className="sd-stat-label">Saved vs. Agent</div>
            </div>
          </div>

          {/* ── Tabs ── */}
          <div className="sd-tabs animate-in animate-in-delay-2">
            <button
              className={`sd-tab ${activeTab === "create" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("create");
                setSuccess(null);
                setError(null);
              }}
            >
              + Create Listing
            </button>
            <button
              className={`sd-tab ${activeTab === "listings" ? "active" : ""}`}
              onClick={() => setActiveTab("listings")}
            >
              My Listings
              {listings.length > 0 && (
                <span className="sd-tab-count">{listings.length}</span>
              )}
            </button>
          </div>

          {/* ── Create Tab ── */}
          {activeTab === "create" && !success && (
            <div className="sd-panel animate-in animate-in-delay-3">
              <form className="sd-form" onSubmit={onSubmit}>
                <div className="sd-form-grid">
                  <div className="sd-field sd-field-full">
                    <label htmlFor="sd-title">Listing Title</label>
                    <input
                      id="sd-title"
                      type="text"
                      placeholder="e.g. Spacious 4-bed detached in Whitby"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div className="sd-field sd-field-full">
                    <label htmlFor="sd-desc">Description</label>
                    <textarea
                      id="sd-desc"
                      placeholder="Describe the property, neighbourhood, recent upgrades..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                      rows={4}
                    />
                  </div>

                  <div className="sd-field">
                    <label htmlFor="sd-address">Property Address</label>
                    <input
                      id="sd-address"
                      type="text"
                      placeholder="123 Maple St, Toronto, ON M1M 1M1"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      required
                    />
                  </div>

                  <div className="sd-field">
                    <label htmlFor="sd-price">Asking Price (CAD)</label>
                    <div className="sd-price-input">
                      <span className="sd-price-currency">$</span>
                      <input
                        id="sd-price"
                        type="number"
                        min={1}
                        placeholder="750000"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        required
                      />
                    </div>
                    {price && Number(price) > 0 && (
                      <span className="sd-price-hint">
                        You save ~${cad(Number(price) * 0.05)} vs. a traditional
                        agent
                      </span>
                    )}
                  </div>

                  <div className="sd-field sd-field-full">
                    <label>
                      Photos <span className="sd-required">(at least 1)</span>
                    </label>
                    <div className="sd-file-drop">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        required
                        id="sd-photos"
                      />
                      <label htmlFor="sd-photos" className="sd-file-label">
                        <span className="sd-file-icon">📷</span>
                        <span>Click to upload photos</span>
                        <span className="sd-file-hint">
                          JPG, PNG, WebP · up to 10MB each · max 10 files
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {error && <div className="sd-error">{error}</div>}

                <button
                  type="submit"
                  className="sd-submit-btn"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <span className="sd-spinner" /> Publishing…
                    </>
                  ) : (
                    "🚀 Publish Listing"
                  )}
                </button>
              </form>
            </div>
          )}

          {/* ── Success State ── */}
          {activeTab === "create" && success && (
            <div className="sd-success animate-in">
              <div className="sd-success-icon">🎉</div>
              <h2>Your listing is live!</h2>
              <p className="sd-success-sub">
                AI fraud check score:{" "}
                <span className={badge!.cls}>{badge!.label}</span>
              </p>

              {success.qrDataUrl && (
                <div className="sd-qr-block">
                  <p className="sd-qr-label">Your yard-sign QR code</p>
                  <img
                    src={success.qrDataUrl}
                    alt="QR code for this listing"
                    className="sd-qr-img"
                  />
                  <p className="sd-qr-hint">
                    Buyers scan this to instantly view your listing on their
                    phone.
                  </p>
                  <button className="sd-qr-download" onClick={handleDownloadQR}>
                    ⬇ Download QR Code PNG
                  </button>
                </div>
              )}

              <div className="sd-success-actions">
                <a
                  href={`/listings/${success.listingId}`}
                  className="btn btn-primary"
                >
                  View Listing →
                </a>
                <button
                  className="btn btn-outline"
                  onClick={() => {
                    setSuccess(null);
                    setActiveTab("listings");
                  }}
                >
                  My Listings
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => setSuccess(null)}
                >
                  + Create Another
                </button>
              </div>
            </div>
          )}

          {/* ── My Listings Tab ── */}
          {activeTab === "listings" && (
            <div className="sd-panel animate-in animate-in-delay-3">
              {listings.length === 0 ? (
                <div className="sd-empty">
                  <div className="sd-empty-icon">🏘️</div>
                  <h3>No listings yet</h3>
                  <p>Create your first listing to get started.</p>
                  <button
                    className="btn btn-primary"
                    onClick={() => setActiveTab("create")}
                  >
                    + Create Your First Listing
                  </button>
                </div>
              ) : (
                <div className="sd-listing-grid">
                  {listings.map((listing) => {
                    const b = confidenceBadge(listing.confidenceScore);
                    const thumb = listing.photos[0]?.url ?? null;
                    return (
                      <div key={listing.id} className="sd-listing-card">
                        <div className="sd-listing-photo">
                          {thumb ? (
                            <img src={thumb} alt={listing.title} />
                          ) : (
                            <div className="sd-listing-no-photo">🏠</div>
                          )}
                          <span className={b.cls}>{b.label}</span>
                        </div>
                        <div className="sd-listing-body">
                          <div className="sd-listing-price">
                            ${cad(listing.price)}
                          </div>
                          <div className="sd-listing-title">
                            {listing.title}
                          </div>
                          <div className="sd-listing-address">
                            {listing.address}
                          </div>
                          <div className="sd-listing-actions">
                            <a
                              href={`/listings/${listing.id}`}
                              className="sd-listing-btn"
                            >
                              View
                            </a>
                            <GetQRButton listingId={listing.id} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/** Inline QR button — fetches on demand and shows a modal */
function GetQRButton({ listingId }: { listingId: string }) {
  const [qr, setQr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function fetchQR() {
    if (qr) {
      setQr(null);
      return;
    } // toggle
    setLoading(true);
    try {
      const res = await fetch("/api/qr/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId }),
      });
      if (res.ok) {
        const data = (await res.json()) as { qrDataUrl: string };
        setQr(data.qrDataUrl);
      }
    } finally {
      setLoading(false);
    }
  }

  function download() {
    if (!qr) return;
    const a = document.createElement("a");
    a.href = qr;
    a.download = `deedscan-qr-${listingId}.png`;
    a.click();
  }

  return (
    <div className="sd-qr-inline">
      <button
        className="sd-listing-btn sd-listing-btn-qr"
        onClick={fetchQR}
        disabled={loading}
      >
        {loading ? "…" : qr ? "Hide QR" : "📱 QR"}
      </button>
      {qr && (
        <div className="sd-qr-popover">
          <img src={qr} alt="QR code" />
          <button onClick={download} className="sd-qr-dl-mini">
            ⬇ Download
          </button>
        </div>
      )}
    </div>
  );
}

export const getServerSideProps = auth0.withPageAuthRequired({
  async getServerSideProps({ req, res }) {
    const session = await auth0.getSession(req);

    if (!session?.user) {
      return { redirect: { destination: "/api/auth/login", permanent: false } };
    }

    const signupRole = getSignupIntentRole(req);
    const dbUser = await ensureDbUser(session.user, signupRole);
    clearSignupIntentCookie(res);

    if (dbUser.role !== "SELLER_VERIFIED") {
      return { redirect: { destination: "/", permanent: false } };
    }

    const rawListings = await prisma.listing.findMany({
      where: { sellerId: dbUser.id },
      include: { photos: { orderBy: { order: "asc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
    });

    const myListings: MyListing[] = rawListings.map((l) => ({
      id: l.id,
      title: l.title,
      address: l.address,
      price: l.price,
      confidenceScore: l.confidenceScore,
      createdAt: l.createdAt.toISOString(),
      photos: l.photos.map((p) => ({ url: p.url })),
    }));

    return {
      props: {
        userName: session.user.name ?? null,
        myListings,
      },
    };
  },
});
