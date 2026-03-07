import "../lib/auth0-env";
import Head from "next/head";
import Link from "next/link";
import { FormEvent, useRef, useState } from "react";
import { auth0 } from "../lib/auth0";
import { ensureDbUser } from "../lib/session-user";
import { clearSignupIntentCookie, getSignupIntentRole } from "../lib/signup-intent";

type SellerProps = {
  user?: { name?: string };
  userName?: string;
};

function SellerPage({ userName }: SellerProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [price, setPrice] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setIsSuccess(false);

    const selectedFiles = fileInputRef.current?.files;
    if (!selectedFiles || selectedFiles.length === 0) {
      setMessage("Please add at least one photo.");
      return;
    }

    setSubmitting(true);

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("address", address);
    formData.append("price", String(Number(price)));
    Array.from(selectedFiles).forEach((file) => {
      formData.append("photos", file);
    });

    const response = await fetch("/api/listing/create", {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setMessage(payload?.error ?? "Could not create listing.");
      setSubmitting(false);
      return;
    }

    const payload = (await response.json()) as {
      listingId: string;
      initialConfidenceScore: number;
    };

    setTitle("");
    setDescription("");
    setAddress("");
    setPrice("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    setIsSuccess(true);
    setSubmitting(false);
    setMessage(
      `Listing created! Confidence score: ${payload.initialConfidenceScore}/100. Your listing is now live.`
    );
  }

  return (
    <>
      <Head>
        <title>Seller Dashboard — DeedScan</title>
        <meta name="description" content="Create and manage your property listings on DeedScan. No commissions." />
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
            <p>Create a new listing below. All prices are in CAD — no commission fees, ever.</p>
          </div>

          {message && (
            <div className={`seller-message ${isSuccess ? "success" : "error"}`}>
              {message}
            </div>
          )}

          <form onSubmit={onSubmit} className="seller-form">
            <div className="seller-field">
              <label className="seller-field-label" htmlFor="listing-title">Title</label>
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
              <label className="seller-field-label" htmlFor="listing-desc">Description</label>
              <textarea
                id="listing-desc"
                placeholder="Describe your property — features, renovations, neighborhood, etc."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={5}
              />
              <span className="seller-field-hint">A detailed description helps attract serious buyers.</span>
            </div>

            <div className="seller-field">
              <label className="seller-field-label" htmlFor="listing-address">Address</label>
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
              <label className="seller-field-label" htmlFor="listing-price">Price (CAD)</label>
              <input
                id="listing-price"
                type="number"
                min={1}
                placeholder="e.g. 850000"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
              <span className="seller-field-hint">Set your asking price — you keep 100% with DeedScan.</span>
            </div>

            <div className="seller-field">
              <label className="seller-field-label" htmlFor="listing-photos">Photos</label>
              <input
                id="listing-photos"
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                required
              />
              <span className="seller-field-hint">Upload up to 10 photos (JPEG, PNG, WebP). Max 10MB each.</span>
            </div>

            <button type="submit" className="seller-submit" disabled={submitting}>
              {submitting ? "Publishing…" : "Publish Listing →"}
            </button>
          </form>
        </div>
      </main>
    </>
  );
}

export default SellerPage;

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

    return {
      props: {
        userName: session.user.name
      }
    };
  }
});
