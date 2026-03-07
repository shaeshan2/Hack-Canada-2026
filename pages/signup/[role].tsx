import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { FormEvent, useState } from "react";
import { validatePassword } from "../../lib/password-validation";

type Role = "buyer" | "seller";

export default function SignupPage() {
  const router = useRouter();
  const role = (router.query.role === "seller" ? "seller" : "buyer") as Role;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const pwResult = validatePassword(password);
    if (!pwResult.valid) {
      setError(pwResult.errors[0]);
      setLoading(false);
      return;
    }

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password, name: name.trim(), role }),
    });

    const data = (await res.json().catch(() => ({}))) as { error?: string; redirect?: string };
    if (!res.ok) {
      setError(data.error ?? "Signup failed");
      setLoading(false);
      return;
    }
    if (data.redirect) {
      window.location.href = data.redirect;
      return;
    }
  }

  const isSeller = role === "seller";

  return (
    <>
      <Head>
        <title>Sign Up {isSeller ? "as Seller" : "as Buyer"} | DeedScan</title>
      </Head>
      <div className="signup-page">
        <div className="signup-card">
          <div className="signup-header">
            <h1>Create your account</h1>
            <p>
              {isSeller
                ? "Sign up as a seller to list your property and reach buyers directly."
                : "Sign up as a buyer to browse listings and message sellers."}
            </p>
          </div>

          <form onSubmit={onSubmit} className="signup-form">
            <label>
              Full name
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Smith"
                autoComplete="name"
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                required
              />
              <span className="signup-hint">
                8+ chars, 1 upper, 1 lower, 1 number, 1 special (!@#$%^&*)
              </span>
            </label>

            {error && <div className="signup-error">{error}</div>}

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          {isSeller && (
            <p className="signup-seller-note">
              After signup, you&apos;ll log in and then verify your identity with a government ID and proof of ownership.
            </p>
          )}
          <p className="signup-seller-note">
            You&apos;ll be redirected to log in with your new credentials.
          </p>

          <p className="signup-login">
            Already have an account?{" "}
            <Link href="/api/auth/login">Log in</Link>
          </p>
        </div>

        <Link href="/" className="signup-back">
          ← Back to DeedScan
        </Link>
      </div>
    </>
  );
}
