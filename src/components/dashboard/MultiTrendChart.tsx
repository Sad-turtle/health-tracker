import { useMemo } from "react";
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ReferenceArea,
    ReferenceLine,
    Legend
} from "recharts";
import { parseISO, format } from "date-fns";
import { useApp } from "../../context/AppContext";
import { formatTestName } from "../../lib/insights";

interface MultiTrendChartProps {
    selectedTests: string[];
}

// ── Colors for different lines ───────────────────────────────────────
const LINE_COLORS = [
    "#3b82f6", // blue-500
    "#ec4899", // pink-500
    "#10b981", // emerald-500
    "#f59e0b", // amber-500
    "#8b5cf6", // violet-500
    "#14b8a6", // teal-500
    "#f43f5e", // rose-500
    "#6366f1", // indigo-500
];

export default function MultiTrendChart({ selectedTests }: MultiTrendChartProps) {
    const { userRows, ranges, userGoals, selectedUserId, profiles } = useApp();

    const profile = profiles.find((p) => p.user_id === selectedUserId);

    // Normalize Data Builder
    const { chartData, testColors, normalizedGoals } = useMemo(() => {
        // Find local active ranges to normalize against
        const activeRanges = new Map();
        for (const testName of selectedTests) {
            const normalizedTestName = testName.toLowerCase().replace(/[ -]/g, '_');
            const range = ranges.find(
                (r) => r.test_name.toLowerCase().replace(/[ -]/g, '_') === normalizedTestName && (r.sex === "all" || r.sex === profile?.sex)
            );
            if (range) {
                activeRanges.set(testName, range);
            }
        }

        // Find historical min/max for each selected test to use as a fallback if ReferenceRange is missing
        const testHistoricBounds = new Map<string, { min: number, max: number }>();
        userRows.forEach(r => {
            if (!selectedTests.includes(r.test_name)) return;
            const current = testHistoricBounds.get(r.test_name) || { min: Infinity, max: -Infinity };
            if (r.value < current.min) current.min = r.value;
            if (r.value > current.max) current.max = r.value;
            testHistoricBounds.set(r.test_name, current);
        });

        // Map tests to assigned colors
        const assignedColors: Record<string, string> = {};
        selectedTests.forEach((t, idx) => {
            assignedColors[t] = LINE_COLORS[idx % LINE_COLORS.length];
        });

        // Group rows by Date across all selected tests
        const dataByDate = new Map<string, any>();
        
        userRows.forEach(r => {
            if (!selectedTests.includes(r.test_name)) return;
            
            if (!dataByDate.has(r.date)) {
                dataByDate.set(r.date, { 
                    date: r.date, 
                    dateLabel: format(parseISO(r.date), "MMM yy") 
                });
            }
            
            const dateEntry = dataByDate.get(r.date);
            const range = activeRanges.get(r.test_name);
            
            let normalized = 0.5;

            if (range && range.lab_hi !== range.lab_lo && !isNaN(range.lab_hi) && !isNaN(range.lab_lo)) {
                // Determine Z-Score / Normalized factor
                const denom = range.lab_hi - range.lab_lo;
                normalized = (r.value - range.lab_lo) / denom;
            } else {
                // Fallback to charting against its own historical bounds if ReferenceRange missing or undefined
                const bounds = testHistoricBounds.get(r.test_name);
                if (bounds && bounds.max !== bounds.min) {
                    const denom = bounds.max - bounds.min;
                    normalized = (r.value - bounds.min) / denom;
                }
            }

            // Bound it visually so extremely out-of-bounds doesn't destroy the graph scale entirely. 
            // We'll cap the charting visualization loosely to [-1.0, 2.0]
            const capped = Math.max(-1.0, Math.min(2.0, normalized));
            
            dateEntry[`${r.test_name}_norm`] = capped;
            // Retain raw value for tooltips
            dateEntry[`${r.test_name}_raw`] = r.value;
            dateEntry[`${r.test_name}_unit`] = r.unit;
        });

        const sortedData = Array.from(dataByDate.values()).sort((a, b) => a.date.localeCompare(b.date));

        // Calculate Goal target lines mapped securely to the unified Z-Score metric 
        const mappedGoals: { testName: string, value: number, raw: number, color: string }[] = [];
        
        for (const testName of selectedTests) {
            const goal = userGoals.find(g => g.test_name === testName);
            if (goal && goal.target_value !== undefined) {
                const range = activeRanges.get(testName);
                let normalized = 0.5;

                if (range && range.lab_hi !== range.lab_lo && !isNaN(range.lab_hi) && !isNaN(range.lab_lo)) {
                    const denom = range.lab_hi - range.lab_lo;
                    normalized = (goal.target_value - range.lab_lo) / denom;
                } else {
                    const bounds = testHistoricBounds.get(testName);
                    if (bounds && bounds.max !== bounds.min) {
                        const denom = bounds.max - bounds.min;
                        normalized = (goal.target_value - bounds.min) / denom;
                    }
                }
                
                // Allow the goal line to graph heavily out-of-bounds but cap visually
                const capped = Math.max(-1.5, Math.min(2.5, normalized));
                
                mappedGoals.push({
                    testName,
                    value: capped,
                    raw: goal.target_value,
                    color: assignedColors[testName]
                });
            }
        }

        return { chartData: sortedData, testColors: assignedColors, normalizedGoals: mappedGoals };
    }, [userRows, ranges, userGoals, selectedTests, profile]);


    if (selectedTests.length === 0) return null;

    if (chartData.length < 2 && selectedTests.length > 0) {
         return (
             <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-10 mt-4">
                 <p className="text-center text-sm text-gray-400">
                     Not enough historical data overlapping across these tests to map a continuous chart (minimum 2 overlapping dates).
                 </p>
             </div>
         );
    }

    return (
        <div className="w-full relative mt-6">
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 4, left: -20 }}>
                    {/* Visual Bounds mapping (0.0 to 1.0 is Normal) */}
                    <ReferenceArea
                        y1={0.0}
                        y2={1.0}
                        fill="#10b981" // Emerald background indicating healthy range zone dynamically across units
                        fillOpacity={0.05}
                    />

                    {/* Active Goal Targeting Lines */}
                    {normalizedGoals.map(target => (
                        <ReferenceLine 
                            key={`goal-${target.testName}`}
                            y={target.value} 
                            stroke={target.color} 
                            strokeDasharray="5 5" 
                            strokeWidth={2}
                            label={{ position: "top", value: `Goal: ${target.raw}`, fill: target.color, fontSize: 11, fontWeight: "bold" }}
                        />
                    ))}

                    <XAxis
                        dataKey="dateLabel"
                        tick={{ fontSize: 11, fill: "#9ca3af" }}
                        axisLine={false}
                        tickLine={false}
                        minTickGap={20}
                    />

                    <YAxis
                        domain={[-0.5, 1.5]}
                        tick={{ fontSize: 11, fill: "#9ca3af" }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(val) => {
                            if (val === 0) return "Min Bound";
                            if (val === 1) return "Max Bound";
                            return "";
                        }}
                    />
                    
                    <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        labelStyle={{ color: '#9ca3af', fontWeight: 600, fontSize: '12px', marginBottom: '8px' }}
                        formatter={(_value: any, name: any, props: any) => {
                            // Extract the raw name 
                            const origName = name ? String(name).replace('_norm', '') : '';
                            const rawValue = props.payload[`${origName}_raw`];
                            const unit = props.payload[`${origName}_unit`] || '';
                            if (rawValue === undefined) return [null, "Missing"];
                            
                            return [`${rawValue} ${unit}`, formatTestName(origName)];
                        }}
                    />

                    <Legend 
                        iconType="circle" 
                        formatter={(value: any) => <span className="text-sm font-medium text-gray-700 ml-1">{formatTestName(String(value).replace('_norm',''))}</span>} 
                        wrapperStyle={{ paddingTop: "20px" }}
                    />

                    {selectedTests.map((testName) => (
                        <Line
                            key={testName}
                            type="monotone"
                            dataKey={`${testName}_norm`}
                            name={`${testName}_norm`}
                            stroke={testColors[testName]}
                            strokeWidth={3}
                            dot={{ r: 4, fill: testColors[testName], strokeWidth: 2, stroke: 'white' }}
                            activeDot={{ r: 6, strokeWidth: 2, stroke: 'white' }}
                            connectNulls={true}
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
