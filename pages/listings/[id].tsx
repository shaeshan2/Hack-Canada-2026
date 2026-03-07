import { GetServerSideProps } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import "../../lib/auth0-env";
import { getSession } from "@auth0/nextjs-auth0";
import { ensureDbUser } from "../../lib/session-user";
import { clearSignupIntentCookie, getSignupIntentRole } from "../../lib/signup-intent";
import { prisma } from "../../lib/prisma";

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
    seller: { id: string; name: string | null; email: string };
    photos: { id: string; url: string; order: number }[];
  } | null;
  user: { name?: string; email?: string } | null;
};

function confidenceBadge(score: number | null) {
  if (score == null) return null;
  if (score >= 85) return { label: "Verified", class: "badge-verified" };
  if (score >= 60) return { label: "Pending", class: "badge-pending" };
  return { label: "Low", class: "badge-low" };
}

export default function ListingDetailPage({ listing, user }: ListingDetailProps) {
  const router = useRouter();
  if (!listing) {
    return (
      <main className="container">
        <p>Listing not found.</p>
        <Link href="/">Back to DeedScan</Link>
      </main>
    );
  }

  const badge = confidenceBadge(listing.confidenceScore);
  const photos = listing.photos?.length ? listing.photos : listing.imageUrl ? [{ url: listing.imageUrl, id: "", order: 0 }] : [];

  return (
    <main className="container">
      <header className="hero">
        <Link href="/">← DeedScan</Link>
      </header>

      <article className="card listing-detail">
        {photos.length > 0 && (
          <div className="listing-photos">
            {photos.map((p) => (
              <img key={p.id || p.url} src={p.url} alt={listing.title} />
            ))}
          </div>
        )}
        <h1>{listing.title}</h1>
        <p className="price">${listing.price.toLocaleString("en-CA")} CAD</p>
        {badge && (
          <p className={`confidence-badge ${badge.class}`}>
            {badge.label === "Verified" && "🟢 "}
            {badge.label === "Pending" && "🟡 "}
            {badge.label === "Low" && "🔴 "}
            {badge.label}
          </p>
        )}
        <p>{listing.address}</p>
        {(listing.sqft != null || listing.bedrooms != null) && (
          <p>
            {listing.sqft != null && `${listing.sqft} sqft`}
            {listing.sqft != null && listing.bedrooms != null && " · "}
            {listing.bedrooms != null && `${listing.bedrooms} bed`}
          </p>
        )}
        <p>{listing.description}</p>
        <p className="seller">Seller: {listing.seller.name || listing.seller.email}</p>

        {user ? (
          <div className="actions">
            <Link href={`/messages?listingId=${listing.id}&otherUserId=${listing.seller.id}`} className="button primary">
              Message seller
            </Link>
            <Link href="/">Find similar</Link>
          </div>
        ) : (
          <p>
            <a href="/api/auth/login">Log in</a> to message the seller.
          </p>
        )}
      </article>
    </main>
  );
}

export const getServerSideProps: GetServerSideProps<ListingDetailProps> = async ({ req, res, params }) => {
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
  const session = await getSession(req, res);
  if (session?.user) {
    const signupRole = getSignupIntentRole(req);
    await ensureDbUser(session.user, signupRole);
    clearSignupIntentCookie(res);
    user = { name: session.user.name, email: session.user.email };
  }

  return {
    props: {
      listing: {
        ...listing,
        seller: listing.seller,
        photos: listing.photos,
      },
      user,
    },
  };
};
