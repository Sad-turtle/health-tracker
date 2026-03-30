import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useApp } from "../../context/AppContext";
import { ALL_DOMAINS } from "../../types";
import type { Domain } from "../../types";

// ── Constants ────────────────────────────────────────────────────────

function todayISO(): string {
    return new Date().toISOString().slice(0, 10);
}

function formatDomainLabel(d: string): string {
    return d.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Types ────────────────────────────────────────────────────────────

interface TestEntry {
    testName: string;
    testSearch: string;
    showTestDropdown: boolean;
    value: string;
    unit: string;
}

// ── Props ────────────────────────────────────────────────────────────

interface EntryFormProps {
    defaultDomain?: Domain;
    onClose: () => void;
}

// ── Component ────────────────────────────────────────────────────────

export default function EntryForm({ defaultDomain, onClose }: EntryFormProps) {
    const {
        profiles,
        schedules,
        ranges,
        selectedUserId,
        addRows,
    } = useApp();

    // Context / Shared Metadata State
    const [userId, setUserId] = useState(selectedUserId ?? profiles[0]?.user_id ?? "");
    const [domain, setDomain] = useState<Domain>(defaultDomain ?? "metabolic");
    const [date, setDate] = useState(todayISO());
    const [labName, setLabName] = useState("");
    const [notes, setNotes] = useState("");

    // Dynamic Entries State
    const [entries, setEntries] = useState<TestEntry[]>([{
        testName: "", testSearch: "", showTestDropdown: false, value: "", unit: ""
    }]);

    // UI state
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const backdropRef = useRef<HTMLDivElement>(null);

    // ── Escape key ───────────────────────────────────────────────
    useEffect(() => {
        function handleKey(e: KeyboardEvent) {
            if (e.key === "Escape") onClose();
        }
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [onClose]);

    // ── Dropdown helpers ─────────────────────────────────────────
    const testOptions = useMemo(() => {
        return schedules
            .filter((s) => s.domain === domain)
            .map((s) => s.test_name);
    }, [schedules, domain]);

    const getFilteredOptions = useCallback((search: string) => {
        if (!search) return testOptions;
        const q = search.toLowerCase();
        return testOptions.filter((t) => t.toLowerCase().includes(q));
    }, [testOptions]);

    // ── Dynamic Form Handlers ────────────────────────────────────
    const updateEntry = (index: number, field: keyof TestEntry, val: any) => {
        setEntries(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: val };
            
            // Auto-fill unit from reference range when exact test is mapped
            if (field === "testName" && val) {
                const profile = profiles.find((p) => p.user_id === userId);
                const normalizedVal = String(val).toLowerCase().replace(/[ -]/g, '_');
                const range = ranges.find(
                    (r) =>
                        r.test_name.toLowerCase().replace(/[ -]/g, '_') === normalizedVal &&
                        (r.sex === "all" || r.sex === profile?.sex),
                );
                if (range) {
                    next[index].unit = range.unit;
                }
            }
            
            return next;
        });
    };

    const addEntryRow = () => {
        setEntries(prev => [...prev, { testName: "", testSearch: "", showTestDropdown: false, value: "", unit: "" }]);
    };

    const removeEntryRow = (index: number) => {
        if (entries.length > 1) {
            setEntries(prev => prev.filter((_, i) => i !== index));
        }
    };

    // ── Backdrop click ───────────────────────────────────────────
    const handleBackdropClick = useCallback(
        (e: React.MouseEvent) => {
            if (e.target === backdropRef.current) onClose();
        },
        [onClose],
    );

    // ── Submit ───────────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Map and validate all valid rows locally
        const payloads = [];
        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            // Skip totally empty rows 
            if (!entry.testName.trim() && !entry.value.trim()) continue;

            if (!entry.testName.trim()) {
                setError(`Please enter a test name for row ${i + 1}.`);
                return;
            }

            const numValue = parseFloat(entry.value);
            if (isNaN(numValue) || numValue <= 0) {
                setError(`Value must be a positive number for test "${entry.testName}".`);
                return;
            }

            payloads.push({
                date,
                user_id: userId,
                test_name: entry.testName.trim(),
                value: numValue,
                unit: entry.unit.trim(),
                domain,
                lab_name: labName.trim() || undefined,
                notes: notes.trim() || undefined,
            });
        }

        if (payloads.length === 0) {
            setError("Please fill out at least one test result.");
            return;
        }

        if (date > todayISO()) {
            setError("Date must not be in the future.");
            return;
        }

        setSaving(true);
        try {
            await addRows(payloads);
            setSuccess(true);
            setTimeout(onClose, 1200);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setSaving(false);
        }
    };

    // ── Render ───────────────────────────────────────────────────
    return (
        <div
            ref={backdropRef}
            onClick={handleBackdropClick}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto"
        >
            <form
                onSubmit={handleSubmit}
                className="relative w-full max-w-2xl rounded-2xl bg-white shadow-xl my-auto flex flex-col max-h-[90vh]"
            >
                {/* Header fixed */}
                <div className="flex-none p-6 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900">
                        Batch add readings
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition"
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>

                {/* Scalable body area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* ── Context / Shared Details ──────────────────── */}
                    <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 grid grid-cols-2 gap-4">
                        <div className="col-span-2 md:col-span-1">
                            <label className="mb-1 block text-sm font-medium text-gray-700">Profile</label>
                            <select
                                value={userId}
                                onChange={(e) => setUserId(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                            >
                                {profiles.map((p) => (
                                    <option key={p.user_id} value={p.user_id}>{p.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="col-span-2 md:col-span-1">
                            <label className="mb-1 block text-sm font-medium text-gray-700">Domain Group</label>
                            <select
                                value={domain}
                                onChange={(e) => {
                                    setDomain(e.target.value as Domain);
                                    // Optionally wipe array names upon domain toggle so wrong schedules don't appear?
                                }}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                            >
                                {ALL_DOMAINS.map((d) => (
                                    <option key={d} value={d}>{formatDomainLabel(d)}</option>
                                ))}
                            </select>
                        </div>

                        <div className="col-span-2 md:col-span-1">
                            <label className="mb-1 block text-sm font-medium text-gray-700">Date recorded</label>
                            <input
                                type="date"
                                value={date}
                                max={todayISO()}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                            />
                        </div>

                        <div className="col-span-2 md:col-span-1">
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                Lab name <span className="text-gray-400 font-normal">(optional)</span>
                            </label>
                            <input
                                type="text"
                                value={labName}
                                onChange={(e) => setLabName(e.target.value)}
                                placeholder="eg. Quest Diagnostics"
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                Global notes <span className="text-gray-400 font-normal">(optional)</span>
                            </label>
                            <input
                                type="text"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Conditions, fasting state, context etc..."
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* ── Test List Map ─────────────────────────────── */}
                    <div>
                        <div className="flex items-center justify-between border-b border-gray-200 pb-2 mb-4">
                            <h3 className="font-bold text-gray-900">Recorded Tests</h3>
                            <button
                                type="button"
                                onClick={addEntryRow}
                                className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition"
                            >
                                + Add another test
                            </button>
                        </div>

                        <div className="space-y-4">
                            {entries.map((entry, idx) => {
                                const filteredOptions = getFilteredOptions(entry.testSearch);
                                
                                return (
                                    <div key={idx} className="flex gap-3 items-end p-3 rounded-xl bg-white border border-gray-100 shadow-sm relative group">
                                        <div className="absolute -left-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-400 text-xs font-bold shadow-sm">
                                            {idx + 1}
                                        </div>

                                        <div className="flex-1 relative">
                                            <label className="mb-1 block text-xs font-semibold text-gray-500 uppercase tracking-wider">Test Name</label>
                                            <input
                                                type="text"
                                                value={entry.testSearch || entry.testName}
                                                onChange={(e) => {
                                                    updateEntry(idx, "testSearch", e.target.value);
                                                    updateEntry(idx, "testName", e.target.value);
                                                    updateEntry(idx, "showTestDropdown", true);
                                                }}
                                                onFocus={() => updateEntry(idx, "showTestDropdown", true)}
                                                onBlur={() => setTimeout(() => updateEntry(idx, "showTestDropdown", false), 150)}
                                                placeholder="Type test name..."
                                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                            />
                                            {entry.showTestDropdown && filteredOptions.length > 0 && (
                                                <ul className="absolute z-10 mt-1 max-h-40 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                                                    {filteredOptions.map((opt) => (
                                                        <li
                                                            key={opt}
                                                            onMouseDown={() => {
                                                                updateEntry(idx, "testName", opt);
                                                                updateEntry(idx, "testSearch", "");
                                                                updateEntry(idx, "showTestDropdown", false);
                                                            }}
                                                            className="cursor-pointer px-3 py-1.5 text-sm text-gray-700 hover:bg-blue-50"
                                                        >
                                                            {opt.replace(/_/g, " ")}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>

                                        <div className="w-24 shrink-0">
                                            <label className="mb-1 block text-xs font-semibold text-gray-500 uppercase tracking-wider">Value</label>
                                            <input
                                                type="number"
                                                step="any"
                                                value={entry.value}
                                                onChange={(e) => updateEntry(idx, "value", e.target.value)}
                                                placeholder="0.0"
                                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none text-right font-medium"
                                            />
                                        </div>

                                        <div className="w-24 shrink-0">
                                            <label className="mb-1 block text-xs font-semibold text-gray-500 uppercase tracking-wider">Unit</label>
                                            <input
                                                type="text"
                                                value={entry.unit}
                                                onChange={(e) => updateEntry(idx, "unit", e.target.value)}
                                                placeholder="mg/dL"
                                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none text-gray-600"
                                            />
                                        </div>

                                        {entries.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeEntryRow(idx)}
                                                className="shrink-0 mb-1.5 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                                                title="Remove this result"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer fixed */}
                <div className="flex-none p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
                    {/* Error */}
                    {error && (
                        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                            {error}
                        </p>
                    )}

                    {/* Success toast */}
                    {success && (
                        <p className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
                            ✓ Saved all {entries.filter(e => e.testName && e.value).length} results successfully!
                        </p>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                            Total tests attached: {entries.length}
                        </span>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-200 bg-gray-100"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving || success}
                                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-sm font-bold tracking-wide text-white transition hover:bg-blue-700 disabled:opacity-50"
                            >
                                {saving && (
                                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" /><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" /></svg>
                                )}
                                {saving ? "Saving batch…" : "Save all results"}
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
