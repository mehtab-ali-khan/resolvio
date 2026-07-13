// frontend/src/components/shared/ui.jsx

import { Link } from "react-router";

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

function LogoMark({ compact = false }) {
    const sizeClass = compact ? "w-6 h-6" : "w-7 h-7";

    return (
        <span
            className={`${sizeClass} rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0 shadow-[var(--shadow-sm)]`}
            style={{ background: "var(--gradient)" }}
            aria-hidden="true"
        >
            <svg width={compact ? "12" : "13"} height={compact ? "12" : "13"} viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <text
                    x="12"
                    y="22"
                    textAnchor="middle"
                    fontSize="28"
                    fontWeight="800"
                    fill="white"
                    fontFamily="Arial, Helvetica, sans-serif"
                >
                    R
                </text>
            </svg>
        </span>
    );
}

export function BrandLogo({ to = "/", showText = true, compact = false, className = "", textClassName = "" }) {
    return (
        <Link to={to} className={`inline-flex items-center gap-2 select-none ${className}`}>
            <LogoMark compact={compact} />
            {showText && (
                <span className={`font-bold tracking-tight ${textClassName}`}>
                    Resolvio
                </span>
            )}
        </Link>
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