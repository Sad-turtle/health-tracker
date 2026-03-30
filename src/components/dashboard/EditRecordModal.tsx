import { useState, useEffect, useRef, useCallback } from "react";
import { useApp } from "../../context/AppContext";
import type { Domain, HealthRow } from "../../types";

const ALL_DOMAINS: Domain[] = [
    "metabolic",
    "blood",
    "cardiovascular",
    "hormones",
    "micronutrients",
    "inflammatory",
    "advanced",
    "cancer_markers",
    "gut",
];

function formatDomainLabel(d: string): string {
    return d.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface EditRecordModalProps {
    row: HealthRow;
    onClose: () => void;
}

export default function EditRecordModal({ row, onClose }: EditRecordModalProps) {
    const { addRow, removeRow } = useApp();

    // Editable State mapping the legacy row details
    const [domain, setDomain] = useState<Domain>(row.domain);
    const [date, setDate] = useState(row.date);
    const [testName, setTestName] = useState(row.test_name);
    const [value, setValue] = useState(String(row.value));
    const [unit, setUnit] = useState(row.unit);
    const [labName, setLabName] = useState(row.lab_name || "");
    const [notes, setNotes] = useState(row.notes || "");

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const backdropRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleKey(e: KeyboardEvent) {
            if (e.key === "Escape") onClose();
        }
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [onClose]);

    const handleBackdropClick = useCallback(
        (e: React.MouseEvent) => {
            if (e.target === backdropRef.current) onClose();
        },
        [onClose],
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue <= 0) {
            setError("Value must be a valid positive number.");
            return;
        }

        if (!testName.trim()) {
            setError("Test name cannot be completely blank.");
            return;
        }

        setSaving(true);
        try {
            // Because standard backend edits require rewriting G-Apps logic,
            // we safely mutate edits by destroying old and appending new locally 
            // over identical Google Cloud targets.
            await removeRow(row);
            
            await addRow({
                date,
                user_id: row.user_id,
                test_name: testName.trim(),
                value: numValue,
                unit: unit.trim(),
                domain,
                lab_name: labName.trim() || undefined,
                notes: notes.trim() || undefined,
            });

            setSuccess(true);
            setTimeout(onClose, 1000);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            ref={backdropRef}
            onClick={handleBackdropClick}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
        >
            <form
                onSubmit={handleSubmit}
                className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
            >
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition"
                    aria-label="Close"
                >
                    ✕
                </button>

                <h2 className="mb-6 text-lg font-bold text-gray-900 border-b border-gray-100 pb-3">
                    Edit Health Record
                </h2>

                <div className="space-y-4">
                    {/* Domain & Date Row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Domain Group</label>
                            <select
                                value={domain}
                                onChange={(e) => setDomain(e.target.value as Domain)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                            >
                                {ALL_DOMAINS.map((d) => (
                                    <option key={d} value={d}>
                                        {formatDomainLabel(d)}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Date recorded</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Test Name */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Test Name</label>
                        <input
                            type="text"
                            value={testName}
                            onChange={(e) => setTestName(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                        />
                    </div>

                    {/* Value & Unit Row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Value</label>
                            <input
                                type="number"
                                step="any"
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none font-medium text-right"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Unit</label>
                            <input
                                type="text"
                                value={unit}
                                onChange={(e) => setUnit(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none text-gray-600"
                            />
                        </div>
                    </div>

                    {/* Lab & Notes Row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                Lab name <span className="font-normal text-gray-400">(opt)</span>
                            </label>
                            <input
                                type="text"
                                value={labName}
                                onChange={(e) => setLabName(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                Notes <span className="font-normal text-gray-400">(opt)</span>
                            </label>
                            <input
                                type="text"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Error Box */}
                {error && (
                    <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                        {error}
                    </p>
                )}

                {/* Success */}
                {success && (
                    <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
                        ✓ Record seamlessly overwritten!
                    </p>
                )}

                {/* Action Controls */}
                <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-100 pt-5">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
                    >
                        Discard Edits
                    </button>
                    <button
                        type="submit"
                        disabled={saving || success}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                    >
                        {saving && (
                            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" /><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" /></svg>
                        )}
                        {saving ? "Overwriting Database..." : "Save Changes"}
                    </button>
                </div>
            </form>
        </div>
    );
}
