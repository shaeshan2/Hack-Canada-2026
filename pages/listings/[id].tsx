import { GetServerSideProps } from "next";
import Head from "next/head";
import Link from "next/link";
import { useState, useEffect } from "react";
import "../../lib/auth0-env";
import { auth0 } from "../../lib/auth0";
import { ensureDbUser } from "../../lib/session-user";
import {
  clearSignupIntentCookie,
  getSignupIntentRole,
} from "../../lib/signup-intent";
import { prisma } from "../../lib/prisma";
import dynamic from "next/dynamic";
import FraudBreakdownCard from "../../components/FraudBreakdownCard";
import type { NeighborhoodData } from "../api/listings/[id]/neighborhood";

// Leaflet uses window, so must be dynamically imported
const NeighborhoodMap = dynamic(
  () => import("../../components/NeighborhoodMap"),
  {
    ssr: false,
    loading: () => <div className="ld-map-loading">Loading Map...</div>,
  },
);

type ListingDetailProps = {
  listing: {
    id: string;
    title: string;
    description: string;
    address: string;
    price: number;
    imageUrl: string | null;
    sqft: number | null;
    bedrooms: number | null;
    confidenceScore: number | null;
    breakdownJson: string | null;
    flagsJson: string | null;
    latitude: number | null;
    longitude: number | null;
    seller: { id: string; name: string | null };
    photos: { id: string; url: string; order: number }[];
  } | null;
  user: { name?: string; email?: string } | null;
};

function cad(n: number) {
  return n.toLocaleString("en-CA", { maximumFractionDigits: 0 });
}

function confidenceInfo(score: number | null) {
  if (score == null)
    return {
      label: "AI Pending",
      cls: "ld-badge-na",
      icon: "⏳",
      tip: "Fraud check running",
    };
  if (score >= 85)
    return {
      label: `${score}/100 Verified`,
      cls: "ld-badge-high",
      icon: "🛡️",
      tip: "High confidence — no fraud signals",
    };
  if (score >= 60)
    return {
      label: `${score}/100 Review`,
      cls: "ld-badge-mid",
      icon: "⚠️",
      tip: "Moderate confidence",
    };
  return {
    label: `${score}/100 Low`,
    cls: "ld-badge-low",
    icon: "🚨",
    tip: "Low confidence — exercise caution",
  };
}

type PriceEstimateResult = { price_range: string; explanation: string } | null;

