import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { formatTestName, formatDate } from "../../lib/insights";
import { getTestInfo } from "../../data/testInfo";

export default function TestInfoPage() {
    const { testName } = useParams<{ testName: string }>();
    const navigate = useNavigate();
    const { ranges, userRows, selectedUserId, profiles } = useApp();

    const decodedTestName = testName ? decodeURIComponent(testName) : "";

    const info = getTestInfo(decodedTestName);

    const profile = profiles.find(p => p.user_id === selectedUserId);
    
    // Look up formatting requirements / Reference ranges
    const range = ranges.find(
        (r) => r.test_name === decodedTestName && (r.sex === "all" || r.sex === profile?.sex)
    );

    // Get historical items for the test
    const testHistory = useMemo(() => {
        return userRows
            .filter((r) => r.test_name === decodedTestName)
            .sort((a, b) => b.date.localeCompare(a.date));
    }, [userRows, decodedTestName]);

    return (
        <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
            <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 transition"
            >
                ← Back
            </button>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-8 border-b border-gray-100 bg-gray-50">
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">
                                {formatTestName(decodedTestName)}
                            </h1>
                            <p className="text-lg text-gray-600 font-medium max-w-2xl">
                                {info.short_description}
                            </p>
                        </div>
                        {range && (
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center min-w-[140px]">
                                <span className="block text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-1">Optimal Range</span>
                                <span className="font-bold text-blue-700 text-lg">
                                    {range.optimal_lo} - {range.optimal_hi}
                                </span>
                                <span className="block text-xs font-semibold text-blue-500 mt-0.5">{range.unit}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-8 border-b border-gray-100 prose prose-blue max-w-none prose-headings:font-bold prose-a:text-blue-600">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 block">Detailed Information</h2>
                    <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {info.detailed_info}
                    </div>
                </div>

                {testHistory.length > 0 && (
                    <div className="p-8 bg-gray-50/50">
                        <h2 className="text-xl font-bold text-gray-800 mb-6">Your History</h2>
                        <div className="space-y-3">
                            {testHistory.map((row, idx) => {
                                let isOut = false;
                                if (range) {
                                    if (row.value < range.lab_lo || row.value > range.lab_hi) isOut = true;
                                }

                                return (
                                    <div key={idx} className="flex items-center justify-between bg-white rounded-xl p-4 shadow-sm border border-gray-100 w-full max-w-xl">
                                        <div className="flex items-center gap-4 w-40 shrink-0 border-r border-gray-100">
                                            <span className="font-semibold text-gray-600">
                                                {formatDate(row.date)}
                                            </span>
                                        </div>
                                        <div className="flex-1 px-4">
                                            {(row.lab_name || row.notes) ? (
                                                <span className="text-sm text-gray-500">
                                                    {row.lab_name} {row.lab_name && row.notes && "—"} {row.notes}
                                                </span>
                                            ) : (
                                                <span className="text-sm text-gray-400 italic">No notes</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 justify-end w-32 shrink-0">
                                            <span className={`font-bold text-lg ${isOut ? 'text-red-500' : 'text-gray-900'}`}>
                                                {row.value}
                                            </span>
                                            <span className="text-sm font-semibold text-gray-400">{row.unit}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
