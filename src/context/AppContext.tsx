import {
    createContext,
    useContext,
    useState,
    useEffect,
    useMemo,
    useCallback,
    type ReactNode,
} from "react";
import type { HealthRow, Profile, Schedule, ReferenceRange, Insight, Goal } from "../types";
import { useHealthData } from "../hooks/useHealthData";
import { computeInsights } from "../lib/insights";
import { appendRow, deleteHealthRow } from "../lib/sheets";

// ── Context shape ────────────────────────────────────────────────────
interface AppContextValue {
    // data
    rows: HealthRow[];
    profiles: Profile[];
    schedules: Schedule[];
    ranges: ReferenceRange[];
    goals: Goal[];
    insights: Insight[];


    // derived — filtered to selectedUserId
    userInsights: Insight[];
    userRows: HealthRow[];
    userGoals: Goal[];

    // loading
    loading: boolean;
    error: string | null;
    configured: boolean;

    // profile selection
    selectedUserId: string | null;
    setSelectedUserId: (id: string) => void;

    // data mutation
    addRow: (row: Omit<HealthRow, "source">) => Promise<void>;
    addRows: (rows: Omit<HealthRow, "source">[]) => Promise<void>;
    removeRow: (row: HealthRow) => Promise<void>;
    refetch: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────────────────

interface AppProviderProps {
    children: ReactNode;
}

function AppProvider({ children }: AppProviderProps) {
    const { rows, profiles, schedules, ranges, goals, loading, error, configured, refetch } =
        useHealthData();

    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

    // Auto-select first profile when profiles load and none is selected
    useEffect(() => {
        if (!selectedUserId && profiles.length > 0) {
            setSelectedUserId(profiles[0].user_id);
        }
    }, [profiles, selectedUserId]);

    // Compute insights whenever data changes
    const insights = useMemo(
        () =>
            rows.length > 0 || schedules.length > 0
                ? computeInsights(rows, schedules, ranges, profiles)
                : [],
        [rows, schedules, ranges, profiles],
    );

    // Derived: filtered to selected user
    const userInsights = useMemo(
        () =>
            selectedUserId
                ? insights.filter((i) => i.user_id === selectedUserId)
                : [],
        [insights, selectedUserId],
    );

    const userRows = useMemo(
        () =>
            selectedUserId
                ? rows.filter((r) => r.user_id === selectedUserId)
                : [],
        [rows, selectedUserId],
    );

    const userGoals = useMemo(
        () =>
            selectedUserId
                ? goals.filter((g) => g.user_id === selectedUserId)
                : [],
        [goals, selectedUserId],
    );

    // Mutation: append a row and refresh data
    const addRow_ = useCallback(
        async (row: Omit<HealthRow, "source">) => {
            const sheetRow = [
                row.date,
                row.user_id,
                row.test_name,
                String(row.value),
                row.unit,
                "manual",
                row.domain,
                row.lab_name ?? "",
                row.notes ?? "",
            ];

            await appendRow(row.domain, sheetRow);
            refetch();
        },
        [refetch],
    );

    const addRows_ = useCallback(
        async (newRows: Omit<HealthRow, "source">[]) => {
            await Promise.all(
                newRows.map(async (row) => {
                    const sheetRow = [
                        row.date,
                        row.user_id,
                        row.test_name,
                        String(row.value),
                        row.unit,
                        "manual",
                        row.domain,
                        row.lab_name ?? "",
                        row.notes ?? "",
                    ];
                    await appendRow(row.domain, sheetRow);
                })
            );
            refetch();
        },
        [refetch],
    );

    const removeRow_ = useCallback(
        async (row: HealthRow) => {
            const sheetRow = [
                row.date,
                row.user_id,
                row.test_name,
                String(row.value),
                row.unit,
                row.source,
                row.domain,
                row.lab_name ?? "",
                row.notes ?? "",
            ];

            while (sheetRow.length > 0 && sheetRow[sheetRow.length - 1] === "") {
                sheetRow.pop();
            }

            await deleteHealthRow(row.domain, sheetRow);
            refetch();
        },
        [refetch],
    );

    const value: AppContextValue = {
        rows,
        profiles,
        schedules,
        ranges,
        goals,
        insights,
        userInsights,
        userRows,
        userGoals,
        loading,
        error,
        configured,
        selectedUserId,
        setSelectedUserId,
        addRow: addRow_,
        addRows: addRows_,
        removeRow: removeRow_,
        refetch,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// ── Consumer hook ────────────────────────────────────────────────────
export function useApp(): AppContextValue {
    const ctx = useContext(AppContext);
    if (!ctx) {
        throw new Error("useApp must be used within an <AppProvider>.");
    }
    return ctx;
}

export default AppProvider;
