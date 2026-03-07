import React from "react";
import clsx from "clsx";

type ScoreBreakdown = {
    perceptualHash: number;
    reverseImage: number;
    exifMatch: number;
    priceSanity: number;
    addressValid: number;
};

type Props = {
    confidenceScore: number | null;
    breakdownJson: string | null;
    flagsJson: string | null;
};

// Map of the backend breakdown keys to human-readable names and icons
const METRICS: { key: keyof ScoreBreakdown; label: string; icon: string }[] = [
    { key: "perceptualHash", label: "Photo Uniqueness", icon: "🔍" },
    { key: "exifMatch", label: "EXIF GPS Match", icon: "📍" },
    { key: "reverseImage", label: "Reverse Image Search", icon: "🔄" },
    { key: "priceSanity", label: "Price Sanity", icon: "💰" },
    { key: "addressValid", label: "Address Verified", icon: "🏠" },
];

export default function FraudBreakdownCard({
    confidenceScore,
    breakdownJson,
    flagsJson,
}: Props) {
    if (confidenceScore === null || !breakdownJson) {
        return (
            <div className="fraud-card pending">
                <div className="fraud-card-header">
                    <h3>Fraud Check Pending</h3>
                    <p>This listing has not been verified yet.</p>
                </div>
            </div>
        );
    }

    let breakdown: ScoreBreakdown;
    let flags: string[] = [];
    try {
        breakdown = JSON.parse(breakdownJson);
        if (flagsJson) flags = JSON.parse(flagsJson);
    } catch (err) {
        return null; // Don't render if JSON parsing completely fails
    }

    const isVerified = confidenceScore >= 85;
    const isPending = confidenceScore >= 60 && confidenceScore < 85;

    const badgeColor = isVerified
        ? "fraud-badge-green"
        : isPending
            ? "fraud-badge-amber"
            : "fraud-badge-red";

    const getBarColor = (score: number) => {
        if (score >= 85) return "#10b981"; // green
        if (score >= 60) return "#f59e0b"; // amber
        return "#ef4444"; // red
    };

    return (
        <div className="fraud-card">
            <div className="fraud-card-header">
                <div className="fraud-score-container">
                    <div className={clsx("fraud-score-circle", badgeColor)}>
                        <span className="fraud-score-value">{confidenceScore}/100</span>
                    </div>
                    <div className="fraud-score-text">
                        <h3>
                            {isVerified ? "Verified" : isPending ? "Pending Review" : "Flagged"}
                            {isVerified && <span className="fraud-icon-shield"> ✅</span>}
                        </h3>
                        <p>Listing Confidence Score</p>
                    </div>
                </div>
            </div>

            <div className="fraud-metrics-list">
                {METRICS.map(({ key, label, icon }) => {
                    const score = breakdown[key] ?? 0;
                    const barColor = getBarColor(score);
                    return (
                        <div key={key} className="fraud-metric-row">
                            <div className="fraud-metric-label">
                                <span className="fraud-metric-icon">{icon}</span>
                                <span>{label}</span>
                            </div>
                            <div className="fraud-metric-bar-container">
                                <div
                                    className="fraud-metric-bar-fill"
                                    style={{ width: `${Math.max(5, score)}%`, backgroundColor: barColor }}
                                />
                            </div>
                            <div className="fraud-metric-value">{score}%</div>
                            {score < 85 && (
                                <span className="fraud-metric-warning" title="Sub-optimal score">
                                    ⚠
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>

            {flags.length > 0 && (
                <div className="fraud-flags-section">
                    <h4 className="fraud-flags-title">Flags</h4>
                    <ul className="fraud-flags-list">
                        {flags.map((flag, idx) => (
                            <li key={idx}>⚠ {flag}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
