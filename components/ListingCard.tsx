import Link from "next/link";
import type { ListingCardData } from "../types";

type ListingCardProps = {
  listing: ListingCardData;
  index: number;
  showMessageSeller: boolean;
};

function cad(n: number) {
  return n.toLocaleString("en-CA", { maximumFractionDigits: 0 });
}

function confidenceLabel(score: number | null) {
  if (score == null) return { text: "Pending", cls: "na" };
  if (score >= 85) return { text: `${score}/100`, cls: "high" };
  if (score >= 60) return { text: `${score}/100`, cls: "medium" };
  return { text: `${score}/100`, cls: "low" };
}

export default function ListingCard({
  listing,
  index,
  showMessageSeller,
}: ListingCardProps) {
  const badge = confidenceLabel(listing.confidenceScore);
  const isSellerVerified = listing.seller.role === "SELLER_VERIFIED";

  return (
    <article
      className={`listing-card animate-in animate-in-delay-${(index % 3) + 1}`}
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
            {badge.cls === "high" ? "✓ " : badge.cls === "low" ? "⚠ " : ""}
            {badge.text}
          </span>
        </div>
        <div className="listing-card-price">${cad(listing.price)} CAD</div>
        <div className="listing-card-title">
          <Link href={`/listings/${listing.id}`}>{listing.title}</Link>
        </div>
        <div className="listing-card-address">📍 {listing.address}</div>
        <div className="listing-card-desc">{listing.description}</div>
      </div>
      <div className="listing-card-footer">
        <div className="listing-card-actions">
          <Link href={`/listings/${listing.id}`}>View details</Link>
          {showMessageSeller && (
            <a href={`/messages?listingId=${listing.id}&otherUserId=${listing.seller.id}`}>
              Message seller
            </a>
          )}
        </div>
        <div className="listing-card-footer-meta">
          <span>
            Seller: {listing.seller.name || "Unknown"}
            {isSellerVerified && (
              <span
                className="seller-verified-check"
                aria-label="Verified seller"
                title="Verified seller"
              >
                {" "}
                ✓
              </span>
            )}
          </span>
          <span>{new Date(listing.createdAt).toLocaleDateString("en-CA")}</span>
        </div>
      </div>
    </article>
  );
}
