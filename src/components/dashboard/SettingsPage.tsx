import { useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { formatTestName } from "../../lib/insights";

// ── Human-readable interval ──────────────────────────────────────────
function humanInterval(days: number): string {
    if (days >= 36500) return "Once in lifetime";
    if (days >= 365) {
        const y = Math.round(days / 365);
        return y === 1 ? "Annual" : `Every ${y} years`;
    }
    if (days >= 30) {
        const m = Math.round(days / 30);
        return m === 1 ? "Monthly" : `Every ${m} months`;
    }
    return `Every ${days} days`;
}

// ── Profile editor ───────────────────────────────────────────────────

interface ProfileFormData {
    name: string;
    dob: string;
    sex: "M" | "F";
}

function ProfileEditor() {
    const { profiles, addRow, refetch } = useApp();
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState<ProfileFormData>({ name: "", dob: "", sex: "M" });
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!form.name.trim() || !form.dob) return;
        setSaving(true);
        try {
            // Generate a new user_id
            const nextId = `usr_${String(profiles.length + 1).padStart(2, "0")}`;
            await addRow({
                date: form.dob,
                user_id: nextId,
                test_name: form.name,
                value: 0,
                unit: form.sex,
                domain: "metabolic", // tab won't matter — we're appending to PROFILES manually
                notes: "profile",
            });
            // Note: In a real implementation we'd appendRow directly to PROFILES tab.
            // For now this uses the addRow abstraction.
            refetch();
            setEditing(false);
            setForm({ name: "", dob: "", sex: "M" });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                        <tr>
                            <th className="px-4 py-3">Name</th>
                            <th className="px-4 py-3">Date of Birth</th>
                            <th className="px-4 py-3">Sex</th>
                            <th className="px-4 py-3">Role</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {profiles.map((p) => (
                            <tr key={p.user_id}>
                                <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                                <td className="px-4 py-3 text-gray-600">{p.dob}</td>
                                <td className="px-4 py-3 text-gray-600">{p.sex}</td>
                                <td className="px-4 py-3">
                                    {p.is_admin ? (
                                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                                            Admin
                                        </span>
                                    ) : (
                                        <span className="text-xs text-gray-400">Member</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {editing ? (
                <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <h4 className="mb-3 text-sm font-semibold text-gray-700">Add family member</h4>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <input
                            placeholder="Name"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                        />
                        <input
                            type="date"
                            value={form.dob}
                            onChange={(e) => setForm({ ...form, dob: e.target.value })}
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                        />
                        <select
                            value={form.sex}
                            onChange={(e) => setForm({ ...form, sex: e.target.value as "M" | "F" })}
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                        >
                            <option value="M">Male</option>
                            <option value="F">Female</option>
                        </select>
                    </div>
                    <div className="mt-3 flex gap-2">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                            {saving ? "Saving…" : "Save"}
                        </button>
                        <button
                            onClick={() => setEditing(false)}
                            className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    onClick={() => setEditing(true)}
                    className="mt-3 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm font-medium text-gray-500 transition hover:border-gray-400 hover:text-gray-700"
                >
                    + Add family member
                </button>
            )}
        </div>
    );
}

// ── Main component ───────────────────────────────────────────────────

export default function SettingsPage() {
    const { schedules, ranges, configured, refetch } = useApp();

    return (
        <div className="mx-auto max-w-4xl space-y-10 px-4 py-8">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                <Link
                    to="/"
                    className="text-sm font-medium text-blue-600 transition hover:text-blue-700"
                >
                    ← Back to dashboard
                </Link>
            </div>

            {/* ── 1. Profiles ─────────────────────────────────── */}
            <section>
                <h2 className="mb-4 text-lg font-semibold text-gray-800">Profiles</h2>
                <ProfileEditor />
            </section>

            {/* ── 2. Google Sheets ────────────────────────────── */}
            <section>
                <h2 className="mb-4 text-lg font-semibold text-gray-800">
                    Google Sheets connection
                </h2>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-700">
                                <span className="font-medium">Status:</span>{" "}
                                {configured ? (
                                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                                        Connected via Apps Script
                                    </span>
                                ) : (
                                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                                        Not configured
                                    </span>
                                )}
                            </p>
                            <p className="mt-1 text-xs text-gray-400">
                                Set the Apps Script URL in <code>src/lib/sheets.ts</code>
                            </p>
                        </div>
                        <button
                            onClick={refetch}
                            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                        >
                            Refresh data
                        </button>
                    </div>
                </div>
            </section>

            {/* ── 3. Schedules ────────────────────────────────── */}
            <section>
                <h2 className="mb-4 text-lg font-semibold text-gray-800">Schedules</h2>
                <div className="overflow-hidden rounded-lg border border-gray-200">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                            <tr>
                                <th className="px-4 py-3">Test</th>
                                <th className="px-4 py-3">Domain</th>
                                <th className="px-4 py-3">Interval</th>
                                <th className="px-4 py-3">Applies to</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {schedules.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                                        No schedules loaded.
                                    </td>
                                </tr>
                            ) : (
                                schedules.map((s, i) => (
                                    <tr key={i}>
                                        <td className="px-4 py-2.5 font-medium text-gray-800">
                                            {formatTestName(s.test_name)}
                                        </td>
                                        <td className="px-4 py-2.5 text-gray-600">{s.domain}</td>
                                        <td className="px-4 py-2.5 text-gray-600">
                                            {humanInterval(s.interval_days)}
                                        </td>
                                        <td className="px-4 py-2.5 text-gray-600">
                                            {s.applies_to === "all" ? "Everyone" : s.applies_to}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <p className="mt-2 text-xs text-gray-400">
                    ✏️ Edit these directly in the <strong>SCHEDULES</strong> tab of your Google Sheet.
                </p>
            </section>

            {/* ── 4. Reference Ranges ─────────────────────────── */}
            <section>
                <h2 className="mb-4 text-lg font-semibold text-gray-800">Reference Ranges</h2>
                <div className="overflow-x-auto overflow-hidden rounded-lg border border-gray-200">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                            <tr>
                                <th className="px-4 py-3">Test</th>
                                <th className="px-4 py-3">Sex</th>
                                <th className="px-4 py-3">Optimal</th>
                                <th className="px-4 py-3">Lab range</th>
                                <th className="px-4 py-3">Unit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {ranges.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                                        No reference ranges loaded.
                                    </td>
                                </tr>
                            ) : (
                                ranges.map((r, i) => (
                                    <tr key={i}>
                                        <td className="px-4 py-2.5 font-medium text-gray-800">
                                            {formatTestName(r.test_name)}
                                        </td>
                                        <td className="px-4 py-2.5 text-gray-600">
                                            {r.sex === "all" ? "All" : r.sex}
                                        </td>
                                        <td className="px-4 py-2.5 text-gray-600">
                                            {r.optimal_lo}–{r.optimal_hi}
                                        </td>
                                        <td className="px-4 py-2.5 text-gray-600">
                                            {r.lab_lo}–{r.lab_hi}
                                        </td>
                                        <td className="px-4 py-2.5 text-gray-600">{r.unit}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <p className="mt-2 text-xs text-gray-400">
                    ✏️ Edit these directly in the <strong>REFERENCE_RANGES</strong> tab of your Google Sheet.
                </p>
            </section>

            {/* ── 5. About ────────────────────────────────────── */}
            <section className="border-t border-gray-100 pt-6">
                <h2 className="mb-3 text-lg font-semibold text-gray-800">About</h2>
                <div className="text-sm text-gray-500">
                    <p>
                        <span className="font-medium text-gray-700">Health Tracker</span>{" "}
                        v0.1.0
                    </p>
                    <p className="mt-1">
                        <a
                            href="https://github.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                        >
                            View on GitHub →
                        </a>
                    </p>
                </div>
            </section>
        </div>
    );
}
