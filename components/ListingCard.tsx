import Link from "next/link";
import { useState } from "react";
import type { ListingCardData } from "../types";

type ListingCardProps = {
  listing: ListingCardData;
  index: number;
  showMessageSeller: boolean;
  initialIsSaved?: boolean;
  onSaveToggle?: (listingId: string, isSaved: boolean) => void;
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
  initialIsSaved = false,
  onSaveToggle,
}: ListingCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isSaved, setIsSaved] = useState(initialIsSaved);
  const [isSaving, setIsSaving] = useState(false);
  const badge = confidenceLabel(listing.confidenceScore);
  const isSellerVerified = listing.seller.role === "SELLER_VERIFIED";

  const handleSaveToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSaving) return;

    setIsSaving(true);
    const method = isSaved ? "DELETE" : "POST";

    try {
      const res = await fetch(`/api/user/saved-listings/${listing.id}`, {
        method,
      });
      if (res.ok) {
        setIsSaved(!isSaved);
        onSaveToggle?.(listing.id, !isSaved);
      }
    } catch (err) {
      console.error("Failed to toggle save state", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <article
      className={`listing-card animate-in animate-in-delay-${(index % 3) + 1}`}
    >
      <div className="listing-card-image-wrap">
        {listing.imageUrl && !imageError ? (
          <img
            className="listing-card-image"
            src={listing.imageUrl}
            alt={listing.title}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="listing-card-image-placeholder">🏠</div>
        )}
        <button
          className={`listing-card-save-btn ${isSaved ? "saved" : ""}`}
          onClick={handleSaveToggle}
          disabled={isSaving}
          aria-label={isSaved ? "Unsave listing" : "Save listing"}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill={isSaved ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
      </div>
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
