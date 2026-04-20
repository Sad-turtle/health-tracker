import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import type { Domain } from "../../types";
import { formatDate } from "../../lib/insights";
import EntryForm from "./EntryForm";

// ── Helpers ──────────────────────────────────────────────────────────

const DOMAIN_HEADER_COLORS: Record<Domain, string> = {
    metabolic: "from-teal-500 to-teal-600",
    blood: "from-purple-500 to-purple-600",
    cardiovascular: "from-red-500 to-red-600",
    hormones: "from-amber-500 to-amber-600",
    micronutrients: "from-blue-500 to-blue-600",
    inflammatory: "from-pink-500 to-pink-600",
    advanced: "from-gray-500 to-gray-600",
    cancer_markers: "from-slate-500 to-slate-600",
    gut: "from-orange-500 to-orange-600",
    body_composition: "from-cyan-500 to-cyan-600",
    strength: "from-stone-500 to-stone-600",
    cardio: "from-emerald-500 to-emerald-600",
    mobility: "from-lime-500 to-lime-600",
};

function formatDomainName(domain: string): string {
    return domain
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── DomainCard ───────────────────────────────────────────────────────

interface DomainCardProps {
    domain: Domain;
}

export default function DomainCard({ domain }: DomainCardProps) {
    const navigate = useNavigate();
    const { userRows, userInsights } = useApp();
    const [showEntryForm, setShowEntryForm] = useState(false);

    // Filter to this domain
    const domainRows = useMemo(
        () => userRows.filter((r) => r.domain === domain),
        [userRows, domain],
    );

    const domainInsights = useMemo(
        () => userInsights.filter((i) => i.domain === domain),
        [userInsights, domain],
    );

    // Badge severity
    const hasCritical = domainInsights.some((i) => i.severity === "critical");
    const hasWarning = domainInsights.some((i) => i.severity === "warning");
    const alertCount = domainInsights.filter(
        (i) => i.severity === "critical" || i.severity === "warning",
    ).length;

    // Most recent date across all domain rows
    const lastUpdated = domainRows.length
        ? domainRows.reduce((max, r) => (r.date > max ? r.date : max), domainRows[0].date)
        : null;

    return (
        <>
            <div 
                onClick={() => navigate(`/domain/${domain}`)}
                className="flex flex-col cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md h-full min-h-[140px]"
            >
                {/* ── Header ────────────────────────────────────────────── */}
                <div
                    className={`flex items-center justify-between bg-gradient-to-r px-4 py-3 ${DOMAIN_HEADER_COLORS[domain]}`}
                >
                    <h3 className="text-sm font-bold tracking-wide text-white">
                        {formatDomainName(domain)}
                    </h3>

                    {hasCritical ? (
                        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-200 px-1.5 text-xs font-bold text-red-800">
                            {alertCount}
                        </span>
                    ) : hasWarning ? (
                        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-200 px-1.5 text-xs font-bold text-amber-800">
                            {alertCount}
                        </span>
                    ) : (
                        <span className="text-sm text-white/80">✓</span>
                    )}
                </div>

                {/* ── Body ──────────────────────────────────────────────────────── */}
                <div className="flex-1 px-4 py-4 flex flex-col justify-center">
                    {(() => {
                        const uniqueTests = new Set(domainRows.map(r => r.test_name)).size;
                        const missingCount = domainInsights.filter(i => i.type === "NEVER_TESTED" || i.type.startsWith("OVERDUE")).length;

                        return (
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                        <span className="text-lg">📊</span> Total Recordings
                                    </span>
                                    <span className="text-base font-bold text-gray-900">{domainRows.length}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                        <span className="text-lg">🧪</span> Unique Tests
                                    </span>
                                    <span className="text-base font-bold text-gray-900">{uniqueTests}</span>
                                </div>
                                {missingCount > 0 && (
                                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                        <span className="text-sm font-medium text-amber-600 flex items-center gap-2">
                                            <span className="text-lg">⚠️</span> Action Needed
                                        </span>
                                        <span className="text-sm font-bold text-amber-600">{missingCount} missing/due</span>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>

                {/* ── Footer ────────────────────────────────────────────── */}
                <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2.5">
                    <span className="text-xs text-gray-400">
                        {lastUpdated ? `Updated ${formatDate(lastUpdated)}` : "—"}
                    </span>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowEntryForm(true);
                        }}
                        className="rounded-md bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-200"
                    >
                        + Add reading
                    </button>
                </div>
            </div>

            {showEntryForm && (
                <EntryForm
                    defaultDomain={domain}
                    onClose={() => setShowEntryForm(false)}
                />
            )}
        </>
    );
}
