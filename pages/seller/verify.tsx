import Head from "next/head";
import Link from "next/link";
import { FormEvent, useRef, useState } from "react";
import type { GetServerSidePropsContext } from "next";
import "../../lib/auth0-env";
import { auth0 } from "../../lib/auth0";
import { getSignupIntentRole } from "../../lib/signup-intent";
import { ensureDbUser } from "../../lib/session-user";
import { prisma } from "../../lib/prisma";

type VerifyProps = {
  user?: { name?: string; email?: string };
  role?: string;
  submission?: { status: string; rejectionReason?: string } | null;
};

export default function SellerVerifyPage({
  user,
  role,
  submission,
}: VerifyProps) {
  const govIdRef = useRef<HTMLInputElement>(null);
  const ownershipRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    const govIdFile = govIdRef.current?.files?.[0];
    const ownershipFile = ownershipRef.current?.files?.[0];

    if (!govIdFile || !ownershipFile) {
      setMessage(
        "Please upload both your government ID and proof of ownership.",
      );
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append("govId", govIdFile);
    formData.append("ownershipProof", ownershipFile);

    const uploadRes = await fetch("/api/upload/verification", {
      method: "POST",
      body: formData,
    });

    if (!uploadRes.ok) {
      const data = (await uploadRes.json().catch(() => ({}))) as {
        error?: string;
      };
      setMessage(data.error ?? "Upload failed");
      setLoading(false);
      return;
    }

    const { govIdDocumentUrl, ownershipProofUrl } =
      (await uploadRes.json()) as {
        govIdDocumentUrl: string;
        ownershipProofUrl: string;
      };

    const verifyRes = await fetch("/api/seller/verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ govIdDocumentUrl, ownershipProofUrl }),
    });

    if (!verifyRes.ok) {
      const data = (await verifyRes.json().catch(() => ({}))) as {
        error?: string;
      };
      setMessage(data.error ?? "Verification submission failed");
      setLoading(false);
      return;
    }

    setMessage(
      "Documents submitted successfully. An admin will review your verification shortly.",
    );
    if (govIdRef.current) govIdRef.current.value = "";
    if (ownershipRef.current) ownershipRef.current.value = "";
    setLoading(false);
  }

  if (!user) {
    return (
      <>
        <Head>
          <title>Verify Identity | DeedScan</title>
        </Head>
        <div className="signup-page">
          <div className="signup-card">
            <h1>Sign in required</h1>
            <p>You must be logged in to complete seller verification.</p>
            <Link href="/api/auth/login" className="btn btn-primary">
              Log in
            </Link>
          </div>
        </div>
      </>
    );
  }

  const isPending = submission?.status === "PENDING";
  const isRejected = submission?.status === "REJECTED";

  return (
    <>
      <Head>
        <title>Verify Identity | DeedScan</title>
      </Head>
      <div className="signup-page">
        <div className="signup-card verify-card">
          <div className="signup-header">
            <h1>Verify your identity</h1>
            <p>
              Upload your government-issued ID and proof of property ownership.
              Our team will review your documents within 1–2 business days.
            </p>
          </div>

          {role === "SELLER_VERIFIED" && (
            <div className="verify-success">
              <span className="verify-badge">✓ Verified</span>
              <p>
                Your seller account is verified. You can create listings from
                your dashboard.
              </p>
              <Link href="/seller" className="btn btn-primary">
                Go to Dashboard
              </Link>
            </div>
          )}

          {role === "BUYER" && (
            <div className="verify-rejected">
              <p>
                You signed up as a buyer. To list properties, please sign up as
                a seller first.
              </p>
              <Link
                href="/api/auth/signup-seller"
                className="btn btn-primary"
                style={{ marginTop: 12 }}
              >
                Sign up as Seller
              </Link>
            </div>
          )}

          {(role === "SELLER_PENDING" || !role) && (
            <>
              {isRejected && submission?.rejectionReason && (
                <div className="verify-rejected">
                  <strong>Previous submission was rejected:</strong>{" "}
                  {submission.rejectionReason}
                </div>
              )}

              {isPending && (
                <div className="verify-pending">
                  <span className="verify-badge pending">Pending review</span>
                  <p>
                    Your documents have been submitted. We&apos;ll notify you
                    once your verification is complete.
                  </p>
                </div>
              )}

              <form onSubmit={onSubmit} className="signup-form verify-form">
                <label>
                  Government ID (driver&apos;s license, passport, etc.)
                  <input
                    ref={govIdRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    required={!isPending}
                  />
                  <span className="signup-hint">PDF or image (max 10MB)</span>
                </label>
                <label>
                  Proof of ownership (deed, title, or mortgage statement)
                  <input
                    ref={ownershipRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    required={!isPending}
                  />
                  <span className="signup-hint">PDF or image (max 10MB)</span>
                </label>

                {message && <div className="signup-error">{message}</div>}

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading || isPending}
                >
                  {loading
                    ? "Uploading…"
                    : isPending
                      ? "Already submitted"
                      : "Submit for review"}
                </button>
              </form>
            </>
          )}

          <p className="signup-login">
            <Link href="/">← Back to DeedScan</Link>
          </p>
        </div>
      </div>
    </>
  );
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const session = await auth0.getSession(context.req);
  let user: { name?: string; email?: string } | null = null;
  let role: string | null = null;
  let submission: { status: string; rejectionReason?: string } | null = null;

  if (session?.user) {
    const signupRole = getSignupIntentRole(context.req);
    const dbUser = await ensureDbUser(session.user, signupRole);
    user = { name: session.user.name, email: session.user.email };
    role = dbUser.role;

    try {
      const latest = await prisma.sellerVerificationSubmission.findFirst({
        where: { userId: dbUser.id },
        orderBy: { submittedAt: "desc" },
      });
      if (latest) {
        submission = {
          status: latest.status,
          rejectionReason: latest.rejectionReason ?? undefined,
        };
      }
    } catch (err) {
      console.error("Failed to query sellerVerificationSubmission:", err);
    }
  }

  return { props: { user, role, submission } };
}
