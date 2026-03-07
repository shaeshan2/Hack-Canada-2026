import "../../lib/auth0-env";
import dynamic from "next/dynamic";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { FraudFlagStatus, Role, VerificationStatus } from "@prisma/client";
import { auth0 } from "../../lib/auth0";
import { ensureDbUser } from "../../lib/session-user";
import { getSignupIntentRole } from "../../lib/signup-intent";
import { hasAuth0AdminRole } from "../../lib/auth0-roles";

const PdfViewer = dynamic(() => import("../../components/pdf-viewer").then((m) => m.PdfViewer), {
  ssr: false
});

type PendingSeller = {
  id: string;
  govIdDocumentUrl: string;
  ownershipProofUrl: string;
  status: VerificationStatus;
  rejectionReason: string | null;
  submittedAt: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    role: Role;
  };
};

type FlaggedListing = {
  id: string;
  status: FraudFlagStatus;
  confidenceScore: number;
  notes: string | null;
  breakdown: Record<string, number> | null;
  matchedImages: string[] | null;
  listing: {
    id: string;
    title: string;
    address: string;
    imageUrl: string | null;
    seller: {
      id: string;
      email: string;
      name: string | null;
      role: Role;
      blockedReason: string | null;
    };
  };
};

type Props = {
  adminName?: string;
};

