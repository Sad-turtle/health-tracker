import { useState } from "react";
import { useApp } from "../../context/AppContext";
import type { Insight, Domain } from "../../types";
import { formatTestName } from "../../lib/insights";

// ── Domain badge colours ─────────────────────────────────────────────
const DOMAIN_COLORS: Record<Domain, string> = {
    metabolic: "bg-teal-100 text-teal-800",
    blood: "bg-purple-100 text-purple-800",
    cardiovascular: "bg-red-100 text-red-800",
    hormones: "bg-amber-100 text-amber-800",
    micronutrients: "bg-blue-100 text-blue-800",
    inflammatory: "bg-pink-100 text-pink-800",
    advanced: "bg-gray-100 text-gray-700",
    cancer_markers: "bg-slate-100 text-slate-800",
    gut: "bg-amber-100 text-amber-800",
    body_composition: "bg-cyan-100 text-cyan-800",
    strength: "bg-stone-100 text-stone-800",
    cardio: "bg-teal-100 text-teal-800",
    mobility: "bg-lime-100 text-lime-800",
};

const DEFAULT_VISIBLE = 10;

// ── Sub-components ───────────────────────────────────────────────────

function DomainBadge({ domain }: { domain: Domain }) {
    return (
        <span
            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${DOMAIN_COLORS[domain]}`}
        >
            {domain}
        </span>
    );
}

function InsightCard({ insight }: { insight: Insight }) {
    const isCritical = insight.severity === "critical";

    return (
        <div
            className={`rounded-lg border-l-4 p-4 ${isCritical
                    ? "border-red-500 bg-red-50"
                    : "border-amber-400 bg-amber-50"
                }`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900">
                        {formatTestName(insight.test_name)}
                    </p>
                    <p className="mt-1 text-sm text-gray-700">{insight.message}</p>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <DomainBadge domain={insight.domain} />

                    {insight.days_overdue != null && insight.days_overdue > 0 && (
                        <span className="inline-block rounded-full bg-red-200 px-2 py-0.5 text-xs font-medium text-red-900">
                            {insight.days_overdue}d overdue
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Main component ───────────────────────────────────────────────────

export default function AlertsPanel({ domainFilter }: { domainFilter?: Domain }) {
    const { userInsights } = useApp();
    const [showAll, setShowAll] = useState(false);

    const relevantInsights = domainFilter 
        ? userInsights.filter(i => i.domain === domainFilter)
        : userInsights;

    // Only critical + warning
    const alerts = relevantInsights.filter(
        (i) => i.severity === "critical" || i.severity === "warning",
    );

    if (alerts.length === 0) {
        return (
            <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
                <span className="text-2xl">✅</span>
                <p className="mt-2 font-semibold text-green-800">
                    All checks look good
                </p>
                <p className="text-sm text-green-600">
                    No critical or overdue items right now.
                </p>
            </div>
        );
    }

    const critical = alerts.filter((i) => i.severity === "critical");
    const warnings = alerts.filter((i) => i.severity === "warning");

    const visible = showAll ? alerts : alerts.slice(0, DEFAULT_VISIBLE);
    const visibleCritical = visible.filter((i) => i.severity === "critical");
    const visibleWarnings = visible.filter((i) => i.severity === "warning");

    return (
        <section className="space-y-5">
            {/* Critical section */}
            {visibleCritical.length > 0 && (
                <div>
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-red-700">
                        <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
                        Critical ({critical.length})
                    </h3>
                    <div className="space-y-2">
                        {visibleCritical.map((insight) => (
                            <InsightCard key={insight.id} insight={insight} />
                        ))}
                    </div>
                </div>
            )}

            {/* Warning section */}
            {visibleWarnings.length > 0 && (
                <div>
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-amber-700">
                        <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
                        Warning ({warnings.length})
                    </h3>
                    <div className="space-y-2">
                        {visibleWarnings.map((insight) => (
                            <InsightCard key={insight.id} insight={insight} />
                        ))}
                    </div>
                </div>
            )}

            {/* Show all toggle */}
            {alerts.length > DEFAULT_VISIBLE && (
                <button
                    onClick={() => setShowAll((prev) => !prev)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
                >
                    {showAll ? "Show fewer" : `Show all ${alerts.length}`}
                </button>
            )}
        </section>
    );
}
