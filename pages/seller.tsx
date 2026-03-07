import "../lib/auth0-env";
import Head from "next/head";
import Link from "next/link";
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

function ListingsTab({ listings }: { listings: MyListing[] }) {
  const [loadingQr, setLoadingQr] = useState<string | null>(null);

  async function downloadQr(listingId: string) {
    setLoadingQr(listingId);
    try {
      const res = await fetch("/api/qr/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId }),
      });
      if (res.ok) {
        const data = (await res.json()) as { qrDataUrl: string };
        window.open(data.qrDataUrl, "_blank");
      }
    } finally {
      setLoadingQr(null);
    }
  }

  if (listings.length === 0) {
    return (
      <div className="sd-listing-empty">
        <p>No listings yet. Create your first one!</p>
      </div>
    );
  }

  return (
    <div className="sd-listing-grid">
      {listings.map((l) => {
        const b = confidenceBadge(l.confidenceScore);
        return (
          <div key={l.id} className="sd-listing-card">
            <div className="sd-listing-photo">
              {l.photos[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={l.photos[0].url} alt={l.title} />
              ) : (
                <div className="sd-listing-no-photo">No photo</div>
              )}
              <span className={b.cls}>{b.label}</span>
            </div>
            <div className="sd-listing-body">
              <div className="sd-listing-price">${cad(l.price)}</div>
              <div className="sd-listing-title">{l.title}</div>
              <div className="sd-listing-address">📍 {l.address}</div>
            </div>
            <div className="sd-listing-actions">
              <a
                href={`/listings/${l.id}`}
                target="_blank"
                rel="noreferrer"
                className="sd-listing-btn"
              >
                View
              </a>
              <button
                className="sd-listing-btn"
                disabled={loadingQr === l.id}
                onClick={() => downloadQr(l.id)}
              >
                {loadingQr === l.id ? "…" : "⬇ QR"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
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
  const [message, setMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setIsSuccess(false);

    const files = fileInputRef.current?.files;
    if (!files || files.length === 0) {
      setError("Please add at least one photo.");
      setSubmitting(false);
      return;
    }

    setSubmitting(true);

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
      const payload = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setMessage(payload?.error ?? "Could not create listing.");
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
    setIsSuccess(true);
    setSubmitting(false);
    setMessage(
      `Listing created! Confidence score: ${payload.initialConfidenceScore}/100. Your listing is now live.`,
    );

    // Show QR and add to My Listings tab immediately
    setSuccess({
      listingId: payload.listingId,
      confidenceScore: payload.initialConfidenceScore,
      qrDataUrl,
    });
    setListings((prev) => [
      {
        id: payload.listingId,
        title,
        address,
        price: Number(price),
        confidenceScore: payload.initialConfidenceScore,
        createdAt: new Date().toISOString(),
        photos: [],
      },
      ...prev,
    ]);
  }

  const badge = success ? confidenceBadge(success.confidenceScore) : null;

  return (
    <>
      <Head>
        <title>Seller Dashboard — DeedScan</title>
        <meta
          name="description"
          content="Create and manage your property listings on DeedScan. No commissions."
        />
      </Head>
      <main className="seller-dashboard">
        <header className="seller-header">
          <Link href="/">← DeedScan</Link>
          <h1>Seller Dashboard</h1>
          <div className="seller-header-actions">
            <Link href="/messages">Messages</Link>
            <a href="/api/auth/logout">Log out</a>
          </div>
        </header>

        <div className="seller-content">
          <div className="seller-welcome">
            <h2>Welcome{userName ? `, ${userName}` : ""} 👋</h2>
            <p>
              Create a new listing below. All prices are in CAD — no commission
              fees, ever.
            </p>
          </div>

          {/* ── Tab bar ── */}
          <div className="sd-tabs">
            <button
              className={`sd-tab${activeTab === "create" ? " active" : ""}`}
              onClick={() => setActiveTab("create")}
            >
              Create Listing
            </button>
            <button
              className={`sd-tab${activeTab === "listings" ? " active" : ""}`}
              onClick={() => setActiveTab("listings")}
            >
              My Listings
              {listings.length > 0 && (
                <span className="sd-tab-count">{listings.length}</span>
              )}
            </button>
          </div>

          {/* ── Create tab ── */}
          {activeTab === "create" && (
            <>
              {message && (
                <div
                  className={`seller-message ${isSuccess ? "success" : "error"}`}
                >
                  {message}
                </div>
              )}

              {/* QR block — shown after a successful create */}
              {isSuccess && success?.qrDataUrl && (
                <div className="sd-qr-block">
                  <p className="sd-qr-label">🏠 Your listing QR code</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={success.qrDataUrl}
                    alt="Listing QR code"
                    className="sd-qr-img"
                  />
                  <p className="sd-qr-hint">
                    Print and attach to your for-sale sign — buyers scan to view
                    instantly, no app needed.
                  </p>
                  <a
                    href={success.qrDataUrl}
                    download="deedscan-qr.png"
                    className="sd-qr-download"
                  >
                    ⬇ Download QR
                  </a>
                </div>
              )}

              <form onSubmit={onSubmit} className="seller-form">
                <div className="seller-field">
                  <label className="seller-field-label" htmlFor="listing-title">
                    Title
                  </label>
                  <input
                    id="listing-title"
                    type="text"
                    placeholder="e.g. Modern 3-Bedroom Detached Home"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="seller-field">
                  <label className="seller-field-label" htmlFor="listing-desc">
                    Description
                  </label>
                  <textarea
                    id="listing-desc"
                    placeholder="Describe your property — features, renovations, neighborhood, etc."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    rows={5}
                  />
                  <span className="seller-field-hint">
                    A detailed description helps attract serious buyers.
                  </span>
                </div>

                <div className="seller-field">
                  <label
                    className="seller-field-label"
                    htmlFor="listing-address"
                  >
                    Address
                  </label>
                  <input
                    id="listing-address"
                    type="text"
                    placeholder="e.g. 123 Main St, Toronto, ON"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                  />
                </div>

                <div className="seller-field">
                  <label className="seller-field-label" htmlFor="listing-price">
                    Price (CAD)
                  </label>
                  <input
                    id="listing-price"
                    type="number"
                    min={1}
                    placeholder="e.g. 850000"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                  />
                  <span className="seller-field-hint">
                    Set your asking price — you keep 100% with DeedScan.
                  </span>
                </div>

                <div className="seller-field">
                  <label
                    className="seller-field-label"
                    htmlFor="listing-photos"
                  >
                    Photos
                  </label>
                  <input
                    id="listing-photos"
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    required
                  />
                  <span className="seller-field-hint">
                    Upload up to 10 photos (JPEG, PNG, WebP). Max 10MB each.
                  </span>
                </div>

                <button
                  type="submit"
                  className="seller-submit"
                  disabled={submitting}
                >
                  {submitting ? "Publishing…" : "Publish Listing →"}
                </button>
              </form>
            </>
          )}

          {/* ── My Listings tab ── */}
          {activeTab === "listings" && <ListingsTab listings={listings} />}
        </div>
      </main>
    </>
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
      const dest = dbUser.role === "SELLER_PENDING" ? "/seller/verify" : "/";
      return { redirect: { destination: dest, permanent: false } };
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
