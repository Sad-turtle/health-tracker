import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import type { Domain } from "../../types";
import { formatTestName, formatDate } from "../../lib/insights";
import AlertsPanel from "./AlertsPanel";
import MultiTrendChart from "./MultiTrendChart";
import EditRecordModal from "./EditRecordModal";
import IconTooltip from "../ui/IconTooltip";
import type { HealthRow } from "../../types";

type StatusDot = "red" | "amber" | "green" | "gray";

function StatusIndicator({ status }: { status: StatusDot }) {
    const colors: Record<StatusDot, string> = {
        red: "bg-red-500",
        amber: "bg-amber-400",
        green: "bg-emerald-500",
        gray: "bg-gray-300",
    };

    return (
        <span
            className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${colors[status]}`}
        />
    );
}

export default function DomainPage() {
    const { domainId } = useParams<{ domainId: string }>();
    const navigate = useNavigate();
    const { userRows, userInsights, ranges, profiles, selectedUserId, removeRow } = useApp();
    const [selectedTests, setSelectedTests] = useState<string[]>([]);
    
    // Feature state tracking the target item for historical mapping
    const [editTarget, setEditTarget] = useState<HealthRow | null>(null);

    const toggleTest = (testName: string) => {
        setSelectedTests(prev => prev.includes(testName) ? prev.filter(t => t !== testName) : [...prev, testName]);
    };

    const domain = domainId as Domain;

    const domainRows = useMemo(
        () => userRows.filter((r) => r.domain === domain),
        [userRows, domain],
    );

    const domainInsights = useMemo(
        () => userInsights.filter((i) => i.domain === domain),
        [userInsights, domain],
    );

    const latestTests = useMemo(() => {
        const byTest = new Map<string, (typeof domainRows)[0]>();
        for (const row of domainRows) {
            const existing = byTest.get(row.test_name);
            if (!existing || row.date > existing.date) {
                byTest.set(row.test_name, row);
            }
        }
        return Array.from(byTest.values())
            .sort((a, b) => b.date.localeCompare(a.date));
    }, [domainRows]);

    const selectedHistory = useMemo(() => {
        return domainRows
            .filter(r => selectedTests.includes(r.test_name))
            .sort((a, b) => b.date.localeCompare(a.date));
    }, [domainRows, selectedTests]);

    function dotForTest(testName: string): StatusDot {
        const insight = domainInsights.find((i) => i.test_name === testName);
        if (!insight) return "gray";
        if (insight.type === "OUT_OF_LAB_RANGE") return "red";
        if (insight.type === "SUBOPTIMAL") return "amber";
        if (insight.type === "OPTIMAL") return "green";
        return "gray";
    }

    const profile = profiles.find((p) => p.user_id === selectedUserId);

    // Domain Health Score Math
    const healthScore = useMemo(() => {
        if (latestTests.length === 0) return null;
        let earnedPoints = 0;
        let scorableTests = 0;

        for (const test of latestTests) {
            const insight = domainInsights.find((i) => i.test_name === test.test_name);
            if (insight) {
                scorableTests++;
                if (insight.type === "OPTIMAL") earnedPoints += 1.0;
                else if (insight.type === "SUBOPTIMAL") earnedPoints += 0.5;
                // Out of range is 0 points
            }
        }

        if (scorableTests === 0) return null;
        return Math.round((earnedPoints / scorableTests) * 100);
    }, [latestTests, domainInsights]);

    // Compute Delta helper
    const getDelta = (testName: string, latestVal: number) => {
        const testHistory = domainRows
            .filter((r) => r.test_name === testName)
            .sort((a, b) => b.date.localeCompare(a.date));

        if (testHistory.length < 2) return null;
        const previousVal = testHistory[1].value;
        if (previousVal === 0) return null;

        const diff = latestVal - previousVal;
        const percent = (diff / previousVal) * 100;

        const normalizedTestName = testName.toLowerCase().replace(/[ -]/g, '_');
        const range = ranges.find(
            (r) => r.test_name.toLowerCase().replace(/[ -]/g, '_') === normalizedTestName && (r.sex === "all" || r.sex === profile?.sex)
        );

        let isGood = true; // Neutral good if no range specified 
        if (range) {
            if (range.higher_is_better && diff < 0) isGood = false;
            if (!range.higher_is_better && diff > 0) isGood = false;
        }

        return { diff, percent, isGood };
    };

    return (
        <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
            <button
                onClick={() => navigate("/")}
                className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 transition"
            >
                ← Back to Dashboard
            </button>
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold capitalize tracking-wide text-gray-900">
                    {domainId?.replace(/_/g, " ")} Domain Overview
                </h1>
                
                {healthScore !== null && (
                    <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex flex-col">
                            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Health Score</span>
                            <span className="text-2xl font-extrabold text-gray-800 leading-none">{healthScore} <span className="text-sm font-medium text-gray-400">/100</span></span>
                        </div>
                        <div className="w-12 h-12 rounded-full flex items-center justify-center relative">
                            <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                                <circle cx="24" cy="24" r="20" fill="none" stroke="#f3f4f6" strokeWidth="4" />
                                <circle 
                                    cx="24" cy="24" r="20" fill="none" 
                                    stroke={healthScore >= 80 ? "#10b981" : healthScore >= 50 ? "#f59e0b" : "#ef4444"} 
                                    strokeWidth="4" 
                                    strokeDasharray="125.6" 
                                    strokeDashoffset={125.6 - (125.6 * healthScore) / 100}
                                    strokeLinecap="round"
                                />
                            </svg>
                        </div>
                    </div>
                )}
            </div>

            <div className="space-y-4">
                <AlertsPanel domainFilter={domain} />
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-800">Available Tests</h2>
                    <span className="text-sm text-gray-500 font-medium bg-gray-100 px-3 py-1 rounded-full">{selectedTests.length} selected for comparison</span>
                </div>
                
                {selectedTests.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden p-6">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-800">
                                Normalized Comparison Chart
                            </h2>
                            <button
                                onClick={() => setSelectedTests([])}
                                className="text-sm text-gray-400 hover:text-gray-600 font-medium"
                            >
                                Clear Selection
                            </button>
                        </div>
                        <MultiTrendChart selectedTests={selectedTests} />

                        {selectedHistory.length > 0 && (
                            <div className="mt-8 border-t border-gray-100 pt-6">
                                <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-500">
                                    Chronological History Logs
                                </h3>
                                <div className="space-y-2">
                                    {selectedHistory.map((d, i) => (
                                        <div key={i} className="flex items-center justify-between overflow-hidden rounded-xl bg-gray-50/70 p-3 pr-4 shadow-sm border border-gray-100 transition hover:bg-white hover:border-gray-200">
                                            <div className="flex w-24 shrink-0 items-center justify-center rounded-lg bg-white py-1.5 shadow-sm border border-gray-100/50">
                                                <span className="text-xs font-semibold text-gray-500 tracking-wide">
                                                    {formatDate(d.date)}
                                                </span>
                                            </div>
                                            
                                            <div className="flex-1 px-5 flex flex-col justify-center">
                                                <span className="font-semibold text-gray-900 text-sm truncate">
                                                    {formatTestName(d.test_name)}
                                                </span>
                                                {(d.lab_name || d.notes) && (
                                                    <span className="text-[10px] text-gray-400 truncate max-w-xs block mt-0.5">
                                                        {d.lab_name} {d.lab_name && d.notes && "—"} {d.notes}
                                                    </span>
                                                )}
                                            </div>
                                            
                                            {(() => {
                                                const normalizedTestName = d.test_name.toLowerCase().replace(/[ -]/g, '_');
                                                const range = ranges.find(
                                                    (r) => r.test_name.toLowerCase().replace(/[ -]/g, '_') === normalizedTestName && (r.sex === "all" || r.sex === profile?.sex)
                                                );
                                                
                                                let isOut = false;
                                                let isSub = false;
                                                if (range) {
                                                    if (d.value < range.lab_lo || d.value > range.lab_hi) isOut = true;
                                                    else if (d.value < range.optimal_lo || d.value > range.optimal_hi) isSub = true;
                                                }

                                                const valueColor = isOut ? "text-red-600" : isSub ? "text-amber-500" : range ? "text-emerald-500" : "text-gray-800";

                                                return (
                                                    <div className="flex items-center gap-2 pr-6 border-r border-gray-200 w-32 justify-end">
                                                        <span className={`text-base font-bold ${valueColor}`}>
                                                            {d.value}
                                                        </span>
                                                        <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                                                            {d.unit}
                                                        </span>
                                                    </div>
                                                );
                                            })()}
                                            
                                            <div className="flex shrink-0 items-center gap-2 pl-4">
                                                <button
                                                    onClick={() => setEditTarget(d)}
                                                    className="rounded-lg p-2 text-gray-400 transition hover:bg-blue-50 hover:text-blue-600"
                                                    title="Edit Record"
                                                >
                                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        if (window.confirm("Are you positive you want to instantly eradicate this historical record?")) {
                                                            try {
                                                                await removeRow(d);
                                                            } catch (err) {
                                                                window.alert(`Failed to delete record: ${err instanceof Error ? err.message : String(err)}`);
                                                            }
                                                        }
                                                    }}
                                                    className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                                                    title="Delete Record"
                                                >
                                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {latestTests.length === 0 ? (
                        <p className="py-8 text-center text-sm text-gray-400">
                            No data recorded in this domain yet.
                        </p>
                    ) : (
                        <ul className="divide-y divide-gray-100">
                            {latestTests.map((row) => (
                                <li key={row.test_name}>
                                    <button
                                        onClick={() => toggleTest(row.test_name)}
                                        className={`w-full flex items-center gap-3 py-4 px-5 transition text-left ${selectedTests.includes(row.test_name) ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}
                                    >
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${selectedTests.includes(row.test_name) ? 'bg-blue-500 border-blue-500' : 'border-gray-300 bg-white'}`}>
                                            {selectedTests.includes(row.test_name) && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                        </div>

                                        <StatusIndicator status={dotForTest(row.test_name)} />

                                        <div className="min-w-0 flex-1 flex items-center gap-1">
                                            <span className="truncate font-medium text-gray-800 text-base">
                                                {formatTestName(row.test_name)}
                                            </span>
                                            <IconTooltip testName={row.test_name} />
                                        </div>

                                        <div className="flex flex-col shrink-0 items-end min-w-[100px]">
                                            <span className="font-bold text-gray-900 text-base">
                                                {row.value}
                                                <span className="ml-1 text-xs font-medium text-gray-500">
                                                    {row.unit}
                                                </span>
                                            </span>
                                            
                                            {(() => {
                                                const delta = getDelta(row.test_name, row.value);
                                                if (!delta) {
                                                    const insight = domainInsights.find((i) => i.test_name === row.test_name);
                                                    if (insight?.type === "OUT_OF_LAB_RANGE") return <span className="text-[10px] font-bold px-1.5 py-0.5 mt-0.5 rounded border text-red-800 bg-red-100 border-red-200">Out of range</span>;
                                                    if (insight?.type === "SUBOPTIMAL") return <span className="text-[10px] font-bold px-1.5 py-0.5 mt-0.5 rounded border text-amber-800 bg-amber-100 border-amber-200">Suboptimal</span>;
                                                    if (insight?.type === "OPTIMAL") return <span className="text-[10px] font-bold px-1.5 py-0.5 mt-0.5 rounded border text-emerald-800 bg-emerald-100 border-emerald-200">Optimal</span>;
                                                    
                                                    return <span className="text-xs text-gray-400">First reading</span>;
                                                }
                                                
                                                const sign = delta.diff > 0 ? "▲" : delta.diff < 0 ? "▼" : "—";
                                                const color = delta.isGood ? "text-emerald-600 bg-emerald-50 border-emerald-100" : "text-red-600 bg-red-50 border-red-100";
                                                
                                                if (delta.diff === 0) return <span className="text-[10px] text-gray-400 px-1 border border-transparent">No change</span>;

                                                return (
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 mt-0.5 rounded border ${color}`}>
                                                        {sign} {Math.abs(delta.percent).toFixed(1)}%
                                                    </span>
                                                );
                                            })()}
                                        </div>

                                        <span className="shrink-0 text-xs font-medium text-gray-400 w-20 text-right">
                                            {formatDate(row.date)}
                                        </span>
                                        
                                        <span className={`text-gray-300 ml-2 transition-transform ${selectedTests.includes(row.test_name) ? 'rotate-90 text-blue-400' : ''}`}>›</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {/* Editing overlay */}
            {editTarget && (
                <EditRecordModal 
                    row={editTarget}
                    onClose={() => setEditTarget(null)}
                />
            )}
        </div>
    );
}
