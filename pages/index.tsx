import { GetServerSideProps } from "next";
import { useMemo, useState } from "react";
import "../lib/auth0-env";
import { getSession } from "@auth0/nextjs-auth0";
import { prisma } from "../lib/prisma";
import { ensureDbUser } from "../lib/session-user";
import { clearSignupIntentCookie, getSignupIntentRole } from "../lib/signup-intent";

type ListingView = {
  id: string;
  title: string;
  description: string;
  address: string;
  price: number;
  imageUrl: string | null;
  createdAt: string;
  seller: {
    name: string | null;
    email: string;
  };
};

type HomeProps = {
  listings: ListingView[];
  user: {
    name?: string;
    email?: string;
  } | null;
  role: "BUYER" | "SELLER_PENDING" | "SELLER_VERIFIED" | "ADMIN" | null;
};

export default function Home({ listings, user, role }: HomeProps) {
  const [currentRole] = useState(role);
  const sellerMode = currentRole === "SELLER_VERIFIED";
  const roleLabel =
    currentRole === "SELLER_VERIFIED"
      ? "seller_verified"
      : currentRole === "SELLER_PENDING"
        ? "seller_pending"
        : currentRole === "ADMIN"
          ? "admin"
          : "buyer";

  const avgPrice = useMemo(() => {
    if (listings.length === 0) return 0;
    return Math.round(listings.reduce((sum, house) => sum + house.price, 0) / listings.length);
  }, [listings]);

  return (
    <main className="container">
      <header className="hero">
        <h1>DeedScan</h1>
        <p>No agent. No commission. Browse Canadian listings and message sellers directly.</p>
        <div className="actions">
          {!user && <a href="/api/auth/login">Log in</a>}
          {!user && <a href="/api/auth/signup-buyer">Sign up as buyer</a>}
          {!user && <a href="/api/auth/signup-seller">Sign up as seller</a>}
          {user && <a href="/api/auth/logout">Log out</a>}
          {sellerMode && <a href="/seller">Seller dashboard</a>}
        </div>
      </header>
      {!user && (
        <section className="stats">
          <div className="card">
            <h3>Buyer</h3>
            <p>Browse listings and message sellers. No commission.</p>
          </div>
          <div className="card">
            <h3>Seller</h3>
            <p>Verify once, then list your home. Buyers scan your sign&apos;s QR to view and message.</p>
          </div>
        </section>
      )}

      {user && (
        <section className="card">
          <h2>Account</h2>
          <p>
            Signed in as <strong>{user.name || user.email}</strong>
          </p>
          <p>Role: {roleLabel}</p>
          {currentRole === "SELLER_PENDING" && (
            <p>Your seller account is pending verification. Listing creation is disabled until approved.</p>
          )}
        </section>
      )}

      <section className="stats">
        <div className="card">
          <h3>Total Listings</h3>
          <p>{listings.length}</p>
        </div>
        <div className="card">
          <h3>Average Price (CAD)</h3>
          <p>${avgPrice.toLocaleString("en-CA")}</p>
        </div>
      </section>

      <section>
        <h2>Listings</h2>
        <div className="grid">
          {listings.map((listing) => (
            <article key={listing.id} className="card listing">
              {listing.imageUrl && <img src={listing.imageUrl} alt={listing.title} />}
              <h3>{listing.title}</h3>
              <p className="price">${listing.price.toLocaleString("en-CA")} CAD</p>
              <p>{listing.address}</p>
              <p>{listing.description}</p>
              <p className="seller">Seller: {listing.seller.name || listing.seller.email}</p>
            </article>
          ))}

          {listings.length === 0 && <p>No listings yet.</p>}
        </div>
      </section>
    </main>
  );
}

export const getServerSideProps: GetServerSideProps<HomeProps> = async ({ req, res }) => {
  const session = await getSession(req, res);
  let user: HomeProps["user"] = null;
  let role: HomeProps["role"] = null;

  if (session?.user) {
    const signupRole = getSignupIntentRole(req);
    const dbUser = await ensureDbUser(session.user, signupRole);
    clearSignupIntentCookie(res);
    user = {
      name: session.user.name,
      email: session.user.email
    };
    role = dbUser.role;
  }

  const listings = await prisma.listing.findMany({
    include: {
      seller: {
        select: {
          name: true,
          email: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return {
    props: {
      listings: listings.map((listing) => ({
        ...listing,
        createdAt: listing.createdAt.toISOString()
      })),
      user,
      role
    }
  };
};
