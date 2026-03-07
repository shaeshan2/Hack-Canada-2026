import { GetServerSideProps } from "next";
import Head from "next/head";
import Link from "next/link";
import { useState } from "react";
import { prisma } from "../lib/prisma";

type ClipListing = {
  id: string;
  title: string;
  description: string;
  address: string;
  price: number;
  sqft: number | null;
  bedrooms: number | null;
  confidenceScore: number | null;
  seller: { id: string; name: string | null };
  photos: { url: string }[];
};

type Props = {
  listing: ClipListing | null;
};

function cad(n: number) {
  return n.toLocaleString("en-CA", { maximumFractionDigits: 0 });
}

function confBadge(score: number | null) {
  if (score == null) return { label: "AI Pending", color: "#888", icon: "⏳" };
  if (score >= 85)
    return { label: `${score}/100 Verified`, color: "#16a34a", icon: "🛡️" };
  if (score >= 60)
    return { label: `${score}/100 Review`, color: "#d97706", icon: "⚠️" };
  return { label: `${score}/100 Low`, color: "#dc2626", icon: "🚨" };
}

export default function ClipPage({ listing }: Props) {
  const [photoIdx, setPhotoIdx] = useState(0);

  if (!listing) {
    return (
      <div className="clip-notfound">
        <Head>
          <title>Listing not found — DeedScan</title>
        </Head>
        <p>This listing could not be found.</p>
        <Link href="/browse">Browse all listings →</Link>
      </div>
    );
  }

  const photos = listing.photos.length > 0 ? listing.photos : [];
  const conf = confBadge(listing.confidenceScore);
  const savings = Math.round(listing.price * 0.05);
  const returnTo = encodeURIComponent(
    `/messages?listingId=${listing.id}&otherUserId=${listing.seller.id}`,
  );
  const messageHref = `/api/auth/login?returnTo=${returnTo}`;

  return (
    <>
      <Head>
        <title>{`${listing.title} — DeedScan`}</title>
        <meta
          name="description"
          content={`${listing.address} — $${cad(listing.price)} CAD. Commission-free on DeedScan.`}
        />
        <meta property="og:title" content={listing.title} />
        <meta
          property="og:description"
          content={`${listing.address} · $${cad(listing.price)} CAD · Save ~$${cad(savings)} in agent fees`}
        />
        {photos[0] && <meta property="og:image" content={photos[0].url} />}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="clip-page">
        {/* Header */}
        <div className="clip-header">
          <Link href="/" className="clip-logo">
            🏠 DeedScan
          </Link>
          <span className="clip-tag">No Commission · FSBO</span>
        </div>

        {/* Photo */}
        {photos.length > 0 && (
          <div className="clip-photo-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos[photoIdx].url}
              alt={listing.title}
              className="clip-photo"
            />
            {photos.length > 1 && (
              <div className="clip-photo-dots">
                {photos.map((_, i) => (
                  <button
                    key={i}
                    className={`clip-dot${i === photoIdx ? " active" : ""}`}
                    onClick={() => setPhotoIdx(i)}
                    aria-label={`Photo ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Core info */}
        <div className="clip-body">
          <h1 className="clip-title">{listing.title}</h1>
          <p className="clip-address">📍 {listing.address}</p>

          <div className="clip-price-row">
            <span className="clip-price">
              ${cad(listing.price)}
              <span className="clip-cad"> CAD</span>
            </span>
            <span className="clip-savings">
              💰 Saves ~${cad(savings)} vs. agent
            </span>
          </div>

          {/* Specs */}
          {(listing.bedrooms != null || listing.sqft != null) && (
            <div className="clip-specs">
              {listing.bedrooms != null && (
                <span className="clip-spec">🛏 {listing.bedrooms} beds</span>
              )}
              {listing.sqft != null && (
                <span className="clip-spec">
                  📐 {listing.sqft.toLocaleString()} sq ft
                </span>
              )}
              <span className="clip-spec">0% commission</span>
            </div>
          )}

          {/* AI Score */}
          <div
            className="clip-score"
            style={{ borderColor: conf.color, color: conf.color }}
          >
            {conf.icon} AI Score: {conf.label}
          </div>

          {/* Seller */}
          <p className="clip-seller">
            Listed by{" "}
            <strong>{listing.seller.name ?? "Verified Seller"}</strong>
          </p>

          {/* CTA */}
          <a href={messageHref} className="clip-cta">
            💬 Message Seller — No Agent Needed
          </a>

          <p className="clip-footer">
            Powered by <Link href="/">DeedScan</Link> · Commission-free real
            estate
          </p>
        </div>
      </div>

      <style jsx>{`
        .clip-page {
          max-width: 480px;
          margin: 0 auto;
          font-family:
            -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          background: #fff;
          min-height: 100vh;
        }
        .clip-notfound {
          padding: 48px 24px;
          text-align: center;
        }
        .clip-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          border-bottom: 1px solid #e5e7eb;
        }
        .clip-logo {
          font-weight: 700;
          font-size: 18px;
          color: #1d4ed8;
          text-decoration: none;
        }
        .clip-tag {
          font-size: 12px;
          color: #16a34a;
          font-weight: 600;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 99px;
          padding: 3px 10px;
        }
        .clip-photo-wrap {
          position: relative;
          width: 100%;
          height: 240px;
          background: #f3f4f6;
          overflow: hidden;
        }
        .clip-photo {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .clip-photo-dots {
          position: absolute;
          bottom: 10px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 6px;
        }
        .clip-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.6);
          border: none;
          cursor: pointer;
          padding: 0;
        }
        .clip-dot.active {
          background: #fff;
        }
        .clip-body {
          padding: 20px 16px 40px;
        }
        .clip-title {
          font-size: 20px;
          font-weight: 700;
          margin: 0 0 6px;
          color: #111;
        }
        .clip-address {
          font-size: 14px;
          color: #6b7280;
          margin: 0 0 16px;
        }
        .clip-price-row {
          display: flex;
          align-items: baseline;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 14px;
        }
        .clip-price {
          font-size: 26px;
          font-weight: 800;
          color: #111;
        }
        .clip-cad {
          font-size: 14px;
          font-weight: 400;
          color: #6b7280;
        }
        .clip-savings {
          font-size: 13px;
          font-weight: 600;
          color: #16a34a;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 99px;
          padding: 3px 10px;
        }
        .clip-specs {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 14px;
        }
        .clip-spec {
          font-size: 13px;
          color: #374151;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 99px;
          padding: 4px 12px;
        }
        .clip-score {
          font-size: 14px;
          font-weight: 600;
          border: 1px solid;
          border-radius: 8px;
          padding: 10px 14px;
          margin-bottom: 14px;
        }
        .clip-seller {
          font-size: 14px;
          color: #6b7280;
          margin: 0 0 20px;
        }
        .clip-cta {
          display: block;
          width: 100%;
          text-align: center;
          background: #1d4ed8;
          color: #fff;
          font-size: 17px;
          font-weight: 700;
          padding: 16px;
          border-radius: 12px;
          text-decoration: none;
          margin-bottom: 20px;
        }
        .clip-footer {
          font-size: 12px;
          color: #9ca3af;
          text-align: center;
        }
        .clip-footer a {
          color: #6b7280;
        }
      `}</style>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async ({
  query,
}) => {
  const id = typeof query.id === "string" ? query.id : null;

  if (!id) {
    return { props: { listing: null } };
  }

  const raw = await prisma.listing.findUnique({
    where: { id },
    include: {
      seller: { select: { id: true, name: true } },
      photos: { orderBy: { order: "asc" } },
    },
  });

  if (!raw) {
    return { props: { listing: null } };
  }

  return {
    props: {
      listing: {
        id: raw.id,
        title: raw.title,
        description: raw.description,
        address: raw.address,
        price: raw.price,
        sqft: raw.sqft,
        bedrooms: raw.bedrooms,
        confidenceScore: raw.confidenceScore,
        seller: raw.seller,
        photos: raw.photos.map((p) => ({ url: p.url })),
      },
    },
  };
};
