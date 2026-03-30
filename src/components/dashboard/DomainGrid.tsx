import { useState } from "react";
import { HEALTH_DOMAINS, FITNESS_DOMAINS } from "../../types";
import DomainCard from "./DomainCard";

export default function DomainGrid() {
    const [view, setView] = useState<"health" | "fitness">("health");

    const activeDomains = view === "health" ? HEALTH_DOMAINS : FITNESS_DOMAINS;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 rounded-xl bg-gray-100 p-1 w-fit mx-auto sm:mx-0">
                <button
                    onClick={() => setView("health")}
                    className={`rounded-lg px-6 py-2 text-sm font-semibold transition-all ${
                        view === "health" 
                        ? "bg-white text-blue-600 shadow-sm" 
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                >
                    ⚕️ Health Biomarkers
                </button>
                <button
                    onClick={() => setView("fitness")}
                    className={`rounded-lg px-6 py-2 text-sm font-semibold transition-all ${
                        view === "fitness" 
                        ? "bg-white text-blue-600 shadow-sm" 
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                >
                    🏋️ Fitness & Goals
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {activeDomains.map((domain) => (
                    <DomainCard key={domain} domain={domain} />
                ))}
            </div>
        </div>
    );
}