function AdminReviewPage({ adminName }: Props) {
  const [pendingSellers, setPendingSellers] = useState<PendingSeller[]>([]);
  const [flaggedListings, setFlaggedListings] = useState<FlaggedListing[]>([]);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [sellerDecisionReason, setSellerDecisionReason] = useState("");
  const [flagNotes, setFlagNotes] = useState("");
  const [selectedFlagId, setSelectedFlagId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const selectedSubmission = useMemo(
    () => pendingSellers.find((submission) => submission.id === selectedSubmissionId) ?? null,
    [pendingSellers, selectedSubmissionId]
  );

  const selectedFlag = useMemo(
    () => flaggedListings.find((flag) => flag.id === selectedFlagId) ?? null,
    [flaggedListings, selectedFlagId]
  );

  async function loadQueue() {
    const response = await fetch("/api/admin/review/queue");
    if (!response.ok) {
      setMessage("Failed to load review queue");
      return;
    }
    const payload = (await response.json()) as {
      pendingSellers: PendingSeller[];
      flaggedListings: FlaggedListing[];
    };

    setPendingSellers(payload.pendingSellers);
    setFlaggedListings(payload.flaggedListings);
    setSelectedSubmissionId((current) => current ?? payload.pendingSellers[0]?.id ?? null);
    setSelectedFlagId((current) => current ?? payload.flaggedListings[0]?.id ?? null);
  }

  useEffect(() => {
    void loadQueue();
  }, []);

  async function decideSeller(decision: "approve" | "reject") {
    if (!selectedSubmission) return;

    if (decision === "reject" && !sellerDecisionReason.trim()) {
      setMessage("Rejection reason is required");
      return;
    }

    const response = await fetch(`/api/admin/review/sellers/${selectedSubmission.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        decision,
        reason: sellerDecisionReason.trim() || undefined
      })
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setMessage(payload?.error ?? "Could not apply seller decision");
      return;
    }

    setSellerDecisionReason("");
    setMessage(`Seller ${decision}d`);
    await loadQueue();
  }

  async function decideFlag(decision: "approve" | "ban") {
    if (!selectedFlag) return;

    const response = await fetch(`/api/admin/review/flags/${selectedFlag.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        decision,
        notes: flagNotes.trim() || undefined
      })
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setMessage(payload?.error ?? "Could not apply flagged listing decision");
      return;
    }

    setFlagNotes("");
    setMessage(decision === "approve" ? "Listing override approved" : "Seller banned for fraud");
    await loadQueue();
  }

  async function onReload(event: FormEvent) {
    event.preventDefault();
    await loadQueue();
  }

  return (
    <main className="container">
      <header className="hero">
        <h1>Admin Review Dashboard</h1>
        <p>Manual queue for seller verification and fraud-flagged listing review.</p>
        <div className="actions">
          <a href="/">Back to listings</a>
          <a href="/api/auth/logout">Log out</a>
        </div>
        <p>Signed in as {adminName || "admin"}</p>
      </header>

      <form onSubmit={onReload} className="actions">
        <button type="submit">Reload queue</button>
      </form>
      {message && <p>{message}</p>}

      <section className="admin-layout">
        <div className="card">
          <h2>Pending seller queue</h2>
          {pendingSellers.length === 0 && <p>No pending seller submissions.</p>}
          <div className="queue-list">
            {pendingSellers.map((submission) => (
              <button
                type="button"
                key={submission.id}
                className={`queue-item ${selectedSubmissionId === submission.id ? "active" : ""}`}
                onClick={() => setSelectedSubmissionId(submission.id)}
              >
                <strong>{submission.user.name || submission.user.email}</strong>
                <span>{new Date(submission.submittedAt).toLocaleString()}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <h2>Flagged listings queue</h2>
          {flaggedListings.length === 0 && <p>No flagged listings pending review.</p>}
          <div className="queue-list">
            {flaggedListings.map((flag) => (
              <button
                type="button"
                key={flag.id}
                className={`queue-item ${selectedFlagId === flag.id ? "active" : ""}`}
                onClick={() => setSelectedFlagId(flag.id)}
              >
                <strong>{flag.listing.title}</strong>
                <span>Score: {flag.confidenceScore}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {selectedSubmission && (
        <section className="card">
          <h2>Document review: {selectedSubmission.user.name || selectedSubmission.user.email}</h2>
          <p>Submitted: {new Date(selectedSubmission.submittedAt).toLocaleString()}</p>
          <div className="pdf-grid">
            <PdfViewer title="Government ID" url={selectedSubmission.govIdDocumentUrl} />
            <PdfViewer title="Proof of ownership" url={selectedSubmission.ownershipProofUrl} />
          </div>
          <label>
            Reject reason
            <textarea
              rows={3}
              value={sellerDecisionReason}
              onChange={(event) => setSellerDecisionReason(event.target.value)}
              placeholder="Required if rejecting"
            />
          </label>
          <div className="actions">
            <button type="button" onClick={() => decideSeller("approve")}>Approve seller</button>
            <button type="button" onClick={() => decideSeller("reject")}>Reject seller</button>
          </div>
        </section>
      )}

      {selectedFlag && (
        <section className="card">
          <h2>Flagged listing review: {selectedFlag.listing.title}</h2>
          <p>Address: {selectedFlag.listing.address}</p>
          <p>Seller: {selectedFlag.listing.seller.name || selectedFlag.listing.seller.email}</p>
          <p>Confidence score: {selectedFlag.confidenceScore}</p>
          <h3>Score breakdown</h3>
          <ul>
            {Object.entries(selectedFlag.breakdown || {}).map(([key, value]) => (
              <li key={key}>
                {key}: {value}
              </li>
            ))}
            {Object.keys(selectedFlag.breakdown || {}).length === 0 && <li>No breakdown data</li>}
          </ul>
          <h3>Matched images</h3>
          <div className="image-row">
            {(selectedFlag.matchedImages || []).map((url) => (
              <a key={url} href={url} target="_blank" rel="noreferrer">
                <img src={url} alt="Matched reference" />
              </a>
            ))}
            {(selectedFlag.matchedImages || []).length === 0 && <p>No image matches recorded.</p>}
          </div>
          <label>
            Admin notes
            <textarea
              rows={3}
              value={flagNotes}
              onChange={(event) => setFlagNotes(event.target.value)}
              placeholder="Optional notes"
            />
          </label>
          <div className="actions">
            <button type="button" onClick={() => decideFlag("approve")}>Override approve</button>
            <button type="button" onClick={() => decideFlag("ban")}>Ban seller</button>
          </div>
        </section>
      )}
    </main>
  );
}

export default AdminReviewPage;

export const getServerSideProps = auth0.withPageAuthRequired({
  async getServerSideProps({ req, res }) {
    const session = await auth0.getSession(req);
    if (!session?.user) {
      return { redirect: { destination: "/api/auth/login", permanent: false } };
    }

    const signupRole = getSignupIntentRole(req);
    const dbUser = await ensureDbUser(session.user, signupRole);
    const auth0Admin = hasAuth0AdminRole(session.user as Record<string, unknown>);
    const allowDbFallback = process.env.ALLOW_DB_ADMIN_FALLBACK === "true";

    if (!auth0Admin && !(allowDbFallback && dbUser.role === "ADMIN")) {
      return { redirect: { destination: "/", permanent: false } };
    }

    return {
      props: {
        adminName: session.user.name
      }
    };
  }
});
