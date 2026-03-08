import { withPageAuthRequired } from "@auth0/nextjs-auth0/client";
import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import ListingCard from "../components/ListingCard";
import type { ListingCardData } from "../types";

export default withPageAuthRequired(function SavedListings() {
  const [listings, setListings] = useState<ListingCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user/saved-listings", { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setListings(data);
        }
      })
      .catch((err) => console.error("Failed to load saved listings", err))
      .finally(() => setLoading(false));
  }, []);

  const handleSaveToggle = (id: string, isSaved: boolean) => {
    if (!isSaved) {
      // Optistically remove from the list
      setListings((prev) => prev.filter((l) => l.id !== id));
    }
  };

  return (
    <div className="app-container">
      <Head>
        <title>Saved Listings | DeedScan</title>
      </Head>

      <main className="saved-page-main animate-in">
        <div className="section-header">
          <h1>Your Saved Listings</h1>
          <p>Properties you've starred to keep an eye on.</p>
        </div>

        {loading ? (
          <div className="loading-spinner" />
        ) : listings.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">❤️</div>
            <h2>No saved listings yet</h2>
            <p>
              When you see a property you like, click the heart icon to save it
              for later.
            </p>
            <Link
              href="/"
              className="nav-btn nav-btn-primary"
              style={{ marginTop: "16px" }}
            >
              Browse Listings
            </Link>
          </div>
        ) : (
          <div className="listings-grid">
            {listings.map((l, idx) => (
              <ListingCard
                key={l.id}
                listing={l}
                index={idx}
                showMessageSeller={false}
                initialIsSaved={true}
                onSaveToggle={handleSaveToggle}
              />
            ))}
          </div>
        )}
      </main>

      <style jsx>{`
        .saved-page-main {
          max-width: 1200px;
          margin: 0 auto;
          padding: 48px 24px;
          min-height: calc(100vh - 72px);
        }
        .section-header {
          margin-bottom: 40px;
          text-align: center;
        }
        .section-header h1 {
          font-size: 2.5rem;
          font-weight: 800;
          color: var(--text-primary);
          margin-bottom: 8px;
        }
        .section-header p {
          color: var(--text-secondary);
          font-size: 1.1rem;
        }
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 24px;
          background: var(--bg-card);
          border: 1px dashed var(--border-glass);
          border-radius: var(--radius-xl);
          text-align: center;
        }
        .empty-icon {
          font-size: 3rem;
          filter: grayscale(1);
          opacity: 0.5;
          margin-bottom: 16px;
        }
        .empty-state h2 {
          font-size: 1.5rem;
          color: var(--text-primary);
          margin-bottom: 8px;
        }
        .empty-state p {
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
});
