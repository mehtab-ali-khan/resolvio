// frontend/src/pages/AnalyticsPage.jsx

export function AnalyticsPage() {
    return (
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-7">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--nexus-color-primary)] mb-1">Insights</p>
            <h1 className="text-2xl font-bold text-[var(--nexus-color-text)] tracking-tight mb-1">Analytics</h1>
            <p className="text-sm text-[var(--nexus-color-muted)] mb-8">Coming soon — ticket volume, AI resolution rate, and response time trends.</p>

            <div className="bg-[var(--nexus-color-surface)] rounded-[var(--nexus-radius-xl)] border border-dashed border-[var(--nexus-color-border-strong)] py-20 flex flex-col items-center justify-center text-center">
                <span className="text-4xl mb-3">📊</span>
                <p className="font-semibold text-[var(--nexus-color-muted)] text-sm">This page is on the roadmap</p>
            </div>
        </div>
    );
}