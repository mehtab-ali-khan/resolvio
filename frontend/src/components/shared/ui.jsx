// frontend/src/components/shared/ui.jsx

export function Avatar({ name, size = "md" }) {
    const initials = name?.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() ?? "?";
    const sizeClass = size === "sm" ? "w-8 h-8 text-xs" : size === "lg" ? "w-11 h-11 text-base" : "w-9 h-9 text-sm";
    return (
        <div
            className={`${sizeClass} rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 select-none`}
            style={{ background: "var(--gradient)" }}
        >
            {initials}
        </div>
    );
}

export function EmptyState({ icon, title, body }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <span className="text-4xl mb-3">{icon}</span>
            <p className="font-semibold text-[var(--s-mid)] text-sm mb-1">{title}</p>
            <p className="text-[var(--g-500)] text-xs leading-relaxed max-w-48">{body}</p>
        </div>
    );
}