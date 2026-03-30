import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import type { Domain } from "../../types";

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

function todayISO(): string {
    return new Date().toISOString().slice(0, 10);
}

function formatDomainLabel(d: string): string {
    return d.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface PdfUploadProps {
    onClose: () => void;
}

export default function PdfUpload({ onClose }: PdfUploadProps) {
    const { profiles, schedules, selectedUserId, addRow, ranges } = useApp();

    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form state (persists across multiple entries)
    const [date, setDate] = useState(todayISO());
    const [userId, setUserId] = useState(selectedUserId ?? profiles[0]?.user_id ?? "");
    const [domain, setDomain] = useState<Domain>("metabolic");

    // Changing test state
    const [testName, setTestName] = useState("");
    const [testSearch, setTestSearch] = useState("");
    const [showTestDropdown, setShowTestDropdown] = useState(false);
    const [value, setValue] = useState("");
    const [unit, setUnit] = useState("");

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [savedTests, setSavedTests] = useState<{ test: string, val: string }[]>([]);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // ── File handling ──────────────────────────────────────────
    const handleFile = useCallback((file: File) => {
        if (file.type !== "application/pdf") {
            setError("Please upload a PDF file.");
            return;
        }
        setError(null);
        setPdfUrl(URL.createObjectURL(file));
    }, []);

    const onDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
        },
        [handleFile]
    );

    const onFileInput = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
        },
        [handleFile]
    );

    // ── Test name suggestions ────────────────────────────────────
    const testOptions = useMemo(() => {
        return schedules
            .filter((s) => s.domain === domain)
            .map((s) => s.test_name);
    }, [schedules, domain]);

    const filteredOptions = useMemo(() => {
        if (!testSearch) return testOptions;
        const q = testSearch.toLowerCase();
        return testOptions.filter((t) => t.toLowerCase().includes(q));
    }, [testOptions, testSearch]);

    // Auto-fill unit from reference range when test changes
    useEffect(() => {
        if (!testName) return;
        const profile = profiles.find((p) => p.user_id === userId);
        const range = ranges.find(
            (r) =>
                r.test_name === testName &&
                (r.sex === "all" || r.sex === profile?.sex)
        );
        if (range) setUnit(range.unit);
    }, [testName, ranges, profiles, userId]);


    // ── Submit ───────────────────────────────────────────────────
    const handleAddResult = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const numValue = parseFloat(value.replace(",", "."));
        if (isNaN(numValue) || numValue <= 0) {
            setError("Value must be a valid positive number.");
            return;
        }
        if (!testName.trim()) {
            setError("Please enter a test name.");
            return;
        }

        setSaving(true);
        try {
            await addRow({
                date,
                user_id: userId,
                test_name: testName.trim(),
                value: numValue,
                unit: unit.trim(),
                domain,
            });

            // Add to success list
            setSavedTests(prev => [...prev, { test: testName.trim(), val: `${numValue} ${unit.trim()}` }]);

            // Reset for next entry
            setTestName("");
            setTestSearch("");
            setValue("");
            // keep domain and unit just in case they are entering a bunch of similar ones, 
            // but unit usually auto-updates based on testName.
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            onClick={(e) => e.target === e.currentTarget && onClose()}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
        >
            <div className={`relative flex w-full flex-col bg-white shadow-xl rounded-2xl overflow-hidden transition-all duration-300 ${pdfUrl ? 'max-w-7xl h-[90vh]' : 'max-w-2xl'}`}>

                {/* Header */}
                <div className="flex items-center justify-between border-b px-6 py-4">
                    <h2 className="text-lg font-bold text-gray-900">
                        {pdfUrl ? "Transcribe Lab Results" : "Upload lab results PDF"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 transition hover:text-gray-600"
                    >
                        ✕
                    </button>
                </div>

                {!pdfUrl ? (
                    // ── Upload Step ───────────────────────────────
                    <div className="p-6">
                        {error && (
                            <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                                {error}
                            </p>
                        )}
                        <div
                            onDragOver={(e) => {
                                e.preventDefault();
                                setDragOver(true);
                            }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={onDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-20 transition ${dragOver ? "border-blue-400 bg-blue-50" : "border-gray-300 bg-gray-50 hover:border-gray-400"
                                }`}
                        >
                            <span className="mb-3 text-4xl">📄</span>
                            <p className="text-sm font-medium text-gray-700">
                                Drag & drop a PDF or <span className="text-blue-600 underline">browse</span>
                            </p>
                            <p className="mt-1 text-xs text-gray-400">
                                Open a side-by-side view to easily enter results manually.
                            </p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf,application/pdf"
                                onChange={onFileInput}
                                className="hidden"
                            />
                        </div>
                    </div>
                ) : (
                    // ── Split View Step ────────────────────────────
                    <div className="flex flex-1 min-h-0 overflow-hidden">
                        {/* Left: PDF Preview */}
                        <div className="w-1/2 md:w-3/5 bg-gray-100 border-r border-gray-200">
                            <iframe
                                src={`${pdfUrl}#toolbar=0&navpanes=0`}
                                className="w-full h-full border-0"
                                title="PDF Preview"
                            />
                        </div>

                        {/* Right: Manual Entry Form */}
                        <div className="w-1/2 md:w-2/5 p-6 overflow-y-auto bg-gray-50">
                            <form onSubmit={handleAddResult} className="space-y-4 rounded-xl bg-white p-5 border border-gray-200 shadow-sm">
                                <h3 className="font-semibold text-gray-800 text-sm border-b pb-2">Add a reading to your sheet</h3>

                                {error && (
                                    <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                                        {error}
                                    </p>
                                )}

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-gray-600">Date</label>
                                        <input
                                            type="date"
                                            value={date}
                                            max={todayISO()}
                                            onChange={(e) => setDate(e.target.value)}
                                            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-gray-600">Profile</label>
                                        <select
                                            value={userId}
                                            onChange={(e) => setUserId(e.target.value)}
                                            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1"
                                        >
                                            {profiles.map((p) => (
                                                <option key={p.user_id} value={p.user_id}>{p.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-medium text-gray-600">Domain</label>
                                    <select
                                        value={domain}
                                        onChange={(e) => {
                                            setDomain(e.target.value as Domain);
                                            setTestName("");
                                            setTestSearch("");
                                        }}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1"
                                    >
                                        {ALL_DOMAINS.map((d) => (
                                            <option key={d} value={d}>{formatDomainLabel(d)}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="relative">
                                    <label className="mb-1 block text-xs font-medium text-gray-600">Test name</label>
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        value={testSearch || testName}
                                        onChange={(e) => {
                                            setTestSearch(e.target.value);
                                            setTestName(e.target.value);
                                            setShowTestDropdown(true);
                                        }}
                                        onFocus={() => setShowTestDropdown(true)}
                                        onBlur={() => setTimeout(() => setShowTestDropdown(false), 150)}
                                        placeholder="Search or type a test name…"
                                        className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1"
                                    />
                                    {showTestDropdown && filteredOptions.length > 0 && (
                                        <ul className="absolute z-10 mt-1 max-h-40 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                                            {filteredOptions.map((opt) => (
                                                <li
                                                    key={opt}
                                                    onMouseDown={() => {
                                                        setTestName(opt);
                                                        setTestSearch("");
                                                        setShowTestDropdown(false);
                                                    }}
                                                    className="cursor-pointer px-3 py-1.5 text-sm text-gray-700 hover:bg-blue-50"
                                                >
                                                    {opt.replace(/_/g, " ")}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-gray-600">Value</label>
                                        <input
                                            type="text"
                                            value={value}
                                            onChange={(e) => setValue(e.target.value)}
                                            placeholder="e.g. 95"
                                            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-gray-600">Unit</label>
                                        <input
                                            type="text"
                                            value={unit}
                                            onChange={(e) => setUnit(e.target.value)}
                                            placeholder="e.g. mg/dL"
                                            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {saving ? "Saving…" : "Save directly to Google Sheet"}
                                </button>
                            </form>

                            {/* Saved List */}
                            {savedTests.length > 0 && (
                                <div className="mt-6 px-2">
                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Saved in this session</h4>
                                    <ul className="space-y-2">
                                        {savedTests.map((t, i) => (
                                            <li key={i} className="flex items-center gap-2 text-sm text-gray-700 bg-white px-3 py-2 rounded shadow-sm border border-gray-100">
                                                <span className="text-green-500">✓</span>
                                                <span className="font-medium text-gray-900">{t.test.replace(/_/g, " ")}</span>
                                                <span className="text-gray-400 ml-auto">{t.val}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