export default function ListingDetailPage({
  listing,
  user,
}: ListingDetailProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [neighborhood, setNeighborhood] = useState<NeighborhoodData | null>(
    null,
  );
  const [isLoadingNeighborhood, setIsLoadingNeighborhood] = useState(false);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<PriceEstimateResult>(null);

  // Local state for fraud check so we can poll and update it live
  const [localConfidenceScore, setLocalConfidenceScore] = useState(listing?.confidenceScore ?? null);
  const [localBreakdownJson, setLocalBreakdownJson] = useState(listing?.breakdownJson ?? null);
  const [localFlagsJson, setLocalFlagsJson] = useState(listing?.flagsJson ?? null);

  async function fetchPriceEstimate() {
    if (!listing) return;
    setEstimateLoading(true);
    setEstimateError(null);
    setEstimate(null);
    try {
      const res = await fetch("/api/price-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: listing.address,
          sqft: listing.sqft ?? 0,
          bedrooms: listing.bedrooms ?? 0,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEstimateError(data.error ?? "Could not get price estimate");
        return;
      }
      setEstimate({
        price_range: data.price_range ?? "",
        explanation: data.explanation ?? "",
      });
    } catch {
      setEstimateError("Network error. Try again.");
    } finally {
      setEstimateLoading(false);
    }
  }

  useEffect(() => {
    if (!listing) return;
    setIsLoadingNeighborhood(true);
    fetch(`/api/listings/${listing.id}/neighborhood`)
      .then((res) => res.json())
      .then((data: NeighborhoodData) => {
        setNeighborhood(data);
        setIsLoadingNeighborhood(false);
      })
      .catch((e) => {
        console.error("Could not fetch neighborhood", e);
        setIsLoadingNeighborhood(false);
      });
  }, [listing]);

  // Poll for fraud check results if it's pending
  useEffect(() => {
    if (!listing || localConfidenceScore !== null) return;

    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/listings/${listing.id}`);
        if (!res.ok) return;
        const freshData = await res.json();

        if (freshData.confidenceScore !== null && isMounted) {
          setLocalConfidenceScore(freshData.confidenceScore);
          setLocalBreakdownJson(freshData.breakdownJson);
          setLocalFlagsJson(freshData.flagsJson);
          clearInterval(interval);
        }
      } catch (e) {
        console.error("Error polling for fraud check", e);
      }
    }, 2000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [listing, localConfidenceScore]);

  if (!listing) {
    return (
      <div className="ld-notfound">
        <h2>Listing not found</h2>
        <Link href="/browse" className="btn btn-primary">
          Browse all listings
        </Link>
      </div>
    );
  }

  const photos = listing.photos?.length
    ? listing.photos
    : listing.imageUrl
      ? [{ url: listing.imageUrl, id: "fallback", order: 0 }]
      : [];

  const conf = confidenceInfo(localConfidenceScore);
  const savings = Math.round(listing.price * 0.05);
  const sellerInitial = (listing.seller.name?.[0] ?? "S").toUpperCase();

  return (
    <>
      <Head>
        <title>{`${listing.title} | DeedScan`}</title>
        <meta
          name="description"
          content={`${listing.address} — $${cad(listing.price)} CAD. Commission-free on DeedScan.`}
        />
      </Head>

      {/* ── Navbar ── */}
      <nav className="ld-navbar">
        <Link href="/" className="ld-logo">
          <span className="logo-icon">🏠</span>DeedScan
        </Link>
        <div className="ld-nav-right">
          <Link href="/browse" className="ld-nav-link">
            ← All Listings
          </Link>
          {user ? (
            <Link href="/messages" className="ld-nav-link">
              💬 Messages
            </Link>
          ) : (
            <a href="/api/auth/login" className="ld-nav-btn">
              Log In
            </a>
          )}
        </div>
      </nav>

      <div className="ld-page">
        {/* ── Breadcrumb ── */}
        <div className="ld-breadcrumb">
          <Link href="/">Home</Link>
          <span>/</span>
          <Link href="/browse">Listings</Link>
          <span>/</span>
          <span>{listing.title}</span>
        </div>

        {/* ── Photo Gallery ── */}
        {photos.length > 0 && (
          <div className="ld-gallery">
            <div className="ld-gallery-main">
              <img src={photos[activeIdx]?.url} alt={listing.title} />
              {photos.length > 1 && (
                <>
                  <button
                    className="ld-gallery-arrow ld-gallery-prev"
                    onClick={() =>
                      setActiveIdx(
                        (i) => (i - 1 + photos.length) % photos.length,
                      )
                    }
                    aria-label="Previous photo"
                  >
                    ‹
                  </button>
                  <button
                    className="ld-gallery-arrow ld-gallery-next"
                    onClick={() => setActiveIdx((i) => (i + 1) % photos.length)}
                    aria-label="Next photo"
                  >
                    ›
                  </button>
                  <div className="ld-gallery-counter">
                    {activeIdx + 1} / {photos.length}
                  </div>
                </>
              )}
            </div>
            {photos.length > 1 && (
              <div className="ld-gallery-thumbs">
                {photos.map((p, i) => (
                  <button
                    key={p.id || p.url}
                    className={`ld-thumb ${i === activeIdx ? "active" : ""}`}
                    onClick={() => setActiveIdx(i)}
                  >
                    <img src={p.url} alt={`Photo ${i + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Content ── */}
        <div className="ld-content">
          {/* ── Left ── */}
          <div className="ld-left">
            <div className="ld-title-row">
              <h1 className="ld-title">{listing.title}</h1>
              <span className={`ld-conf-badge ${conf.cls}`} title={conf.tip}>
                {conf.icon} {conf.label}
              </span>
            </div>

            <div className="ld-address">📍 {listing.address}</div>

            {(listing.sqft != null || listing.bedrooms != null) && (
              <div className="ld-specs">
                {listing.bedrooms != null && (
                  <div className="ld-spec">
                    <span className="ld-spec-icon">🛏</span>
                    <span className="ld-spec-value">{listing.bedrooms}</span>
                    <span className="ld-spec-label">Bedrooms</span>
                  </div>
                )}
                {listing.sqft != null && (
                  <div className="ld-spec">
                    <span className="ld-spec-icon">📐</span>
                    <span className="ld-spec-value">
                      {listing.sqft.toLocaleString()}
                    </span>
                    <span className="ld-spec-label">sq ft</span>
                  </div>
                )}
                <div className="ld-spec">
                  <span className="ld-spec-icon">💸</span>
                  <span className="ld-spec-value">0%</span>
                  <span className="ld-spec-label">Commission</span>
                </div>
              </div>
            )}

            <div className="ld-section">
              <h2 className="ld-section-title">About this property</h2>
              <p className="ld-description">{listing.description}</p>
            </div>

            <div className="ld-section">
              <h2 className="ld-section-title">Why DeedScan?</h2>
              <div className="ld-why-grid">
                <div className="ld-why-item">
                  <span>💰</span>
                  <div>
                    <strong>Save ~${cad(savings)}</strong>
                    <p>No 5% agent commission on this listing</p>
                  </div>
                </div>
                <div className="ld-why-item">
                  <span>🤝</span>
                  <div>
                    <strong>Direct contact</strong>
                    <p>Message the seller with no intermediaries</p>
                  </div>
                </div>
                <div className="ld-why-item">
                  <span>🛡️</span>
                  <div>
                    <strong>AI fraud check</strong>
                    <p>Every listing scored for authenticity</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Neighborhood & Amenities ── */}
            {listing.latitude != null && listing.longitude != null && (
              <div className="ld-section">
                <h2 className="ld-section-title">Neighborhood & Amenities</h2>

                {isLoadingNeighborhood ? (
                  <div className="ld-neighborhood-loading">
                    <span className="ld-spinner">✨</span>
                    <p>
                      AI is analyzing the neighborhood, fetching transit and
                      schools...
                    </p>
                  </div>
                ) : neighborhood ? (
                  <>
                    <p className="ld-ai-summary">
                      <span className="ld-ai-sparkle">✨</span>{" "}
                      {neighborhood.aiSummary}
                    </p>
                    <div className="ld-neighborhood-grid">
                      <div className="ld-neighborhood-scores">
                        <div className="ld-score-item">
                          <div className="ld-score-header">
                            <span>Transit</span>
                            <span>{neighborhood.scores.transit}/100</span>
                          </div>
                          <div className="ld-score-bar">
                            <div
                              className="ld-score-fill transit"
                              style={{
                                width: `${neighborhood.scores.transit}%`,
                              }}
                            />
                          </div>
                        </div>
                        <div className="ld-score-item">
                          <div className="ld-score-header">
                            <span>Schools</span>
                            <span>{neighborhood.scores.schools}/100</span>
                          </div>
                          <div className="ld-score-bar">
                            <div
                              className="ld-score-fill schools"
                              style={{
                                width: `${neighborhood.scores.schools}%`,
                              }}
                            />
                          </div>
                        </div>
                        <div className="ld-score-item">
                          <div className="ld-score-header">
                            <span>Walkability</span>
                            <span>{neighborhood.scores.walkability}/100</span>
                          </div>
                          <div className="ld-score-bar">
                            <div
                              className="ld-score-fill walk"
                              style={{
                                width: `${neighborhood.scores.walkability}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="ld-neighborhood-map-container">
                        <NeighborhoodMap
                          listingLat={listing.latitude}
                          listingLng={listing.longitude}
                          pois={neighborhood.pois}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <p>Could not load neighborhood data.</p>
                )}
              </div>
            )}
          </div>

          {/* ── Right (sticky card) ── */}
          <div className="ld-right">
            <div className="ld-price-card">
              <div className="ld-price">
                ${cad(listing.price)}
                <span className="ld-price-cad"> CAD</span>
              </div>
              <div className="ld-savings-pill">
                Saves ~${cad(savings)} vs. agent
              </div>

              <div className="ld-estimate-block">
                <button
                  type="button"
                  className="ld-estimate-btn"
                  onClick={fetchPriceEstimate}
                  disabled={estimateLoading}
                  aria-busy={estimateLoading}
                >
                  {estimateLoading
                    ? "Getting estimate…"
                    : "Get suggested price"}
                </button>
                {estimateError && (
                  <p className="ld-estimate-error" role="alert">
                    {estimateError}
                  </p>
                )}
                {estimate && !estimateLoading && (
                  <div className="ld-estimate-result">
                    <div className="ld-estimate-range">
                      {estimate.price_range}
                    </div>
                    <p className="ld-estimate-explanation">
                      {estimate.explanation}
                    </p>
                  </div>
                )}
              </div>

              {user ? (
                <>
                  <Link
                    href={`/messages?listingId=${listing.id}&otherUserId=${listing.seller.id}`}
                    className="ld-cta-primary"
                  >
                    💬 Message Seller
                  </Link>
                  <Link href="/browse" className="ld-cta-secondary">
                    View Similar Listings
                  </Link>
                </>
              ) : (
                <>
                  <p className="ld-login-prompt">
                    Log in to contact this seller directly
                  </p>
                  <a href="/api/auth/login" className="ld-cta-primary">
                    Log In to Message
                  </a>
                  <a href="/api/auth/signup-buyer" className="ld-cta-secondary">
                    Sign Up Free
                  </a>
                </>
              )}

              <div className="ld-seller-row">
                <div className="ld-seller-avatar">{sellerInitial}</div>
                <div>
                  <div className="ld-seller-name">
                    {listing.seller.name ?? "Verified Seller"}
                  </div>
                  <div className="ld-seller-tag">FSBO · No Commission</div>
                </div>
              </div>

              <FraudBreakdownCard
                confidenceScore={localConfidenceScore}
                breakdownJson={localBreakdownJson}
                flagsJson={localFlagsJson}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<
  ListingDetailProps
> = async ({ req, res, params }) => {
  const id = params?.id as string;
  if (!id) {
    return { notFound: true };
  }

  const listing = await prisma.listing.findUnique({
    where: { id },
    include: {
      seller: { select: { id: true, name: true, email: true } },
      photos: { orderBy: { order: "asc" } },
    },
  });

  if (!listing) {
    return { props: { listing: null, user: null } };
  }

  let user: ListingDetailProps["user"] = null;
  const session = await auth0.getSession(req);
  if (session?.user) {
    const signupRole = getSignupIntentRole(req);
    await ensureDbUser(session.user, signupRole);
    clearSignupIntentCookie(res);
    user = { name: session.user.name, email: session.user.email };
  }

  return {
    props: {
      listing: {
        id: listing.id,
        title: listing.title,
        description: listing.description,
        address: listing.address,
        price: listing.price,
        imageUrl: listing.imageUrl,
        sqft: listing.sqft,
        bedrooms: listing.bedrooms,
        confidenceScore: listing.confidenceScore ?? null,
        breakdownJson: listing.breakdownJson ?? null,
        flagsJson: listing.flagsJson ?? null,
        latitude: listing.latitude,
        longitude: listing.longitude,
        seller: listing.seller,
        photos: listing.photos.map((p) => ({
          id: p.id,
          url: p.url,
          order: p.order,
        })),
      },
      user,
    },
  };
};
