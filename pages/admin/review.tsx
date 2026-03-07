import "../../lib/auth0-env";
import dynamic from "next/dynamic";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { FraudFlagStatus, Role, VerificationStatus } from "@prisma/client";
import { auth0 } from "../../lib/auth0";
import { ensureDbUser } from "../../lib/session-user";
import { getSignupIntentRole } from "../../lib/signup-intent";
import { hasAuth0AdminRole } from "../../lib/auth0-roles";

const PdfViewer = dynamic(
  () => import("../../components/pdf-viewer").then((m) => m.PdfViewer),
  {
    ssr: false,
  },
);

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

type Toast = { id: number; text: string; kind: "success" | "error" };

type SellerStatusFilter = VerificationStatus;
type FlagStatusFilter = FraudFlagStatus;

type Props = {
  adminName?: string;
};

function AdminReviewPage({ adminName }: Props) {
  const [pendingSellers, setPendingSellers] = useState<PendingSeller[]>([]);
  const [flaggedListings, setFlaggedListings] = useState<FlaggedListing[]>([]);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<
    string | null
  >(null);
  const [sellerDecisionReason, setSellerDecisionReason] = useState("");
  const [flagNotes, setFlagNotes] = useState("");
  const [selectedFlagId, setSelectedFlagId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [activeTab, setActiveTab] = useState<"sellers" | "flags">("sellers");
  const [loading, setLoading] = useState(true);
  const [sellerStatusFilter, setSellerStatusFilter] =
    useState<SellerStatusFilter>(VerificationStatus.PENDING);
  const [flagStatusFilter, setFlagStatusFilter] =
    useState<FlagStatusFilter>(FraudFlagStatus.PENDING_REVIEW);
  const [bulkSellersLoading, setBulkSellersLoading] = useState(false);
  // Hydration fix: dates are locale-sensitive; only format them after client mount
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const filteredSellers = useMemo(
    () =>
      pendingSellers.filter((submission) => submission.status === sellerStatusFilter),
    [pendingSellers, sellerStatusFilter],
  );

  const filteredFlags = useMemo(
    () => flaggedListings.filter((flag) => flag.status === flagStatusFilter),
    [flaggedListings, flagStatusFilter],
  );

  const selectedSubmission = useMemo(
    () =>
      filteredSellers.find(
        (submission) => submission.id === selectedSubmissionId,
      ) ?? null,
    [filteredSellers, selectedSubmissionId],
  );

  const selectedFlag = useMemo(
    () => filteredFlags.find((flag) => flag.id === selectedFlagId) ?? null,
    [filteredFlags, selectedFlagId],
  );

  // Safe date helpers — render nothing until mounted to avoid SSR/client mismatch
  const fmtDate = (iso: string) =>
    mounted ? new Date(iso).toLocaleDateString() : "";
  const fmtDateTime = (iso: string) =>
    mounted ? new Date(iso).toLocaleString() : "";

  function addToast(text: string, kind: "success" | "error") {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, text, kind }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      4000,
    );
  }

  async function loadQueue() {
    setLoading(true);
    const response = await fetch("/api/admin/review/queue");
    setLoading(false);
    if (!response.ok) {
      addToast("Failed to load review queue", "error");
      return;
    }
    const payload = (await response.json()) as {
      pendingSellers: PendingSeller[];
      flaggedListings: FlaggedListing[];
    };
    setPendingSellers(payload.pendingSellers);
    setFlaggedListings(payload.flaggedListings);
    setSelectedSubmissionId(
      (cur) => cur ?? payload.pendingSellers[0]?.id ?? null,
    );
    setSelectedFlagId((cur) => cur ?? payload.flaggedListings[0]?.id ?? null);
  }

  useEffect(() => {
    void loadQueue();
  }, []);

  async function decideSeller(decision: "approve" | "reject") {
    if (!selectedSubmission) return;
    if (decision === "reject" && !sellerDecisionReason.trim()) {
      addToast("A rejection reason is required", "error");
      return;
    }
    const response = await fetch(
      `/api/admin/review/sellers/${selectedSubmission.id}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          reason: sellerDecisionReason.trim() || undefined,
        }),
      },
    );
    if (!response.ok) {
      const p = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      addToast(p?.error ?? "Could not apply seller decision", "error");
      return;
    }
    setSellerDecisionReason("");
    addToast(
      decision === "approve" ? "Seller approved ✓" : "Seller rejected",
      "success",
    );
    await loadQueue();
  }

  async function bulkApprovePendingSellers() {
    const targets = pendingSellers.filter(
      (submission) => submission.status === VerificationStatus.PENDING,
    );
    if (targets.length === 0) return;
    if (
      !window.confirm(
        `Approve ${targets.length} pending seller${
          targets.length === 1 ? "" : "s"
        }?`,
      )
    ) {
      return;
    }

    setBulkSellersLoading(true);
    let success = 0;
    for (const submission of targets) {
      try {
        const res = await fetch(
          `/api/admin/review/sellers/${submission.id}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ decision: "approve" }),
          },
        );
        if (res.ok) success += 1;
      } catch {
        // ignore per-item failures here; summarized via toast
      }
    }
    setBulkSellersLoading(false);

    if (success === 0) {
      addToast("Could not approve pending sellers", "error");
    } else if (success === targets.length) {
      addToast(
        `Approved ${success} seller${success === 1 ? "" : "s"}`,
        "success",
      );
    } else {
      addToast(
        `Approved ${success} of ${targets.length} sellers (some failed)`,
        "error",
      );
    }

    await loadQueue();
  }

  async function decideFlag(decision: "approve" | "ban") {
    if (!selectedFlag) return;
    const response = await fetch(`/api/admin/review/flags/${selectedFlag.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, notes: flagNotes.trim() || undefined }),
    });
    if (!response.ok) {
      const p = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      addToast(p?.error ?? "Could not apply flagged listing decision", "error");
      return;
    }
    setFlagNotes("");
    addToast(
      decision === "approve"
        ? "Listing override approved ✓"
        : "Seller banned for fraud",
      "success",
    );
    await loadQueue();
  }

  async function onReload(event: FormEvent) {
    event.preventDefault();
    await loadQueue();
  }

  const scoreColor = (score: number) =>
    score >= 80
      ? "var(--danger)"
      : score >= 50
        ? "var(--gold)"
        : "var(--accent)";

  const initials = (name: string | null, email: string) =>
    (name ?? email).charAt(0).toUpperCase();

  const pendingSellersCount = useMemo(
    () =>
      pendingSellers.filter(
        (submission) => submission.status === VerificationStatus.PENDING,
      ).length,
    [pendingSellers],
  );

  const pendingFlagsCount = useMemo(
    () =>
      flaggedListings.filter(
        (flag) => flag.status === FraudFlagStatus.PENDING_REVIEW,
      ).length,
    [flaggedListings],
  );

  const sellerStatusLabel = (status: SellerStatusFilter) => {
    switch (status) {
      case VerificationStatus.APPROVED:
        return "Approved";
      case VerificationStatus.REJECTED:
        return "Rejected";
      case VerificationStatus.PENDING:
      default:
        return "Pending";
    }
  };

  const flagStatusLabel = (status: FlagStatusFilter) => {
    switch (status) {
      case FraudFlagStatus.APPROVED:
        return "Approved";
      case FraudFlagStatus.BANNED:
        return "Banned";
      case FraudFlagStatus.PENDING_REVIEW:
      default:
        return "Pending review";
    }
  };

  return (
    <>
      <style>{`
        .ar-root {
          min-height: 100vh;
          background: var(--bg-primary);
          color: var(--text-primary);
          font-family: var(--font);
        }

        /* ── Navbar (extends global .navbar) ── */
        .ar-nav {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(10,15,26,0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border-glass);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 32px;
          height: 64px;
        }
        .ar-nav-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 700;
          font-size: 17px;
          color: var(--text-primary);
          text-decoration: none;
        }
        .ar-nav-logo-icon {
          font-size: 20px;
          line-height: 1;
        }
        .ar-admin-badge {
          background: rgba(239,68,68,0.15);
          color: var(--danger);
          border: 1px solid rgba(239,68,68,0.25);
          font-size: 11px;
          font-weight: 600;
          padding: 2px 9px;
          border-radius: var(--radius-full);
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
        .ar-nav-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .ar-nav-user {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: var(--text-secondary);
          margin-right: 8px;
        }
        .ar-avatar {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: var(--accent-glow);
          border: 1px solid var(--accent);
          color: var(--accent-light);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
          flex-shrink: 0;
        }

        /* ── Body ── */
        .ar-body {
          max-width: 1280px;
          margin: 0 auto;
          padding: 36px 24px 80px;
        }

        /* ── Page header ── */
        .ar-page-header {
          margin-bottom: 32px;
        }
        .ar-page-title {
          font-size: 28px;
          font-weight: 800;
          color: var(--text-primary);
          line-height: 1.2;
        }
        .ar-page-subtitle {
          margin-top: 4px;
          font-size: 14px;
          color: var(--text-muted);
        }

        /* ── Stats ── */
        .ar-stats {
          display: flex;
          gap: 16px;
          margin-bottom: 32px;
          flex-wrap: wrap;
        }
        .ar-stat-card {
          flex: 1;
          min-width: 150px;
          background: var(--bg-card);
          border: 1px solid var(--border-glass);
          border-radius: var(--radius-lg);
          padding: 20px 24px;
          transition: background 0.2s;
        }
        .ar-stat-card:hover { background: var(--bg-card-hover); }
        .ar-stat-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.07em;
          margin-bottom: 8px;
        }
        .ar-stat-value {
          font-size: 32px;
          font-weight: 800;
          color: var(--text-primary);
          line-height: 1;
        }
        .ar-stat-value.warn { color: var(--danger); }
        .ar-stat-value.ok   { color: var(--accent); }
        .ar-stat-status {
          font-size: 15px;
          font-weight: 600;
          padding-top: 6px;
        }

        /* ── Toolbar ── */
        .ar-toolbar {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 20px;
        }

        .ar-subtoolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        .ar-filter-group {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .ar-filter-label {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--text-muted);
        }
        .ar-filter-pill {
          border: 1px solid var(--border-glass);
          background: var(--bg-card);
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 500;
          padding: 4px 10px;
          border-radius: 999px;
          cursor: pointer;
          transition:
            background 0.15s,
            color 0.15s,
            border-color 0.15s;
        }
        .ar-filter-pill:hover {
          background: var(--bg-card-hover);
          color: var(--text-primary);
        }
        .ar-filter-pill.active {
          background: var(--accent-glow);
          color: var(--accent);
          border-color: rgba(16,185,129,0.4);
        }
        .ar-bulk-btn {
          border: 1px solid rgba(59,130,246,0.4);
          background: rgba(37,99,235,0.15);
          color: #93c5fd;
          font-size: 12px;
          font-weight: 600;
          padding: 6px 12px;
          border-radius: 999px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .ar-bulk-btn:hover:not(:disabled) {
          background: rgba(37,99,235,0.22);
        }
        .ar-bulk-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* ── Tabs ── */
        .ar-tabs {
          display: flex;
          gap: 4px;
          margin-bottom: 24px;
          border-bottom: 1px solid var(--border-glass);
        }
        .ar-tab {
          border: none;
          background: none;
          cursor: pointer;
          font-family: var(--font);
          font-size: 14px;
          font-weight: 500;
          color: var(--text-muted);
          padding: 10px 18px;
          border-bottom: 2px solid transparent;
          margin-bottom: -1px;
          display: flex;
          align-items: center;
          gap: 8px;
          border-radius: var(--radius-sm) var(--radius-sm) 0 0;
          transition: color 0.15s, background 0.15s;
        }
        .ar-tab:hover { color: var(--text-primary); background: var(--bg-card); }
        .ar-tab.active {
          color: var(--accent);
          border-bottom-color: var(--accent);
          font-weight: 600;
        }
        .ar-tab-count {
          background: var(--bg-glass);
          color: var(--text-muted);
          font-size: 11px;
          font-weight: 600;
          padding: 2px 7px;
          border-radius: var(--radius-full);
        }
        .ar-tab.active .ar-tab-count {
          background: var(--accent-glow);
          color: var(--accent);
        }

        /* ── Panel layout ── */
        .ar-panel-layout {
          display: grid;
          grid-template-columns: 300px 1fr;
          gap: 20px;
          align-items: start;
        }
        @media (max-width: 860px) { .ar-panel-layout { grid-template-columns: 1fr; } }

        /* ── Queue panel ── */
        .ar-queue-panel {
          background: var(--bg-card);
          border: 1px solid var(--border-glass);
          border-radius: var(--radius-lg);
          overflow: hidden;
        }
        .ar-queue-header {
          padding: 14px 18px;
          border-bottom: 1px solid var(--border-glass);
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .ar-queue-empty {
          padding: 32px 18px;
          text-align: center;
          color: var(--text-muted);
          font-size: 14px;
        }
        .ar-queue-item {
          width: 100%;
          border: none;
          background: none;
          cursor: pointer;
          font-family: var(--font);
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 18px;
          border-bottom: 1px solid var(--border-subtle);
          text-align: left;
          transition: background 0.12s;
        }
        .ar-queue-item:last-child { border-bottom: none; }
        .ar-queue-item:hover { background: var(--bg-card-hover); }
        .ar-queue-item.active { background: rgba(16,185,129,0.06); border-left: 2px solid var(--accent); padding-left: 16px; }
        .ar-queue-item-avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: var(--bg-glass);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 700;
          color: var(--text-secondary);
          flex-shrink: 0;
          border: 1px solid var(--border-glass);
        }
        .ar-queue-item.active .ar-queue-item-avatar {
          background: var(--accent-glow);
          color: var(--accent);
          border-color: var(--accent);
        }
        .ar-queue-item-info { flex: 1; min-width: 0; }
        .ar-queue-item-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .ar-queue-item-sub {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 2px;
        }
        .ar-queue-chevron { color: var(--text-muted); font-size: 12px; flex-shrink: 0; }
        .ar-queue-item.active .ar-queue-chevron { color: var(--accent); }

        /* ── Detail panel ── */
        .ar-detail-panel { display: flex; flex-direction: column; gap: 16px; }
        .ar-card {
          background: var(--bg-card);
          border: 1px solid var(--border-glass);
          border-radius: var(--radius-lg);
          overflow: hidden;
        }
        .ar-card-header {
          padding: 20px 24px 16px;
          border-bottom: 1px solid var(--border-subtle);
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }
        .ar-card-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .ar-card-meta {
          font-size: 13px;
          color: var(--text-muted);
          margin-top: 4px;
          line-height: 1.5;
        }
        .ar-card-body { padding: 20px 24px; }

        .ar-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.04em;
          padding: 4px 10px;
          border-radius: var(--radius-full);
          flex-shrink: 0;
          text-transform: uppercase;
        }
        .ar-pill-pending { background: rgba(245,158,11,0.12); color: var(--gold-light); border: 1px solid rgba(245,158,11,0.2); }
        .ar-pill-fraud   { background: rgba(239,68,68,0.12);  color: var(--danger);    border: 1px solid rgba(239,68,68,0.2); }
        .ar-pill-ok      { background: var(--accent-glow);    color: var(--accent);    border: 1px solid rgba(16,185,129,0.2); }

        /* ── PDF grid ── */
        .ar-pdf-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
        @media (max-width: 700px) { .ar-pdf-grid { grid-template-columns: 1fr; } }
        .ar-pdf-label {
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.07em;
          margin-bottom: 8px;
        }

        /* ── Form ── */
        .ar-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
        .ar-field-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary);
        }
        .ar-field-hint { font-weight: 400; color: var(--text-muted); }
        .ar-textarea {
          width: 100%;
          padding: 10px 14px;
          border: 1px solid var(--border-glass);
          border-radius: var(--radius-md);
          background: var(--bg-secondary);
          color: var(--text-primary);
          font-family: var(--font);
          font-size: 14px;
          resize: vertical;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .ar-textarea::placeholder { color: var(--text-muted); }
        .ar-textarea:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-glow); }

        /* ── Buttons ── */
        .ar-actions { display: flex; gap: 10px; flex-wrap: wrap; }
        .ar-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 10px 20px;
          border-radius: var(--radius-md);
          border: 1px solid transparent;
          cursor: pointer;
          font-family: var(--font);
          font-size: 14px;
          font-weight: 600;
          transition: opacity 0.15s, transform 0.1s, background 0.15s;
        }
        .ar-btn:active { transform: scale(0.97); }
        .ar-btn-approve {
          background: var(--accent-glow);
          color: var(--accent);
          border-color: rgba(16,185,129,0.2);
        }
        .ar-btn-approve:hover { background: rgba(16,185,129,0.22); }
        .ar-btn-reject {
          background: rgba(239,68,68,0.1);
          color: var(--danger);
          border-color: rgba(239,68,68,0.2);
        }
        .ar-btn-reject:hover { background: rgba(239,68,68,0.18); }
        .ar-btn-ban {
          background: var(--danger);
          color: #fff;
        }
        .ar-btn-ban:hover { opacity: 0.88; }
        .ar-btn-ghost {
          background: var(--bg-card);
          color: var(--text-secondary);
          border-color: var(--border-glass);
        }
        .ar-btn-ghost:hover { background: var(--bg-card-hover); color: var(--text-primary); }

        /* ── Score bar ── */
        .ar-score-row { margin-bottom: 22px; }
        .ar-score-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }
        .ar-score-label { font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.07em; }
        .ar-score-num { font-size: 26px; font-weight: 800; }
        .ar-score-track {
          height: 6px;
          background: var(--bg-glass);
          border-radius: var(--radius-full);
          overflow: hidden;
        }
        .ar-score-fill {
          height: 100%;
          border-radius: var(--radius-full);
          transition: width 0.5s ease;
        }

        /* ── Breakdown table ── */
        .ar-section-label {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: var(--text-muted);
          margin-bottom: 10px;
        }
        .ar-breakdown { display: flex; flex-direction: column; gap: 8px; margin-bottom: 22px; }
        .ar-breakdown-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: var(--bg-glass);
          border-radius: var(--radius-sm);
          font-size: 13px;
        }
        .ar-breakdown-key { color: var(--text-secondary); text-transform: capitalize; }
        .ar-breakdown-val { font-weight: 700; color: var(--text-primary); }

        /* ── Image matches ── */
        .ar-image-row { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 22px; }
        .ar-match-img {
          width: 96px;
          height: 72px;
          border-radius: var(--radius-sm);
          object-fit: cover;
          border: 1px solid var(--border-glass);
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .ar-match-img:hover { transform: scale(1.05); box-shadow: var(--shadow-sm); }

        /* ── Empty state ── */
        .ar-empty-detail {
          background: var(--bg-card);
          border: 1px solid var(--border-glass);
          border-radius: var(--radius-lg);
          padding: 64px 24px;
          text-align: center;
          color: var(--text-muted);
          font-size: 15px;
        }
        .ar-empty-icon { font-size: 36px; margin-bottom: 12px; }

        /* ── Toasts ── */
        .ar-toasts {
          position: fixed;
          bottom: 24px;
          right: 24px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          z-index: 1000;
        }
        .ar-toast {
          padding: 12px 18px;
          border-radius: var(--radius-md);
          font-size: 14px;
          font-weight: 500;
          box-shadow: var(--shadow-md);
          animation: ar-in 0.22s ease;
          border: 1px solid transparent;
        }
        .ar-toast-success {
          background: rgba(16,185,129,0.15);
          color: var(--accent-light);
          border-color: rgba(16,185,129,0.2);
        }
        .ar-toast-error {
          background: rgba(239,68,68,0.15);
          color: #fca5a5;
          border-color: rgba(239,68,68,0.2);
        }
        @keyframes ar-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="ar-root">
        {/* ── Navbar ── */}
        <nav className="ar-nav">
          <a href="/" className="ar-nav-brand">
            <span className="ar-nav-logo-icon">🏠</span>
            DeedScan
            <span className="ar-admin-badge">Admin</span>
          </a>
          <div className="ar-nav-right">
            <div className="ar-nav-user">
              <div className="ar-avatar">
                {initials(adminName ?? null, adminName ?? "A")}
              </div>
              <span>{adminName ?? "Admin"}</span>
            </div>
            <a
              href="/"
              className="nav-btn nav-btn-ghost"
              style={{ fontSize: 13 }}
            >
              ← Listings
            </a>
            <a
              href="/api/auth/logout"
              className="nav-btn nav-btn-ghost"
              style={{ fontSize: 13 }}
            >
              Log Out
            </a>
          </div>
        </nav>

        <div className="ar-body">
          {/* ── Page header ── */}
          <div className="ar-page-header">
            <h1 className="ar-page-title">Review Dashboard</h1>
            <p className="ar-page-subtitle">
              Seller verification queue &amp; fraud-flagged listing review
            </p>
          </div>

          {/* ── Stats ── */}
          <div className="ar-stats">
            <div className="ar-stat-card">
              <div className="ar-stat-label">Pending sellers</div>
              <div
                className={`ar-stat-value${pendingSellers.length > 0 ? " warn" : ""}`}
              >
                {loading ? "—" : pendingSellersCount}
              </div>
            </div>
            <div className="ar-stat-card">
              <div className="ar-stat-label">Flagged listings</div>
              <div
                className={`ar-stat-value${flaggedListings.length > 0 ? " warn" : ""}`}
              >
                {loading ? "—" : pendingFlagsCount}
              </div>
            </div>
            <div className="ar-stat-card">
              <div className="ar-stat-label">Queue</div>
              <div
                className={`ar-stat-value ar-stat-status${
                  loading
                    ? ""
                    : pendingSellersCount + pendingFlagsCount === 0
                      ? " ok"
                      : " warn"
                }`}
              >
                {loading
                  ? "Loading…"
                  : pendingSellersCount + pendingFlagsCount === 0
                    ? "All clear ✓"
                    : "Needs review"}
              </div>
            </div>
          </div>

          {/* ── Toolbar ── */}
          <form onSubmit={onReload} className="ar-toolbar">
            <button type="submit" className="ar-btn ar-btn-ghost">
              ↻ Refresh
            </button>
          </form>

          {/* ── Tabs ── */}
          <div className="ar-tabs">
            <button
              type="button"
              className={`ar-tab${activeTab === "sellers" ? " active" : ""}`}
              onClick={() => setActiveTab("sellers")}
            >
              Seller Verification
              <span className="ar-tab-count">{pendingSellers.length}</span>
            </button>
            <button
              type="button"
              className={`ar-tab${activeTab === "flags" ? " active" : ""}`}
              onClick={() => setActiveTab("flags")}
            >
              Fraud Flags
              <span className="ar-tab-count">{flaggedListings.length}</span>
            </button>
          </div>

          {/* ── Sellers tab ── */}
          {activeTab === "sellers" && (
            <>
              <div className="ar-subtoolbar">
                <div className="ar-filter-group">
                  <span className="ar-filter-label">Status</span>
                  <button
                    type="button"
                    className={`ar-filter-pill${
                      sellerStatusFilter === VerificationStatus.PENDING
                        ? " active"
                        : ""
                    }`}
                    onClick={() => {
                      setSellerStatusFilter(VerificationStatus.PENDING);
                      setSelectedSubmissionId(null);
                    }}
                  >
                    Pending
                  </button>
                  <button
                    type="button"
                    className={`ar-filter-pill${
                      sellerStatusFilter === VerificationStatus.APPROVED
                        ? " active"
                        : ""
                    }`}
                    onClick={() => {
                      setSellerStatusFilter(VerificationStatus.APPROVED);
                      setSelectedSubmissionId(null);
                    }}
                  >
                    Approved
                  </button>
                  <button
                    type="button"
                    className={`ar-filter-pill${
                      sellerStatusFilter === VerificationStatus.REJECTED
                        ? " active"
                        : ""
                    }`}
                    onClick={() => {
                      setSellerStatusFilter(VerificationStatus.REJECTED);
                      setSelectedSubmissionId(null);
                    }}
                  >
                    Rejected
                  </button>
                </div>
                {sellerStatusFilter === VerificationStatus.PENDING &&
                  filteredSellers.length > 0 && (
                    <button
                      type="button"
                      className="ar-bulk-btn"
                      onClick={() => void bulkApprovePendingSellers()}
                      disabled={bulkSellersLoading}
                    >
                      {bulkSellersLoading
                        ? "Approving…"
                        : `Approve all pending (${filteredSellers.length})`}
                    </button>
                  )}
              </div>

              <div className="ar-panel-layout">
                <div className="ar-queue-panel">
                  <div className="ar-queue-header">
                    {sellerStatusLabel(sellerStatusFilter)} ·{" "}
                    {filteredSellers.length}
                  </div>
                  {filteredSellers.length === 0 ? (
                    <div className="ar-queue-empty">
                      No submissions in this view
                    </div>
                  ) : (
                    filteredSellers.map((s) => (
                      <button
                        type="button"
                        key={s.id}
                        className={`ar-queue-item${
                          selectedSubmissionId === s.id ? " active" : ""
                        }`}
                        onClick={() => setSelectedSubmissionId(s.id)}
                      >
                        <div className="ar-queue-item-avatar">
                          {initials(s.user.name, s.user.email)}
                        </div>
                        <div className="ar-queue-item-info">
                          <div className="ar-queue-item-name">
                            {s.user.name || s.user.email}
                          </div>
                          <div className="ar-queue-item-sub">
                            {fmtDate(s.submittedAt)}
                          </div>
                        </div>
                        <span className="ar-queue-chevron">›</span>
                      </button>
                    ))
                  )}
                ) : (
                  </div>

                <div className="ar-detail-panel">
                  {selectedSubmission ? (
                    <div className="ar-card">
                      <div className="ar-card-header">
                        <div>
                          <div className="ar-card-title">
                            {selectedSubmission.user.name ||
                              selectedSubmission.user.email}
                          </div>
                          <div className="ar-card-meta">
                            {selectedSubmission.user.email}
                            {mounted && (
                              <>
                                {" "}
                                · Submitted{" "}
                                {fmtDateTime(selectedSubmission.submittedAt)}
                              </>
                            )}
                          </div>
                        </div>
                        <span className="ar-pill ar-pill-pending">
                          ⏳ Pending
                        </span>
                      </div>
                      <div className="ar-card-body">
                        <div className="ar-pdf-grid">
                          <div>
                            <div className="ar-pdf-label">Government ID</div>
                            <PdfViewer
                              title="Government ID"
                              url={selectedSubmission.govIdDocumentUrl}
                            />
                          </div>
                          <div>
                            <div className="ar-pdf-label">
                              Proof of Ownership
                            </div>
                            <PdfViewer
                              title="Proof of ownership"
                              url={selectedSubmission.ownershipProofUrl}
                            />
                          </div>
                        </div>
                        <div className="ar-field">
                          <label className="ar-field-label">
                            Rejection reason{" "}
                            <span className="ar-field-hint">
                              (required to reject)
                            </span>
                          </label>
                          <textarea
                            className="ar-textarea"
                            rows={3}
                            value={sellerDecisionReason}
                            onChange={(e) =>
                              setSellerDecisionReason(e.target.value)
                            }
                            placeholder="Describe the reason for rejection…"
                          />
                        </div>
                        <div className="ar-actions">
                          <button
                            type="button"
                            className="ar-btn ar-btn-approve"
                            onClick={() => decideSeller("approve")}
                          >
                            ✓ Approve seller
                          </button>
                          <button
                            type="button"
                            className="ar-btn ar-btn-reject"
                            onClick={() => decideSeller("reject")}
                          >
                            ✕ Reject seller
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="ar-empty-detail">
                      <div className="ar-empty-icon">👤</div>
                      Select a submission from the queue to review
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ── Flags tab ── */}
          {activeTab === "flags" && (
            <>
              <div className="ar-subtoolbar">
                <div className="ar-filter-group">
                  <span className="ar-filter-label">Status</span>
                  <button
                    type="button"
                    className={`ar-filter-pill${
                      flagStatusFilter === FraudFlagStatus.PENDING_REVIEW
                        ? " active"
                        : ""
                    }`}
                    onClick={() => {
                      setFlagStatusFilter(FraudFlagStatus.PENDING_REVIEW);
                      setSelectedFlagId(null);
                    }}
                  >
                    Pending
                  </button>
                  <button
                    type="button"
                    className={`ar-filter-pill${
                      flagStatusFilter === FraudFlagStatus.APPROVED
                        ? " active"
                        : ""
                    }`}
                    onClick={() => {
                      setFlagStatusFilter(FraudFlagStatus.APPROVED);
                      setSelectedFlagId(null);
                    }}
                  >
                    Approved
                  </button>
                  <button
                    type="button"
                    className={`ar-filter-pill${
                      flagStatusFilter === FraudFlagStatus.BANNED
                        ? " active"
                        : ""
                    }`}
                    onClick={() => {
                      setFlagStatusFilter(FraudFlagStatus.BANNED);
                      setSelectedFlagId(null);
                    }}
                  >
                    Banned
                  </button>
                </div>
              </div>

              <div className="ar-panel-layout">
                <div className="ar-queue-panel">
                  <div className="ar-queue-header">
                    {flagStatusLabel(flagStatusFilter)} ·{" "}
                    {filteredFlags.length}
                  </div>
                  {filteredFlags.length === 0 ? (
                    <div className="ar-queue-empty">
                      No flags in this view
                    </div>
                  ) : (
                    filteredFlags.map((flag) => (
                      <button
                        type="button"
                        key={flag.id}
                        className={`ar-queue-item${
                          selectedFlagId === flag.id ? " active" : ""
                        }`}
                        onClick={() => setSelectedFlagId(flag.id)}
                      >
                        <div
                          className="ar-queue-item-avatar"
                          style={{
                            background: `color-mix(in srgb, ${scoreColor(
                              flag.confidenceScore,
                            )} 12%, transparent)`,
                            color: scoreColor(flag.confidenceScore),
                            borderColor: `color-mix(in srgb, ${scoreColor(
                              flag.confidenceScore,
                            )} 25%, transparent)`,
                          }}
                        >
                          {flag.confidenceScore}
                        </div>
                        <div className="ar-queue-item-info">
                          <div className="ar-queue-item-name">
                            {flag.listing.title}
                          </div>
                          <div className="ar-queue-item-sub">
                            {flag.listing.address}
                          </div>
                        </div>
                        <span className="ar-queue-chevron">›</span>
                      </button>
                    ))
                  )}
                </div>

                <div className="ar-detail-panel">
                  {selectedFlag ? (
                    <div className="ar-card">
                      <div className="ar-card-header">
                        <div>
                          <div className="ar-card-title">
                            {selectedFlag.listing.title}
                          </div>
                          <div className="ar-card-meta">
                            {selectedFlag.listing.address}
                            <br />
                            Seller:{" "}
                            {selectedFlag.listing.seller.name ||
                              selectedFlag.listing.seller.email}
                          </div>
                        </div>
                        <span className="ar-pill ar-pill-fraud">
                          🚨 Flagged
                        </span>
                      </div>
                      <div className="ar-card-body">
                        <div className="ar-score-row">
                          <div className="ar-score-header">
                            <span className="ar-score-label">
                              Fraud confidence score
                            </span>
                            <span
                              className="ar-score-num"
                              style={{
                                color: scoreColor(selectedFlag.confidenceScore),
                              }}
                            >
                              {selectedFlag.confidenceScore}
                            </span>
                          </div>
                          <div className="ar-score-track">
                            <div
                              className="ar-score-fill"
                              style={{
                                width: `${selectedFlag.confidenceScore}%`,
                                background: scoreColor(
                                  selectedFlag.confidenceScore,
                                ),
                              }}
                            />
                          </div>
                        </div>

                        {Object.keys(selectedFlag.breakdown ?? {}).length >
                          0 && (
                          <>
                            <div className="ar-section-label">
                              Score breakdown
                            </div>
                            <div className="ar-breakdown">
                              {Object.entries(
                                selectedFlag.breakdown ?? {},
                              ).map(([key, val]) => (
                                <div key={key} className="ar-breakdown-row">
                                  <span className="ar-breakdown-key">
                                    {key.replace(/_/g, " ")}
                                  </span>
                                  <span className="ar-breakdown-val">
                                    {val}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </>
                        )}

                        {(selectedFlag.matchedImages ?? []).length > 0 && (
                          <>
                            <div className="ar-section-label">
                              Matched images
                            </div>
                            <div className="ar-image-row">
                              {(selectedFlag.matchedImages ?? []).map(
                                (url) => (
                                  <a
                                    key={url}
                                    href={url}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    <img
                                      src={url}
                                      alt="Matched reference"
                                      className="ar-match-img"
                                    />
                                  </a>
                                ),
                              )}
                            </div>
                          </>
                        )}

                        <div className="ar-field">
                          <label className="ar-field-label">
                            Admin notes{" "}
                            <span className="ar-field-hint">(optional)</span>
                          </label>
                          <textarea
                            className="ar-textarea"
                            rows={3}
                            value={flagNotes}
                            onChange={(e) => setFlagNotes(e.target.value)}
                            placeholder="Add internal notes about this listing…"
                          />
                        </div>
                        <div className="ar-actions">
                          <button
                            type="button"
                            className="ar-btn ar-btn-approve"
                            onClick={() => decideFlag("approve")}
                          >
                            ✓ Override — approve listing
                          </button>
                          <button
                            type="button"
                            className="ar-btn ar-btn-ban"
                            onClick={() => decideFlag("ban")}
                          >
                            🚫 Ban seller
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="ar-empty-detail">
                      <div className="ar-empty-icon">🚨</div>
                      Select a flagged listing from the queue to review
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Toasts ── */}
        <div className="ar-toasts">
          {toasts.map((t) => (
            <div key={t.id} className={`ar-toast ar-toast-${t.kind}`}>
              {t.text}
            </div>
          ))}
        </div>
      </div>
    </>
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
    const auth0Admin = hasAuth0AdminRole(
      session.user as Record<string, unknown>,
    );
    const allowDbFallback = process.env.ALLOW_DB_ADMIN_FALLBACK === "true";

    if (!auth0Admin && !(allowDbFallback && dbUser.role === "ADMIN")) {
      return { redirect: { destination: "/", permanent: false } };
    }

    return {
      props: {
        adminName: session.user.name,
      },
    };
  },
});
