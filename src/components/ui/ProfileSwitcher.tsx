import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../../context/AppContext";

// Deterministic colour from user_id
const COLORS = [
    "bg-blue-500",
    "bg-emerald-500",
    "bg-purple-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-cyan-500",
    "bg-indigo-500",
    "bg-teal-500",
];

function colorFor(id: string): string {
    let hash = 0;
    for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
    return COLORS[Math.abs(hash) % COLORS.length];
}

function initials(name: string): string {
    return name
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? "")
        .join("");
}

export default function ProfileSwitcher() {
    const { profiles, selectedUserId, setSelectedUserId } = useApp();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const current = profiles.find((p) => p.user_id === selectedUserId);

    // Close on outside click
    useEffect(() => {
        function handler(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    if (!current) return null;

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-gray-200 py-1 pl-1 pr-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
                <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white ${colorFor(current.user_id)}`}
                >
                    {initials(current.name)}
                </span>
                {current.name}
                <svg
                    className={`h-4 w-4 text-gray-400 transition ${open ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {open && (
                <div className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                    <div className="py-1">
                        {profiles.map((p) => (
                            <button
                                key={p.user_id}
                                onClick={() => {
                                    setSelectedUserId(p.user_id);
                                    setOpen(false);
                                }}
                                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-gray-50 ${p.user_id === selectedUserId ? "bg-blue-50 font-medium text-blue-700" : "text-gray-700"
                                    }`}
                            >
                                <span
                                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${colorFor(p.user_id)}`}
                                >
                                    {initials(p.name)}
                                </span>
                                <span>{p.name}</span>
                                {p.user_id === selectedUserId && (
                                    <span className="ml-auto text-blue-500">✓</span>
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="border-t border-gray-100">
                        <Link
                            to="/settings"
                            onClick={() => setOpen(false)}
                            className="block px-4 py-2.5 text-sm text-gray-500 transition hover:bg-gray-50"
                        >
                            Manage profiles →
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
