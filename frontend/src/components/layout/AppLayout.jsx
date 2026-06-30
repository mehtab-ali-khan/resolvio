// frontend/src/components/layout/AppLayout.jsx

import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";
import { getCurrentUser, logout } from "../../api/tickets.js";

const NAV_ITEMS = [
    { to: "/tickets", label: "Tickets", icon: "🎫" },
    { to: "/knowledge-base", label: "Knowledge Base", icon: "📚" },
    { to: "/analytics", label: "Analytics", icon: "📊" },
];

export function AppLayout() {
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        getCurrentUser()
            .then(setUser)
            .catch(() => {
            });
    }, []);

    async function handleLogout() {
        logout();
        navigate("/login", { replace: true });
    }

    return (
        <div className="min-h-screen flex bg-[var(--nexus-color-bg)]">
            <aside className="w-60 flex-shrink-0 bg-[var(--nexus-color-surface)] border-r border-[var(--nexus-color-border)] flex flex-col">
                <div className="flex items-center gap-2.5 px-5 h-14 border-b border-[var(--nexus-color-border)]">
                    <div className="w-7 h-7 rounded-[var(--nexus-radius-sm)] [background:var(--nexus-gradient-brand)] flex items-center justify-center flex-shrink-0">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="white" />
                        </svg>
                    </div>
                    <span className="font-bold text-[15px] text-[var(--nexus-color-text)] tracking-tight">Nexus Support</span>
                </div>

                <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
                    {NAV_ITEMS.map(item => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                                `flex items-center gap-2.5 px-3 py-2.5 rounded-[var(--nexus-radius-md)] text-sm font-semibold transition ${isActive
                                    ? "bg-[var(--nexus-color-primary-soft)] text-[var(--nexus-color-primary-strong)]"
                                    : "text-[var(--nexus-color-secondary)] hover:bg-[var(--nexus-color-surface-muted)]"
                                }`
                            }
                        >
                            <span className="text-base">{item.icon}</span>
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                <div className="px-3 py-4 border-t border-[var(--nexus-color-border)] flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full [background:var(--nexus-gradient-avatar)] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {user?.first_name?.[0]}{user?.last_name?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[var(--nexus-color-text)] truncate">{user?.first_name} {user?.last_name}</p>
                        <p className="text-xs text-[var(--nexus-color-subtle)] truncate">{user?.company_name}</p>
                    </div>
                    <button onClick={handleLogout} aria-label="Sign out" className="text-[var(--nexus-color-subtle)] hover:text-[var(--nexus-color-danger)] transition">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                    </button>
                </div>
            </aside>

            <main className="flex-1 min-w-0">
                <Outlet />
            </main>
        </div>
    );
}