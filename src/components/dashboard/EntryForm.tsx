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
    unitLocked: boolean; // true when auto-filled from REFERENCE_RANGES
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
        testName: "", testSearch: "", showTestDropdown: false, value: "", unit: "", unitLocked: false
    }]);

    // PDF Preview State
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    // ── PDF Handlers ─────────────────────────────────────────────
    const handleFile = (file: File) => {
        if (file.type !== "application/pdf") {
            setError("Only PDF files are supported for preview.");
            return;
        }
        const url = URL.createObjectURL(file);
        setPdfUrl(url);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    // ── Dropdown helpers ─────────────────────────────────────────
    const testOptions = useMemo(() => {
        const optionsMap = new Map<string, Domain>();
        for (const s of schedules) {
            optionsMap.set(s.test_name, s.domain);
        }
        return Array.from(optionsMap.entries()).map(([name, dom]) => ({ name, domain: dom }));
    }, [schedules]);

    const getFilteredOptions = useCallback((search: string) => {
        if (!search) return testOptions;
        const q = search.toLowerCase();
        return testOptions.filter((t) => t.name.toLowerCase().includes(q));
    }, [testOptions]);

    // ── Dynamic Form Handlers ────────────────────────────────────
    const lookupUnit = useCallback((testName: string): string | null => {
        if (!testName) return null;
        const profile = profiles.find((p) => p.user_id === userId);
        const normalized = testName.toLowerCase().replace(/[ -]/g, '_');
        const range = ranges.find(
            (r) =>
                r.test_name.toLowerCase().replace(/[ -]/g, '_') === normalized &&
                (r.sex === "all" || r.sex === profile?.sex),
        );
        return range?.unit ?? null;
    }, [profiles, ranges, userId]);

    const updateEntry = (index: number, field: keyof TestEntry, val: any) => {
        setEntries(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: val };
            return next;
        });
    };

    const selectTest = (index: number, testName: string) => {
        const autoUnit = lookupUnit(testName);
        setEntries(prev => {
            const next = [...prev];
            next[index] = {
                ...next[index],
                testName,
                testSearch: "",
                showTestDropdown: false,
                unit: autoUnit ?? next[index].unit,
                unitLocked: autoUnit !== null,
            };
            return next;
        });
    };

    const addEntryRow = () => {
        setEntries(prev => [...prev, { testName: "", testSearch: "", showTestDropdown: false, value: "", unit: "", unitLocked: false }]);
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

        const payloads = [];
        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
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

            const recognizedTest = testOptions.find((t) => t.name.toLowerCase() === entry.testName.trim().toLowerCase());
            const finalDomain = recognizedTest ? recognizedTest.domain : domain;

            payloads.push({
                date,
                user_id: userId,
                test_name: entry.testName.trim(),
                value: numValue,
                unit: entry.unit.trim(),
                domain: finalDomain,
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto w-full"
        >
            <div className="relative w-full max-w-[90vw] lg:max-w-7xl h-[90vh] bg-white rounded-2xl shadow-xl flex overflow-hidden">
                
                {/* LEFT SIDE: PDF Dropzone or iframe */}
                <div className="hidden md:flex md:w-1/2 lg:w-3/5 bg-gray-50 flex-col relative border-r border-gray-200">
                    {pdfUrl ? (
                        <>
                            <div className="flex-none p-4 border-b border-gray-200 bg-white flex items-center justify-between shadow-sm z-10">
                                <h3 className="text-sm font-semibold text-gray-700 mx-2">PDF Document Preview</h3>
                                <button
                                    type="button"
                                    onClick={() => setPdfUrl(null)}
                                    className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 transition flex items-center gap-1 text-xs font-semibold"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    Close PDF
                                </button>
                            </div>
                            <iframe 
                                src={`${pdfUrl}#toolbar=0&navpanes=0`} 
                                className="flex-1 w-full h-full bg-gray-100" 
                                title="PDF Preview" 
                            />
                        </>
                    ) : (
                        <div 
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`m-8 flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl cursor-pointer transition-colors ${
                                dragOver ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400 hover:bg-gray-100"
                            }`}
                        >
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="application/pdf" 
                                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} 
                            />
                            <div className="p-4 bg-white rounded-full shadow-sm mb-4 border border-gray-100">
                                <svg className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-1">Preview PDF Results</h3>
                            <p className="text-sm text-gray-500 font-medium max-w-xs text-center">
                                Drag a document here or click to browse. Easily copy values while entering them.
                            </p>
                        </div>
                    )}
                </div>

                {/* RIGHT SIDE: The Form */}
                <form
                    onSubmit={handleSubmit}
                    className="flex-1 flex flex-col w-full md:w-1/2 lg:w-2/5 overflow-hidden bg-white relative"
                >
                    {/* Header fixed */}
                    <div className="flex-none p-6 border-b border-gray-100 flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 leading-none">
                                Add test results
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">Batch submit for this context</p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-full transition"
                            aria-label="Close"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    {/* Scalable body area */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-white">
                        {/* ── Context / Shared Details ──────────────────── */}
                        <div className="bg-gray-50/50 rounded-xl p-5 border border-gray-100/80 grid grid-cols-2 gap-4">
                            <div className="col-span-2 md:col-span-1">
                                <label className="mb-1 block text-sm font-medium text-gray-700">Profile</label>
                                <select
                                    value={userId}
                                    onChange={(e) => setUserId(e.target.value)}
                                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none bg-white shadow-sm"
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
                                    onChange={(e) => setDomain(e.target.value as Domain)}
                                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none bg-white shadow-sm"
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
                                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none bg-white shadow-sm"
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
                                    placeholder="eg. Quest"
                                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none bg-white shadow-sm"
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
                                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none bg-white shadow-sm"
                                />
                            </div>
                        </div>

                        {/* ── Test List Map ─────────────────────────────── */}
                        <div>
                            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                                <h3 className="font-bold text-gray-900">Recorded Tests</h3>
                                <button
                                    type="button"
                                    onClick={addEntryRow}
                                    className="text-xs font-bold uppercase tracking-wider text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded transition"
                                >
                                    + Add Item
                                </button>
                            </div>

                            <div className="space-y-4">
                                {entries.map((entry, idx) => {
                                    const filteredOptions = getFilteredOptions(entry.testSearch);
                                    
                                    return (
                                        <div key={idx} className="flex flex-wrap gap-3 items-end p-3 rounded-xl bg-gray-50/30 border border-gray-100/80 shadow-sm relative group hover:border-gray-200 transition-colors">
                                            <div className="absolute -left-2.5 top-0 bottom-0 flex items-center">
                                              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold shadow-sm border border-blue-200/50">
                                                  {idx + 1}
                                              </div>
                                            </div>

                                            <div className="flex-1 relative min-w-[150px]">
                                                <label className="mb-1 block text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Test Name</label>
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
                                                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none bg-white"
                                                />
                                                {entry.showTestDropdown && filteredOptions.length > 0 && (
                                                    <ul className="absolute z-10 w-full mt-1 max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-xl custom-scrollbar">
                                                        {filteredOptions.map((opt) => {
                                                            const previewUnit = lookupUnit(opt.name);
                                                            return (
                                                                <li
                                                                    key={opt.name}
                                                                    onMouseDown={() => selectTest(idx, opt.name)}
                                                                    className="cursor-pointer px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 flex items-center justify-between gap-2 border-b border-gray-50 last:border-0"
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-medium text-gray-800">{opt.name.replace(/_/g, " ")}</span>
                                                                        <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200/50 leading-none h-fit pt-1 pb-0.5 mt-0.5">{opt.domain.replace(/_/g, " ")}</span>
                                                                    </div>
                                                                    {previewUnit && (
                                                                        <span className="text-[10px] text-gray-400 font-mono tracking-wide shrink-0 px-1.5 py-0.5 rounded bg-gray-50">{previewUnit}</span>
                                                                    )}
                                                                </li>
                                                            );
                                                        })}
                                                    </ul>
                                                )}
                                            </div>

                                            <div className="w-20 shrink-0">
                                                <label className="mb-1 block text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Value</label>
                                                <input
                                                    type="number"
                                                    step="any"
                                                    value={entry.value}
                                                    onChange={(e) => updateEntry(idx, "value", e.target.value)}
                                                    placeholder="0.0"
                                                    className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm focus:border-blue-500 focus:outline-none text-center font-bold text-gray-800 bg-white"
                                                />
                                            </div>

                                            <div className="w-24 shrink-0">
                                                <label className="mb-1 block text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Unit</label>
                                                {entry.unitLocked ? (
                                                    <div className="flex h-[38px] items-center justify-center rounded-lg bg-blue-50 border border-blue-100/50 px-2 text-xs font-semibold text-blue-700 font-mono text-center">
                                                        {entry.unit}
                                                    </div>
                                                ) : (
                                                    <input
                                                        type="text"
                                                        value={entry.unit}
                                                        onChange={(e) => updateEntry(idx, "unit", e.target.value)}
                                                        placeholder="mg/dL"
                                                        className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm focus:border-blue-500 focus:outline-none text-gray-600 bg-white text-center font-medium"
                                                    />
                                                )}
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
                    <div className="flex-none p-5 border-t border-gray-100 bg-gray-50/80">
                        {/* Error */}
                        {error && (
                            <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 border border-red-100">
                                ⚠ {error}
                            </p>
                        )}

                        {/* Success toast */}
                        {success && (
                            <p className="mb-3 rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-700 border border-green-100">
                                ✓ Saved {entries.filter(e => e.testName && e.value).length} results!
                            </p>
                        )}

                        {/* Actions */}
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-400/80 uppercase tracking-widest pl-1">
                                {entries.length} TESTS
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="rounded-lg px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition hover:bg-gray-200/50 bg-transparent"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving || success}
                                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-sm font-bold tracking-wide text-white transition hover:bg-blue-700 disabled:opacity-50 shadow-sm shadow-blue-500/30"
                                >
                                    {saving && (
                                        <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" /><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" /></svg>
                                    )}
                                    {saving ? "Saving…" : "Save all"}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
