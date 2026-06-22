// frontend/src/components/tickets/StatusBadge.jsx

export const TICKET_STATUSES = [
    { value: "open", label: "Open" },
    { value: "in_progress", label: "In progress" },
    { value: "resolved", label: "Resolved" },
];

export const statusLabels = TICKET_STATUSES.reduce((labels, status) => {
    labels[status.value] = status.label;
    return labels;
}, {});

export function StatusBadge({ status }) {
    const styles = {
        open: "bg-[var(--nexus-color-accent-soft)] text-[var(--nexus-color-accent-strong)] ring-1 ring-[var(--nexus-color-accent-soft)]",
        in_progress: "bg-[var(--nexus-color-warning-soft)] text-[var(--nexus-color-warning)] ring-1 ring-[var(--nexus-color-warning-soft)]",
        resolved: "bg-[var(--nexus-color-success-soft)] text-[var(--nexus-color-success)] ring-1 ring-[var(--nexus-color-success-soft)]",
    };
    const dots = {
        open: "bg-[var(--nexus-color-accent)]",
        in_progress: "bg-[var(--nexus-color-warning)]",
        resolved: "bg-[var(--nexus-color-success)]",
    };
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${styles[status] ?? styles.open}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${dots[status] ?? dots.open}`} />
            {statusLabels[status] ?? status}
        </span>
    );
}

export function NewBadge() {
    return (
        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-[var(--nexus-color-danger)] text-white">
            New
        </span>
    );
}