// frontend/src/components/shared/ui.jsx

export function Avatar({ name, size = "md" }) {
    const initials = name?.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() ?? "?";
    const sizeClass = size === "sm" ? "w-8 h-8 text-xs" : size === "lg" ? "w-11 h-11 text-base" : "w-9 h-9 text-sm";
    return (
        <div className={`${sizeClass} rounded-full flex items-center justify-center font-bold text-[var(--nexus-color-inverse)] flex-shrink-0 select-none [background:var(--nexus-gradient-avatar)] ring-2 ring-[var(--nexus-color-primary-soft)]`}>
            {initials}
        </div>
    );
}

export function StatCard({ label, value, accentClass, compact = false }) {
    return (
        <div className={`bg-[var(--nexus-color-surface)] rounded-[var(--nexus-radius-lg)] border border-[var(--nexus-color-border)] border-t-2 shadow-[var(--nexus-shadow-sm)] ${compact ? "px-4 py-3" : "px-5 py-4"} ${accentClass}`}>
            <p className={`font-bold uppercase tracking-widest text-[var(--nexus-color-subtle)] mb-1.5 ${compact ? "text-[10px]" : "text-[11px]"}`}>{label}</p>
            <p className={`font-bold text-[var(--nexus-color-text)] leading-none ${compact ? "text-xl" : "text-2xl"}`}>{value}</p>
        </div>
    );
}

export function EmptyState({ icon, title, body }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <span className="text-4xl mb-3">{icon}</span>
            <p className="font-semibold text-[var(--nexus-color-muted)] text-sm mb-1">{title}</p>
            <p className="text-[var(--nexus-color-subtle)] text-xs leading-relaxed max-w-48">{body}</p>
        </div>
    );
}