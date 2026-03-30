import type {
    SheetsConfig,
    HealthRow,
    Profile,
    Schedule,
    ReferenceRange,
    Domain,
    Goal,
} from "../types";

// ── Configuration ────────────────────────────────────────────────────
// Paste your deployed Google Apps Script URL here
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxUXPymnIQyqrFa9H-mQsHQ7_0Z1WqfHpSP5PwjF2IZlg-UygfKo7Z1eLDs4bcN3diB/exec'; // e.g. 'https://script.google.com/macros/s/AKfycb.../exec'

// ── Errors ───────────────────────────────────────────────────────────
export class SheetsApiError extends Error {
    status: number;
    body?: unknown;

    constructor(
        message: string,
        status: number,
        body?: unknown,
    ) {
        super(message);
        this.name = "SheetsApiError";
        this.status = status;
        this.body = body;
    }
}

// ── Check if configured ──────────────────────────────────────────────
export function isConfigured(): boolean {
    return GOOGLE_SCRIPT_URL.length > 0;
}

// ── Read all tabs in one request ─────────────────────────────────────
export async function readAllTabs(): Promise<Record<string, string[][]>> {
    if (!GOOGLE_SCRIPT_URL) {
        throw new SheetsApiError("Google Apps Script URL not configured", 0);
    }

    const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=readAll&t=${Date.now()}`);

    if (!res.ok) {
        throw new SheetsApiError(`Failed to read tabs (${res.status})`, res.status);
    }

    const json = await res.json();

    if (json.error) {
        throw new SheetsApiError(json.error, 400);
    }

    return json as Record<string, string[][]>;
}

// ── Read a single tab ────────────────────────────────────────────────
export async function readTab(tabName: string): Promise<string[][]> {
    if (!GOOGLE_SCRIPT_URL) {
        throw new SheetsApiError("Google Apps Script URL not configured", 0);
    }

    const res = await fetch(
        `${GOOGLE_SCRIPT_URL}?action=readTab&tab=${encodeURIComponent(tabName)}`,
    );

    if (!res.ok) {
        throw new SheetsApiError(
            `Failed to read tab "${tabName}" (${res.status})`,
            res.status,
        );
    }

    const json = await res.json();

    if (json.error) {
        throw new SheetsApiError(json.error, 400);
    }

    return (json.values as string[][]) ?? [];
}

// ── Append a row ─────────────────────────────────────────────────────
export async function appendRow(tabName: string, row: string[]): Promise<void> {
    if (!GOOGLE_SCRIPT_URL) {
        throw new SheetsApiError("Google Apps Script URL not configured", 0);
    }

    const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" }, // Apps Script needs text/plain for CORS
        body: JSON.stringify({
            action: "appendRow",
            tab: tabName,
            row,
        }),
    });

    if (!res.ok) {
        throw new SheetsApiError(
            `Failed to append row to "${tabName}" (${res.status})`,
            res.status,
        );
    }

    const json = await res.json();
    if (json.error) {
        throw new SheetsApiError(json.error, 400);
    }
}

// ── Delete a row ─────────────────────────────────────────────────────
export async function deleteHealthRow(tabName: string, row: string[]): Promise<void> {
    if (!GOOGLE_SCRIPT_URL) {
        throw new SheetsApiError("Google Apps Script URL not configured", 0);
    }

    const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
            action: "deleteRow",
            tab: tabName,
            row,
        }),
    });

    if (!res.ok) {
        throw new SheetsApiError(
            `Failed to delete row from "${tabName}" (${res.status})`,
            res.status,
        );
    }

    const json = await res.json();
    if (json.error) {
        throw new SheetsApiError(json.error, 400);
    }
}

// ── Parsers ──────────────────────────────────────────────────────────

export function parseHealthRows(raw: string[][]): HealthRow[] {
    if (raw.length < 2) return [];

    const [, ...dataRows] = raw;

    return dataRows
        .filter((row) => row.length > 0 && row[0] !== "")
        .map((row) => {
            const hr: HealthRow = {
                date: row[0],
                user_id: row[1],
                test_name: row[2],
                value: parseFloat(row[3]),
                unit: row[4],
                source: row[5] as HealthRow["source"],
                domain: row[6] as Domain,
            };

            if (row[7]) hr.lab_name = row[7];
            if (row[8]) hr.notes = row[8];

            return hr;
        });
}

export function parseProfiles(raw: string[][]): Profile[] {
    if (raw.length < 2) return [];

    const [, ...dataRows] = raw;

    return dataRows
        .filter((row) => row.length > 0 && row[0] !== "")
        .map((row) => ({
            user_id: row[0],
            name: row[1],
            dob: row[2],
            sex: row[3] as Profile["sex"],
            is_admin: row[4]?.toUpperCase() === "TRUE",
        }));
}

export function parseSchedules(raw: string[][]): Schedule[] {
    if (raw.length < 2) return [];

    const [, ...dataRows] = raw;

    return dataRows
        .filter((row) => row.length > 0 && row[0] !== "")
        .map((row) => {
            const s: Schedule = {
                test_name: row[0],
                interval_days: parseInt(row[1], 10),
                domain: row[2] as Domain,
                applies_to: row[3] as Schedule["applies_to"],
            };

            if (row[4]) s.notes = row[4];

            return s;
        });
}

export function parseReferenceRanges(raw: string[][]): ReferenceRange[] {
    if (raw.length < 2) return [];

    const [, ...dataRows] = raw;

    return dataRows
        .filter((row) => row.length > 0 && row[0] !== "")
        .map((row) => {
            const rr: ReferenceRange = {
                test_name: row[0],
                sex: row[1] as ReferenceRange["sex"],
                optimal_lo: parseFloat(row[2]),
                optimal_hi: parseFloat(row[3]),
                lab_lo: parseFloat(row[4]),
                lab_hi: parseFloat(row[5]),
                unit: row[6],
            };

            if (row[7]) rr.higher_is_better = row[7].toUpperCase() === "TRUE";

            return rr;
        });
}

export function parseGoals(raw: string[][]): Goal[] {
    if (!raw || raw.length < 2) return [];

    const [, ...dataRows] = raw;

    return dataRows
        .filter((row) => row.length > 0 && row[0] !== "")
        .map((row) => {
            const g: Goal = {
                user_id: String(row[0]),
                test_name: String(row[1]),
                target_value: parseFloat(String(row[2])),
                target_date: String(row[3]),
            };

            if (row[4]) g.unit = String(row[4]);
            if (row[5]) g.notes = String(row[5]);

            return g;
        });
}

// Re-export SheetsConfig type usage — no longer needed for auth,
// but kept for backwards compatibility
export type { SheetsConfig };
