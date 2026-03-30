import { useMemo } from "react";
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ReferenceArea,
} from "recharts";
import { parseISO, format } from "date-fns";
import { useApp } from "../../context/AppContext";
import type { ReferenceRange, HealthRow } from "../../types";

// ── Props ────────────────────────────────────────────────────────────
interface TrendChartProps {
    testName: string;
    userId: string;
    unit: string;
}

// ── Helpers ──────────────────────────────────────────────────────────

function statusColor(
    value: number,
    range: ReferenceRange | undefined,
): string {
    if (!range) return "#9ca3af"; // gray-400
    if (value < range.lab_lo || value > range.lab_hi) return "#ef4444"; // red-500
    if (value < range.optimal_lo || value > range.optimal_hi) return "#f59e0b"; // amber-500
    return "#10b981"; // emerald-500
}

interface DataPoint {
    date: string; // raw ISO
    dateLabel: string; // "MMM YY"
    value: number;
    fill: string;
    row: HealthRow;
}

// ── Custom dot ───────────────────────────────────────────────────────

function CustomDot(props: {
    cx?: number;
    cy?: number;
    payload?: DataPoint;
}) {
    const { cx, cy, payload } = props;
    if (cx == null || cy == null || !payload) return null;

    return (
        <circle cx={cx} cy={cy} r={4} fill={payload.fill} stroke="white" strokeWidth={2} />
    );
}

// ── Custom tooltip ───────────────────────────────────────────────────

function CustomTooltip({
    active,
    payload,
    unit,
}: {
    active?: boolean;
    payload?: { payload: DataPoint }[];
    unit: string;
}) {
    if (!active || !payload?.length) return null;
    const point = payload[0].payload;

    return (
        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-md">
            <p className="font-medium text-gray-900">
                {point.value} {unit}
            </p>
            <p className="text-xs text-gray-500">
                {format(parseISO(point.date), "dd MMM yyyy")}
            </p>
        </div>
    );
}

// ── Component ────────────────────────────────────────────────────────

export default function TrendChart({ testName, userId, unit }: TrendChartProps) {
    const { rows, ranges, profiles, removeRow } = useApp();

    // Find reference range (match test + sex or "all")
    const profile = profiles.find((p) => p.user_id === userId);
    const range = useMemo(
        () => {
            const normalizedTestName = testName.toLowerCase().replace(/[ -]/g, '_');
            return ranges.find(
                (r) =>
                    r.test_name.toLowerCase().replace(/[ -]/g, '_') === normalizedTestName &&
                    (r.sex === "all" || r.sex === profile?.sex),
            );
        },
        [ranges, testName, profile],
    );

    // Build data points sorted by date
    const data: DataPoint[] = useMemo(() => {
        return rows
            .filter((r) => r.user_id === userId && r.test_name === testName)
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((r) => ({
                date: r.date,
                dateLabel: format(parseISO(r.date), "MMM yy"),
                value: r.value,
                fill: statusColor(r.value, range),
                row: r,
            }));
    }, [rows, userId, testName, range]);

    // Line colour based on most recent point's status
    const lineColor =
        data.length > 0 ? data[data.length - 1].fill : "#9ca3af";

    let chartContent: React.ReactNode;

    if (data.length < 2) {
        chartContent = (
            <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-10">
                <p className="text-center text-sm text-gray-400">
                    Not enough data to show trend — need at least 2 readings.
                </p>
            </div>
        );
    } else {
        // Y-axis domain: pad 10% below min and above max
        const values = data.map((d) => d.value);
        const allBounds = range
            ? [...values, range.lab_lo, range.lab_hi]
            : values;
        const yMin = Math.min(...allBounds);
        const yMax = Math.max(...allBounds);
        const yPad = (yMax - yMin) * 0.1 || 1;

        chartContent = (
            <ResponsiveContainer width="100%" height={240}>
                <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
                    {/* ── Reference bands ─────────────────────────────── */}
                    {range && (
                        <>
                            {/* Lab range (amber band) — only show portions outside optimal */}
                            <ReferenceArea
                                y1={range.lab_lo}
                                y2={range.optimal_lo}
                                fill="#f59e0b"
                                fillOpacity={0.08}
                            />
                            <ReferenceArea
                                y1={range.optimal_hi}
                                y2={range.lab_hi}
                                fill="#f59e0b"
                                fillOpacity={0.08}
                            />
                            {/* Optimal range (green band) */}
                            <ReferenceArea
                                y1={range.optimal_lo}
                                y2={range.optimal_hi}
                                fill="#10b981"
                                fillOpacity={0.1}
                            />
                        </>
                    )}

                    <XAxis
                        dataKey="dateLabel"
                        tick={{ fontSize: 11, fill: "#9ca3af" }}
                        axisLine={false}
                        tickLine={false}
                    />

                    <YAxis
                        domain={[yMin - yPad, yMax + yPad]}
                        tick={{ fontSize: 11, fill: "#9ca3af" }}
                        axisLine={false}
                        tickLine={false}
                        label={{
                            value: unit,
                            angle: -90,
                            position: "insideLeft",
                            style: { fontSize: 11, fill: "#9ca3af" },
                        }}
                    />

                    <Tooltip
                        content={({ active, payload }) => (
                            <CustomTooltip
                                active={active}
                                payload={payload as unknown as { payload: DataPoint }[] | undefined}
                                unit={unit}
                            />
                        )}
                    />

                    <Line
                        type="monotone"
                        dataKey="value"
                        stroke={lineColor}
                        strokeWidth={2}
                        dot={<CustomDot />}
                        activeDot={{ r: 6, strokeWidth: 2, stroke: "white" }}
                    />
                </LineChart>
            </ResponsiveContainer>
        );
    }

    return (
        <>
            {chartContent}

            {/* ── History Table ─────────────────────────── */}
            <div className="mt-6 border-t border-gray-100 pt-4">
                <h4 className="mb-3 text-sm font-semibold text-gray-700">History</h4>
                <div className="space-y-2">
                    {[...data].reverse().map((d, i) => (
                        <div key={i} className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2 text-sm border border-gray-100">
                            <span className="text-gray-500 w-24">
                                {format(parseISO(d.date), "dd MMM yyyy")}
                            </span>
                            <span className="font-medium text-gray-900 flex-1">
                                {d.value} {unit}
                            </span>
                            <button
                                onClick={async () => {
                                    if (window.confirm("Are you sure you want to delete this result?")) {
                                        await removeRow(d.row);
                                    }
                                }}
                                className="text-gray-400 hover:text-red-600 transition p-1 rounded hover:bg-red-50"
                                title="Delete entry"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
