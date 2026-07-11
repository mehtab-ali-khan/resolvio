// frontend/src/components/layout/AppLayout.jsx

import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";
import { getCurrentUser, logout } from "../../api/tickets.js";
import { Avatar, BrandLogo } from "../shared/ui.jsx";

// ─── Nav items with clean SVG icons ──────────────────────────────────────────

const NAV_ITEMS = [
    {
        to: "/tickets",
        label: "Tickets",
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V9z" />
                <path d="M12 7v10" strokeDasharray="2 2" />
            </svg>
        ),
    },
    {
        to: "/knowledge-base",
        label: "Support Articles",
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
        ),
    },
    {
        to: "/widget-setup",
        label: "Widget Setup",
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
            </svg>
        ),
    },
];

export function AppLayout() {
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    // isCollapsed — desktop sidebar is narrow (icons only) or wide (icons + text)
    const [isCollapsed, setIsCollapsed] = useState(true);

    // isMobileOpen — on small screens, sidebar is hidden by default.
    // This controls whether it slides in as an overlay.
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    // We need a ref to detect clicks outside the mobile sidebar so we
    // can close it automatically when the user taps the main content area.
    const sidebarRef = useRef(null);

    useEffect(() => {
        getCurrentUser()
            .then(setUser)
            .catch(() => { });
    }, []);

    // Close mobile sidebar when user clicks outside of it
    useEffect(() => {
        function handleClickOutside(e) {
            if (isMobileOpen && sidebarRef.current && !sidebarRef.current.contains(e.target)) {
                setIsMobileOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isMobileOpen]);

    async function handleLogout() {
        logout();
        navigate("/login", { replace: true });
    }

    // ─── Sidebar content ─────────────────────────────────────────────────────
    // Written once, used in both desktop and mobile versions below.
    // `collapsed` prop controls whether to show text labels or just icons.

    function SidebarContent({ collapsed }) {
        return (
            <div className="flex flex-col h-full">

                {/* Top — logo + collapse toggle */}
                <div className={`flex items-center h-14 border-b border-gray-100 flex-shrink-0 ${collapsed ? "justify-center px-0" : "justify-between px-4"}`}>
                    {!collapsed && (
                        <BrandLogo
                            to="/"
                            showText={true}
                            compact={false}
                            textClassName="text-[15px] text-gray-900"
                        />
                    )}
                    {/* Collapse/expand toggle — only on desktop */}
                    <button
                        onClick={() => setIsCollapsed(v => !v)}
                        className="hidden lg:flex w-7 h-7 items-center justify-center rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
                        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    >
                        {collapsed ? (
                            // Arrow pointing right — means "expand"
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                        ) : (
                            // Arrow pointing left — means "collapse"
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="15 18 9 12 15 6" />
                            </svg>
                        )}
                    </button>
                </div>

                {/* Nav links */}
                <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5">
                    {NAV_ITEMS.map(item => (
                        <div key={item.to} className="relative group">
                            <NavLink
                                to={item.to}
                                onClick={() => setIsMobileOpen(false)}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm font-medium transition-colors
                                    ${collapsed ? "justify-center" : ""}
                                    ${isActive
                                        ? "bg-gray-100 text-gray-900"
                                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                                    }`
                                }
                            >
                                <span className="flex-shrink-0">{item.icon}</span>
                                {!collapsed && <span>{item.label}</span>}
                            </NavLink>

                            {/* Tooltip — only shows when sidebar is collapsed on desktop */}
                            {collapsed && (
                                <div className="
                                    absolute left-full top-1/2 -translate-y-1/2 ml-2
                                    bg-gray-900 text-white text-xs font-medium
                                    px-2.5 py-1.5 rounded-md whitespace-nowrap
                                    opacity-0 group-hover:opacity-100
                                    pointer-events-none transition-opacity duration-150
                                    hidden lg:block
                                    z-50
                                ">
                                    {item.label}
                                </div>
                            )}
                        </div>
                    ))}
                </nav>

                {/* Bottom — user info + logout */}
                <div className={`border-t border-gray-100 p-3 flex items-center gap-2.5 flex-shrink-0 ${collapsed ? "justify-center" : ""}`}>
                    {/* Avatar circle with initials */}
                    <Avatar name={user?.first_name} />

                    {/* Name + company — hidden when collapsed */}
                    {!collapsed && (
                        <>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">
                                    {user?.first_name} {user?.last_name}
                                </p>
                                <p className="text-xs text-gray-400 truncate">
                                    {user?.company_name}
                                </p>
                            </div>
                            <button
                                onClick={handleLogout}
                                aria-label="Sign out"
                                className="text-gray-400 hover:text-red-500 transition flex-shrink-0"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                    <polyline points="16 17 21 12 16 7" />
                                    <line x1="21" y1="12" x2="9" y2="12" />
                                </svg>
                            </button>
                        </>
                    )}

                    {/* When collapsed, logout button moves below the avatar */}
                    {collapsed && (
                        <button
                            onClick={handleLogout}
                            aria-label="Sign out"
                            className="hidden"
                        />
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen overflow-hidden flex bg-gray-50">

            {/* ── Desktop sidebar ──────────────────────────────────────────────
                Always visible on large screens.
                Width transitions smoothly between collapsed (60px) and expanded (240px).
            ──────────────────────────────────────────────────────────────────── */}
            <aside
                className={`
                    hidden lg:flex flex-col flex-shrink-0
                    bg-white border-r border-gray-100
                    transition-all duration-200 ease-in-out
                    ${isCollapsed ? "w-[60px]" : "w-[240px]"}
                `}
            >
                <SidebarContent collapsed={isCollapsed} />
            </aside>

            {/* ── Mobile sidebar overlay ───────────────────────────────────────
                On small screens, the sidebar slides in from the left as an overlay
                on top of the page content when the hamburger button is tapped.
            ──────────────────────────────────────────────────────────────────── */}
            {isMobileOpen && (
                // Dark backdrop behind the sidebar — clicking it closes the sidebar
                <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" />
            )}
            <aside
                ref={sidebarRef}
                className={`
                    fixed top-0 left-0 bottom-0 w-[240px]
                    bg-white border-r border-gray-100
                    z-50 lg:hidden
                    transition-transform duration-200 ease-in-out
                    ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
                `}
            >
                <SidebarContent collapsed={false} />
            </aside>

            {/* ── Main content area ────────────────────────────────────────────
                Takes up all remaining space to the right of the sidebar.
            ──────────────────────────────────────────────────────────────────── */}
            <div className="flex-1 min-w-0 min-h-0 flex flex-col">

                {/* Mobile top bar — only visible on small screens.
                    Shows the app name + hamburger button to open the sidebar. */}
                <div className="lg:hidden flex items-center gap-3 px-4 h-14 bg-white border-b border-gray-100 flex-shrink-0">
                    <button
                        onClick={() => setIsMobileOpen(true)}
                        className="text-gray-500 hover:text-gray-700 transition"
                        aria-label="Open menu"
                    >
                        {/* Hamburger icon — three horizontal lines */}
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="3" y1="6" x2="21" y2="6" />
                            <line x1="3" y1="12" x2="21" y2="12" />
                            <line x1="3" y1="18" x2="21" y2="18" />
                        </svg>
                    </button>
                    <BrandLogo to="/" textClassName="text-[15px] text-gray-900" />
                </div>

                {/* Page content rendered here by React Router */}
                <main className="flex-1 min-w-0 min-h-0 overflow-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}