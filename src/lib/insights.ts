import { differenceInDays, parseISO, format } from "date-fns";
import type {
    HealthRow,
    Schedule,
    Profile,
    ReferenceRange,
    Insight,
    InsightType,
    InsightSeverity,
} from "../types";

// ── Helpers ──────────────────────────────────────────────────────────

/** "fasting_glucose" → "Fasting glucose" */
export function formatTestName(test_name: string): string {
    const spaced = test_name.replace(/_/g, " ");
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** "2024-03-15" → "15 Mar 2024" */
export function formatDate(iso: string): string {
    return format(parseISO(iso), "dd MMM yyyy");
}

// Severity ordering for final sort
const SEVERITY_ORDER: Record<InsightSeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
    good: 3,
};

function makeId(
    userId: string,
    testName: string,
    type: InsightType,
): string {
    return `${userId}_${testName}_${type}`;
}

function makeInsight(
    partial: Omit<Insight, "id" | "generated_at"> & { id?: string },
): Insight {
    return {
        ...partial,
        id:
            partial.id ??
            makeId(partial.user_id, partial.test_name, partial.type),
        generated_at: new Date().toISOString(),
    };
}

// ── Staleness Engine ─────────────────────────────────────────────────

export function computeStalenessInsights(
    rows: HealthRow[],
    schedules: Schedule[],
    profiles: Profile[],
    today: Date,
): Insight[] {
    const insights: Insight[] = [];

    for (const profile of profiles) {
        for (const schedule of schedules) {
            // Skip if the schedule doesn't apply to this profile's sex
            if (
                schedule.applies_to !== "all" &&
                schedule.applies_to !== profile.sex
            ) {
                continue;
            }

            // Find all matching rows for this user + test
            const matching = rows.filter(
                (r) =>
                    r.user_id === profile.user_id &&
                    r.test_name === schedule.test_name,
            );

            const label = formatTestName(schedule.test_name);

            if (matching.length === 0) {
                // NEVER_TESTED
                insights.push(
                    makeInsight({
                        type: "NEVER_TESTED",
                        severity: "critical",
                        user_id: profile.user_id,
                        test_name: schedule.test_name,
                        domain: schedule.domain,
                        message: `You've never recorded ${label}. Time to schedule it.`,
                    }),
                );
                continue;
            }

            // Find the most recent date
            const lastDate = matching.reduce((max, r) =>
                r.date > max.date ? r : max,
            ).date;

            const daysSince = differenceInDays(today, parseISO(lastDate));
            const overdueRatio = daysSince / schedule.interval_days;

            if (overdueRatio >= 2.0) {
                insights.push(
                    makeInsight({
                        type: "OVERDUE_CRITICAL",
                        severity: "critical",
                        user_id: profile.user_id,
                        test_name: schedule.test_name,
                        domain: schedule.domain,
                        message: `${label} is overdue — last done ${formatDate(lastDate)}, ${daysSince} days ago.`,
                        last_date: lastDate,
                        days_overdue: daysSince - schedule.interval_days,
                    }),
                );
            } else if (overdueRatio >= 1.1) {
                insights.push(
                    makeInsight({
                        type: "OVERDUE_WARNING",
                        severity: "warning",
                        user_id: profile.user_id,
                        test_name: schedule.test_name,
                        domain: schedule.domain,
                        message: `${label} is due — last done ${formatDate(lastDate)}.`,
                        last_date: lastDate,
                        days_overdue: daysSince - schedule.interval_days,
                    }),
                );
            } else if (overdueRatio >= 0.85) {
                const daysUntilDue = schedule.interval_days - daysSince;
                insights.push(
                    makeInsight({
                        type: "DUE_SOON",
                        severity: "info",
                        user_id: profile.user_id,
                        test_name: schedule.test_name,
                        domain: schedule.domain,
                        message: `${label} coming up in ~${daysUntilDue} days.`,
                        last_date: lastDate,
                    }),
                );
            }
            // Otherwise: on schedule — no insight
        }
    }

    return insights;
}

// ── Status Engine ────────────────────────────────────────────────────

export function computeStatusInsights(
    rows: HealthRow[],
    ranges: ReferenceRange[],
    profiles: Profile[],
): Insight[] {
    const insights: Insight[] = [];

    for (const profile of profiles) {
        // Get all rows for this user
        const userRows = rows.filter((r) => r.user_id === profile.user_id);

        // Group by test_name and keep only the most recent row per test
        const latestByTest = new Map<string, HealthRow>();
        for (const row of userRows) {
            const existing = latestByTest.get(row.test_name);
            // Use >= so later entries (lower in the sheet) overwrite earlier entries on the same date
            if (!existing || row.date >= existing.date) {
                latestByTest.set(row.test_name, row);
            }
        }

        for (const [testName, row] of latestByTest) {
            // Find matching reference range (exact test_name + sex or "all")
            const range = ranges.find(
                (r) =>
                    r.test_name === testName &&
                    (r.sex === "all" || r.sex === profile.sex),
            );

            if (!range) continue;

            const label = formatTestName(testName);
            const { value, unit, domain } = row;

            if (value < range.lab_lo || value > range.lab_hi) {
                insights.push(
                    makeInsight({
                        type: "OUT_OF_LAB_RANGE",
                        severity: "critical",
                        user_id: profile.user_id,
                        test_name: testName,
                        domain,
                        message: `${label} ${value}${unit} — outside lab normal range (${range.lab_lo}–${range.lab_hi}).`,
                        value,
                        unit,
                        last_date: row.date,
                    }),
                );
            } else if (value < range.optimal_lo || value > range.optimal_hi) {
                insights.push(
                    makeInsight({
                        type: "SUBOPTIMAL",
                        severity: "warning",
                        user_id: profile.user_id,
                        test_name: testName,
                        domain,
                        message: `${label} ${value}${unit} — in lab range but below optimal (${range.optimal_lo}–${range.optimal_hi}).`,
                        value,
                        unit,
                        last_date: row.date,
                    }),
                );
            } else {
                insights.push(
                    makeInsight({
                        type: "OPTIMAL",
                        severity: "good",
                        user_id: profile.user_id,
                        test_name: testName,
                        domain,
                        message: `${label} ${value}${unit} — optimal.`,
                        value,
                        unit,
                        last_date: row.date,
                    }),
                );
            }
        }
    }

    return insights;
}

// ── Merger ────────────────────────────────────────────────────────────

export function computeInsights(
    rows: HealthRow[],
    schedules: Schedule[],
    ranges: ReferenceRange[],
    profiles: Profile[],
): Insight[] {
    const staleness = computeStalenessInsights(rows, schedules, profiles, new Date());
    const status = computeStatusInsights(rows, ranges, profiles);

    // Deduplicate by insight ID (staleness wins over status for same ID)
    const seen = new Map<string, Insight>();
    for (const insight of [...staleness, ...status]) {
        if (!seen.has(insight.id)) {
            seen.set(insight.id, insight);
        }
    }

    const merged = Array.from(seen.values());

    // Sort: critical → warning → info → good, then by domain alphabetically
    merged.sort((a, b) => {
        const sevDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
        if (sevDiff !== 0) return sevDiff;
        return a.domain.localeCompare(b.domain);
    });

    return merged;
}
