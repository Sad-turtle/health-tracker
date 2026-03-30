import { useState, useCallback, useEffect, useRef } from "react";
import type {
    HealthRow,
    Profile,
    Schedule,
    ReferenceRange,
    Goal,
} from "../types";
import {
    readAllTabs,
    isConfigured,
    parseHealthRows,
    parseProfiles,
    parseSchedules,
    parseReferenceRanges,
    parseGoals,
} from "../lib/sheets";

// ── Return type ──────────────────────────────────────────────────────
export interface UseHealthDataResult {
    rows: HealthRow[];
    profiles: Profile[];
    schedules: Schedule[];
    ranges: ReferenceRange[];
    goals: Goal[];
    loading: boolean;
    error: string | null;
    configured: boolean;
    refetch: () => void;
}

// ── Hook ─────────────────────────────────────────────────────────────
export function useHealthData(): UseHealthDataResult {
    const [rows, setRows] = useState<HealthRow[]>([]);
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [ranges, setRanges] = useState<ReferenceRange[]>([]);
    const [goals, setGoals] = useState<Goal[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const configured = isConfigured();
    const hasFetched = useRef(false);

    const fetchAll = useCallback(async () => {
        if (!configured) {
            setLoading(false);
            setError("Google Apps Script URL not configured in src/lib/sheets.ts");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Single request fetches ALL tabs
            const allData = await readAllTabs();

            const configKeys = ["PROFILES", "SCHEDULES", "REFERENCE_RANGES", "GOALS"];
            const domainKeys = Object.keys(allData).filter(key => !configKeys.includes(key));

            // Parse domain rows and merge into one flat array
            const allRows = domainKeys.flatMap((tab) =>
                allData[tab] ? parseHealthRows(allData[tab]) : [],
            );

            setRows(allRows);
            setProfiles(allData["PROFILES"] ? parseProfiles(allData["PROFILES"]) : []);
            setSchedules(allData["SCHEDULES"] ? parseSchedules(allData["SCHEDULES"]) : []);
            setRanges(
                allData["REFERENCE_RANGES"]
                    ? parseReferenceRanges(allData["REFERENCE_RANGES"])
                    : [],
            );
            setGoals(allData["GOALS"] ? parseGoals(allData["GOALS"]) : []);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setLoading(false);
        }
    }, [configured]);

    useEffect(() => {
        if (hasFetched.current) return;
        hasFetched.current = true;
        fetchAll();
    }, [fetchAll]);

    const refetch = useCallback(() => {
        hasFetched.current = true;
        fetchAll();
    }, [fetchAll]);

    return { rows, profiles, schedules, ranges, goals, loading, error, configured, refetch };
}
