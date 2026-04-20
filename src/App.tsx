import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppProvider from "./context/AppContext";
import ProfileSwitcher from "./components/ui/ProfileSwitcher";
import DomainGrid from "./components/dashboard/DomainGrid";
import SettingsPage from "./components/dashboard/SettingsPage";
import EntryForm from "./components/dashboard/EntryForm";
import DomainPage from "./components/dashboard/DomainPage";
import TestInfoPage from "./components/dashboard/TestInfoPage";
import { useApp } from "./context/AppContext";

import AlertsPanel from "./components/dashboard/AlertsPanel";

function Dashboard() {
  const [showEntry, setShowEntry] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
      {/* Header and Global Alerts */}
      <div className="flex flex-col md:flex-row gap-8 items-start justify-between">
        <div className="w-full md:flex-1">
          <div className="flex items-center gap-4 mb-4">
            <h2 className="text-xl font-bold text-gray-900">Priority Actions</h2>
            <button
              onClick={() => setShowAlerts(!showAlerts)}
              className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
            >
              {showAlerts ? "Hide Alerts" : "Show Alerts"}
            </button>
          </div>
          {showAlerts && <AlertsPanel />}
        </div>
        <div className="md:shrink-0 w-full md:w-auto flex justify-end">
          <button
            onClick={() => setShowEntry(true)}
            className="w-full md:w-auto rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow"
          >
            + Add reading
          </button>
        </div>
      </div>

      <DomainGrid />

      {showEntry && <EntryForm onClose={() => setShowEntry(false)} />}
    </div>
  );
}

function AppShell() {
  const { loading, error, configured } = useApp();

  if (!configured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="max-w-md text-center">
          <h1 className="mb-4 text-2xl font-bold text-gray-900">Health Tracker</h1>
          <p className="mb-2 text-gray-500">
            Google Apps Script URL not configured.
          </p>
          <p className="text-sm text-gray-400">
            Open <code className="rounded bg-gray-200 px-1.5 py-0.5 text-xs">src/lib/sheets.ts</code> and
            paste your deployed Apps Script URL into the <code className="rounded bg-gray-200 px-1.5 py-0.5 text-xs">GOOGLE_SCRIPT_URL</code> constant.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold text-gray-900">Health Tracker</h1>
          <ProfileSwitcher />
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
        </div>
      ) : error ? (
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>
        </div>
      ) : (
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/domain/:domainId" element={<DomainPage />} />
          <Route path="/test/:testName" element={<TestInfoPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter basename="/health-tracker">
      <AppProvider>
        <AppShell />
      </AppProvider>
    </BrowserRouter>
  );
}
