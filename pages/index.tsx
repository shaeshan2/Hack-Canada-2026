import { GetServerSideProps } from "next";
import { useMemo, useState } from "react";
import "../lib/auth0-env";
import { getSession } from "@auth0/nextjs-auth0";
import { prisma } from "../lib/prisma";
import { ensureDbUser } from "../lib/session-user";

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
  role: "BUYER" | "SELLER" | null;
};

export default function Home({ listings, user, role }: HomeProps) {
  const [currentRole, setCurrentRole] = useState(role);
  const sellerMode = currentRole === "SELLER";

  const avgPrice = useMemo(() => {
    if (listings.length === 0) return 0;
    return Math.round(listings.reduce((sum, house) => sum + house.price, 0) / listings.length);
  }, [listings]);

  async function becomeSeller() {
    const response = await fetch("/api/profile/role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "SELLER" })
    });

    if (response.ok) {
      setCurrentRole("SELLER");
      return;
    }

    alert("Could not switch your role to seller.");
  }

  return (
    <main className="container">
      <header className="hero">
        <h1>House Marketplace</h1>
        <p>Sellers can publish houses. Registered users can browse the available listings.</p>
        <div className="actions">
          {!user && <a href="/api/auth/login">Log in</a>}
          {!user && <a href="/api/auth/login?screen_hint=signup">Sign up</a>}
          {user && <a href="/api/auth/logout">Log out</a>}
          {sellerMode && <a href="/seller">Open seller dashboard</a>}
        </div>
      </header>

      {user && (
        <section className="card">
          <h2>Account</h2>
          <p>
            Signed in as <strong>{user.name || user.email}</strong>
          </p>
          <p>Role: {currentRole || "BUYER"}</p>
          {!sellerMode && (
            <button type="button" onClick={becomeSeller}>
              Become a seller
            </button>
          )}
        </section>
      )}

      <section className="stats">
        <div className="card">
          <h3>Total Listings</h3>
          <p>{listings.length}</p>
        </div>
        <div className="card">
          <h3>Average Price</h3>
          <p>${avgPrice.toLocaleString()}</p>
        </div>
      </section>

      <section>
        <h2>Available Houses</h2>
        <div className="grid">
          {listings.map((listing) => (
            <article key={listing.id} className="card listing">
              {listing.imageUrl && <img src={listing.imageUrl} alt={listing.title} />}
              <h3>{listing.title}</h3>
              <p className="price">${listing.price.toLocaleString()}</p>
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
    const dbUser = await ensureDbUser(session.user);
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
