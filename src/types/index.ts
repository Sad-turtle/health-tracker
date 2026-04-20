export type Domain =
    | "metabolic"
    | "blood"
    | "cardiovascular"
    | "hormones"
    | "micronutrients"
    | "inflammatory"
    | "advanced"
    | "cancer_markers"
    | "gut"
    | "body_composition"
    | "strength"
    | "cardio"
    | "mobility";

export const HEALTH_DOMAINS: Domain[] = [
    "metabolic", "blood", "cardiovascular", "hormones", 
    "micronutrients", "inflammatory", "advanced", "cancer_markers", "gut"
];

export const FITNESS_DOMAINS: Domain[] = [
    "body_composition", "strength", "cardio", "mobility"
];

export const ALL_DOMAINS: Domain[] = [...HEALTH_DOMAINS, ...FITNESS_DOMAINS];

// ── Goal (GOALS tab) ────────────────────────────────────────────────
export interface Goal {
    user_id: string;
    test_name: string;
    target_value: number;
    target_date: string; // ISO
    unit?: string;
    notes?: string;
}

// ── Test Info (TEST_INFO tab) ───────────────────────────────────────
export interface TestInfo {
    test_name: string;
    short_description: string;
    detailed_info: string;
}

// ── Core row (one test result) ───────────────────────────────────────
export interface HealthRow {
    date: string;             // ISO 8601 "YYYY-MM-DD"
    user_id: string;          // "usr_01", "usr_02" etc.
    test_name: string;        // snake_case, e.g. "fasting_glucose"
    value: number;
    unit: string;
    source: "manual" | "pdf_upload" | "wearable";
    domain: Domain;
    lab_name?: string;
    notes?: string;
}

// ── Profile (PROFILES tab) ──────────────────────────────────────────
export interface Profile {
    user_id: string;
    name: string;
    dob: string;              // "YYYY-MM-DD"
    sex: "M" | "F";
    is_admin: boolean;
}

// ── Schedule (SCHEDULES tab) ────────────────────────────────────────
export interface Schedule {
    test_name: string;
    interval_days: number;    // 365=annual, 180=6mo, 36500=once in lifetime
    domain: Domain;
    applies_to: "all" | "M" | "F";
    notes?: string;
}

// ── Reference range (REFERENCE_RANGES tab) ──────────────────────────
export interface ReferenceRange {
    test_name: string;
    sex: "all" | "M" | "F";
    optimal_lo: number;
    optimal_hi: number;
    lab_lo: number;
    lab_hi: number;
    unit: string;
    higher_is_better?: boolean; // default false — for HDL, Vit D etc.
}

// ── Insight engine outputs ──────────────────────────────────────────
export type InsightType =
    | "NEVER_TESTED"
    | "OVERDUE_CRITICAL"
    | "OVERDUE_WARNING"
    | "DUE_SOON"
    | "OUT_OF_LAB_RANGE"
    | "SUBOPTIMAL"
    | "OPTIMAL"
    | "TREND_WORSENING"
    | "TREND_IMPROVING";

export type InsightSeverity = "critical" | "warning" | "info" | "good";

export interface Insight {
    id: string;               // deterministic: `${user_id}_${test_name}_${type}`
    type: InsightType;
    severity: InsightSeverity;
    user_id: string;
    test_name: string;
    domain: Domain;
    message: string;          // human-readable, pre-composed
    value?: number;           // latest value if applicable
    unit?: string;
    last_date?: string;       // last recorded date
    days_overdue?: number;    // for staleness insights
    generated_at: string;     // ISO timestamp
}

// ── Google Sheets connection ────────────────────────────────────────
export interface SheetsConfig {
    spreadsheet_id: string;
    access_token: string;
}
