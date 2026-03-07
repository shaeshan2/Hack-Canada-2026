import "../lib/auth0-env";
import { withPageAuthRequired, getSession } from "@auth0/nextjs-auth0";
import { GetServerSideProps } from "next";
import { FormEvent, useState } from "react";
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
  const [imageUrl, setImageUrl] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const response = await fetch("/api/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        address,
        price: Number(price),
        imageUrl: imageUrl || null
      })
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setMessage(payload?.error ?? "Could not create listing.");
      return;
    }

    setTitle("");
    setDescription("");
    setAddress("");
    setPrice("");
    setImageUrl("");
    setMessage("Listing created. You can now see it on the home page.");
  }

  return (
    <main className="container">
      <header className="hero">
        <h1>DeedScan — Seller Dashboard</h1>
        <p>Create your listing. Prices in CAD. No commission.</p>
        <div className="actions">
          <a href="/">Back to DeedScan</a>
          <a href="/messages">Messages</a>
          <a href="/api/auth/logout">Log out</a>
        </div>
      </header>

      <form onSubmit={onSubmit} className="card form">
        <label>
          Title
          <input value={title} onChange={(event) => setTitle(event.target.value)} required />
        </label>

        <label>
          Description
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            required
            rows={5}
          />
        </label>

        <label>
          Address
          <input value={address} onChange={(event) => setAddress(event.target.value)} required />
        </label>

        <label>
          Price (CAD)
          <input
            type="number"
            min={1}
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            required
          />
        </label>

        <label>
          Image URL (optional)
          <input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} />
        </label>

        <button type="submit">Publish listing</button>
        {message && <p>{message}</p>}
      </form>
    </main>
  );
}

export default SellerPage;

export const getServerSideProps: GetServerSideProps<SellerProps> = withPageAuthRequired({
  async getServerSideProps({ req, res }) {
    const session = await getSession(req, res);

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
