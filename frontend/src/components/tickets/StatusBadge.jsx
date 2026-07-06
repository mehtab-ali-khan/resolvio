// frontend/src/components/tickets/StatusBadge.jsx

export const TICKET_STATUSES = [
    { value: "open", label: "Open" },
    { value: "resolved", label: "Resolved" },
];

export const statusLabels = TICKET_STATUSES.reduce((labels, status) => {
    labels[status.value] = status.label;
    return labels;
}, {});

export function StatusBadge({ status }) {
    const styles = {
        open: "bg-[var(--p-soft)] text-[var(--p)] ring-1 ring-[var(--p-soft)]",
        resolved: "bg-[var(--s-soft)] text-[var(--s-mid)] ring-1 ring-[var(--g-300)]",
    };
    const dots = {
        open: "bg-[var(--p)]",
        resolved: "bg-[var(--g-500)]",
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
        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-[var(--danger)] text-white">
            New
        </span>
    );
}