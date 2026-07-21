// frontend/src/pages/AiUsagePage.jsx

import { useEffect, useState } from "react";
import { getAiUsageSummary, getCurrentUser } from "../api/tickets.js";
import { EmptyState } from "../components/shared/ui.jsx";

const PERIODS = [
    { value: "week", label: "Last 7 days" },
    { value: "month", label: "Last 30 days" },
];

const PURPOSE_LABELS = {
    answer_generation: "Answer generation",
    embedding: "Embedding",
};

function formatCost(cost) {
    const n = Number(cost);
    return `$${n.toFixed(6)}`;
}

export function AiUsagePage() {
    const [user, setUser] = useState(null);
    const [isUserLoading, setIsUserLoading] = useState(true);
    const [period, setPeriod] = useState("week");
    const [summary, setSummary] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        getCurrentUser()
            .then(setUser)
            .finally(() => setIsUserLoading(false));
    }, []);

    useEffect(() => {
        if (!user || user.role !== "owner") return;

        setIsLoading(true);
        setError("");
        getAiUsageSummary(period)
            .then(setSummary)
            .catch(e => setError(e.message))
            .finally(() => setIsLoading(false));
    }, [user, period]);

    if (isUserLoading) {
        return <div className="p-6 text-sm text-[var(--g-600)]">Loading…</div>;
    }

    if (!user || user.role !== "owner") {
        return (
            <div className="p-6">
                <EmptyState
                    icon="🔒"
                    title="Owners only"
                    body="Only company owners can view AI usage and cost data."
                />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-[var(--s)]">AI Usage & Cost</h1>
                    <p className="text-sm text-[var(--g-600)] mt-1">
                        How much your AI providers have cost, broken down by model.
                    </p>
                </div>

                <div className="flex gap-1 bg-[var(--g-200)] rounded-[var(--radius-md)] p-1">
                    {PERIODS.map(p => (
                        <button
                            key={p.value}
                            onClick={() => setPeriod(p.value)}
                            className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold transition
                ${period === p.value
                                    ? "bg-white text-[var(--s)] shadow-[var(--shadow-sm)]"
                                    : "text-[var(--g-600)] hover:text-[var(--s)]"
                                }`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {error && (
                <p className="text-sm text-[var(--danger)] mb-4">{error}</p>
            )}

            {isLoading && (
                <div className="p-8 text-center text-sm text-[var(--g-600)]">Loading usage data…</div>
            )}

            {!isLoading && summary && (
                <>
                    <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--g-300)] shadow-[var(--shadow-sm)] p-5 mb-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--g-500)] mb-1">
                            Total cost — {PERIODS.find(p => p.value === period)?.label.toLowerCase()}
                        </p>
                        <p className="text-2xl font-bold text-[var(--s)]">
                            {formatCost(summary.overall_total_cost)}
                        </p>
                    </div>

                    <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--g-300)] shadow-[var(--shadow-sm)] overflow-hidden">
                        {summary.by_model.length === 0 ? (
                            <EmptyState icon="📊" title="No AI usage yet" body="Once your AI providers start answering tickets, costs will show up here." />
                        ) : (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[var(--g-300)] bg-[var(--g-100)]">
                                        <th className="text-left px-4 py-2.5 font-semibold text-[var(--g-600)] text-xs uppercase tracking-wider">Model</th>
                                        <th className="text-left px-4 py-2.5 font-semibold text-[var(--g-600)] text-xs uppercase tracking-wider">Purpose</th>
                                        <th className="text-right px-4 py-2.5 font-semibold text-[var(--g-600)] text-xs uppercase tracking-wider">Calls</th>
                                        <th className="text-right px-4 py-2.5 font-semibold text-[var(--g-600)] text-xs uppercase tracking-wider">Input tokens</th>
                                        <th className="text-right px-4 py-2.5 font-semibold text-[var(--g-600)] text-xs uppercase tracking-wider">Output tokens</th>
                                        <th className="text-right px-4 py-2.5 font-semibold text-[var(--g-600)] text-xs uppercase tracking-wider">Cost</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {summary.by_model.map((row, i) => (
                                        <tr key={`${row.model_name}-${row.purpose}`} className={i > 0 ? "border-t border-[var(--g-200)]" : ""}>
                                            <td className="px-4 py-2.5 font-medium text-[var(--s)]">{row.model_name}</td>
                                            <td className="px-4 py-2.5 text-[var(--g-600)]">
                                                {PURPOSE_LABELS[row.purpose] ?? row.purpose}
                                            </td>
                                            <td className="px-4 py-2.5 text-right text-[var(--g-600)]">{row.call_count}</td>
                                            <td className="px-4 py-2.5 text-right text-[var(--g-600)]">{row.total_input_tokens.toLocaleString()}</td>
                                            <td className="px-4 py-2.5 text-right text-[var(--g-600)]">{row.total_output_tokens.toLocaleString()}</td>
                                            <td className="px-4 py-2.5 text-right font-semibold text-[var(--s)]">{formatCost(row.total_cost)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}