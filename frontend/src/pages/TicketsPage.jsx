// frontend/src/pages/TicketsPage.jsx

import { useEffect, useState } from "react";
import { getTicketById, listTickets } from "../api/tickets.js";
import { Avatar, EmptyState } from "../components/shared/ui.jsx";
import { NewBadge, StatusBadge } from "../components/tickets/StatusBadge.jsx";
import { TicketDetail } from "../components/tickets/TicketDetail.jsx";

const LIST_POLL_INTERVAL_MS = 60000;
const SEARCH_DEBOUNCE_MS = 400;

const STATUS_FILTERS = [
    { value: "all", label: "Default" },
    { value: "open", label: "Open" },
    { value: "resolved", label: "Resolved" },
];

function sortTickets(list) {
    return [...list].sort((a, b) => {
        if (a.is_new !== b.is_new) return a.is_new ? -1 : 1;
        return new Date(b.updated_at) - new Date(a.updated_at);
    });
}

export function TicketsPage() {
    const [tickets, setTickets] = useState([]);
    const [statusFilter, setStatusFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isDetailLoading, setIsDetailLoading] = useState(false);

    // Wait until the agent pauses typing for SEARCH_DEBOUNCE_MS before
    // actually triggering a backend search - avoids firing a request on
    // every single keystroke.
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [search]);

    async function loadTickets(filter = statusFilter, searchTerm = debouncedSearch) {
        setError("");
        setIsLoading(true);
        try {
            const data = await listTickets(1, filter, searchTerm);
            setTickets(data.results);
            setHasMore(Boolean(data.next));
            setPage(1);
        } catch (e) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    }

    async function loadMoreTickets() {
        if (isLoadingMore || !hasMore) return;
        setIsLoadingMore(true);
        try {
            const nextPage = page + 1;
            const data = await listTickets(nextPage, statusFilter, debouncedSearch);
            setTickets(prev => [...prev, ...data.results]);
            setHasMore(Boolean(data.next));
            setPage(nextPage);
        } catch (e) {
            setError(e.message);
        } finally {
            setIsLoadingMore(false);
        }
    }

    function handleListScroll(e) {
        const el = e.target;
        const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        if (nearBottom) loadMoreTickets();
    }

    function handleMessageSent(ticketId, message) {
        setSelectedTicket(current =>
            current?.id === ticketId
                ? { ...current, messages: [...current.messages, message] }
                : current
        );
    }

    async function selectTicket(id) {
        setError("");
        setIsDetailLoading(true);
        try {
            const detail = await getTicketById(id);
            setSelectedTicket(detail);
            setTickets(prev => sortTickets(prev.map(t => (t.id === id ? { ...t, is_new: false } : t))));
        } catch (e) {
            setError(e.message);
        } finally {
            setIsDetailLoading(false);
        }
    }

    function handleTicketStatusUpdated(ticketId, status) {
        setTickets(currentTickets =>
            currentTickets
                .map(ticket => (ticket.id === ticketId ? { ...ticket, status } : ticket))
                .filter(ticket => statusFilter === "all" || ticket.status === statusFilter)
        );
        setSelectedTicket(currentTicket =>
            currentTicket?.id === ticketId ? { ...currentTicket, status } : currentTicket
        );
    }

    function handleFilterChange(nextFilter) {
        setStatusFilter(nextFilter);
        setSelectedTicket(null);
        loadTickets(nextFilter, debouncedSearch);
    }

    // Initial load
    useEffect(() => { loadTickets(); }, []);

    // Re-search whenever the debounced search term actually changes
    useEffect(() => {
        setSelectedTicket(null);
        loadTickets(statusFilter, debouncedSearch);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch]);

    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const data = await listTickets(1, statusFilter, debouncedSearch);
                setTickets(prevTickets => {
                    const freshById = new Map(data.results.map(t => [t.id, t]));
                    const freshIds = new Set(data.results.map(t => t.id));
                    const brandNew = data.results.filter(t => !prevTickets.some(p => p.id === t.id));
                    const stillVisible = prevTickets
                        .filter(t => freshIds.has(t.id))
                        .map(t => freshById.get(t.id) ?? t);
                    return sortTickets([...brandNew, ...stillVisible]);
                });
            } catch {
                // silent fail on background poll — don't disrupt the agent
            }
        }, LIST_POLL_INTERVAL_MS);

        return () => clearInterval(interval);
    }, [statusFilter, debouncedSearch]);

    return (
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-7">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--nexus-color-primary)] mb-1">Support Desk</p>
                    <h1 className="text-2xl font-bold text-[var(--nexus-color-text)] tracking-tight">Tickets</h1>
                    <p className="text-sm text-[var(--nexus-color-muted)] mt-0.5">Review complaints and reply from only one place.</p>
                </div>
                <button
                    onClick={() => loadTickets()}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 rounded-[var(--nexus-radius-md)] border border-[var(--nexus-color-border)] bg-[var(--nexus-color-surface)] text-[var(--nexus-color-secondary)] text-sm font-semibold shadow-[var(--nexus-shadow-sm)] hover:bg-[var(--nexus-color-surface-muted)] transition disabled:opacity-60 disabled:cursor-wait"
                >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={isLoading ? "animate-spin" : ""}>
                        <polyline points="23 4 23 10 17 10" />
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                    </svg>
                    {isLoading ? "Refreshing…" : "Refresh"}
                </button>
            </div>

            {error && (
                <div className="mb-5 px-4 py-3 rounded-[var(--nexus-radius-md)] bg-[var(--nexus-color-danger-soft)] border border-[var(--nexus-color-danger-soft)] text-[var(--nexus-color-danger)] text-sm">
                    {error}
                </div>
            )}

            <div className={`grid gap-4 items-start ${selectedTicket || isDetailLoading ? "lg:grid-cols-[1fr_1.1fr]" : "grid-cols-1"}`}>

                <div className="bg-[var(--nexus-color-surface)] rounded-[var(--nexus-radius-xl)] border border-[var(--nexus-color-border)] shadow-[var(--nexus-shadow-sm)] overflow-hidden">

                    <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--nexus-color-border)] bg-[var(--nexus-color-surface-muted)]">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--nexus-color-subtle)" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search by name, email, or message…"
                            className="flex-1 text-sm text-[var(--nexus-color-text)] placeholder-[var(--nexus-color-subtle)] bg-transparent outline-none"
                        />
                        {search && (
                            <button onClick={() => setSearch("")} className="text-[var(--nexus-color-subtle)] hover:text-[var(--nexus-color-secondary)] text-lg leading-none">×</button>
                        )}
                    </div>

                    <div className="flex items-center gap-1 px-4 py-2.5 border-b border-[var(--nexus-color-border)] bg-[var(--nexus-color-surface)]">
                        {STATUS_FILTERS.map(filter => (
                            <button
                                key={filter.value}
                                type="button"
                                onClick={() => handleFilterChange(filter.value)}
                                className={`px-3 py-1.5 rounded-[var(--nexus-radius-md)] text-xs font-bold transition ${statusFilter === filter.value
                                    ? "bg-[var(--nexus-color-primary-soft)] text-[var(--nexus-color-primary-strong)]"
                                    : "text-[var(--nexus-color-secondary)] hover:bg-[var(--nexus-color-surface-muted)]"
                                    }`}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>

                    <div className="overflow-y-auto max-h-[calc(100vh-255px)]" onScroll={handleListScroll}>
                        {isLoading && (
                            <div className="py-10 text-center text-[var(--nexus-color-subtle)] text-sm">Loading tickets…</div>
                        )}

                        {!isLoading && tickets.length === 0 && (
                            <EmptyState
                                icon="📭"
                                title={search ? "No matches" : "No tickets yet"}
                                body={search ? "Try a different search term." : "Tickets submitted via the widget will appear here."}
                            />
                        )}

                        {!isLoading && tickets.map((ticket, i) => {
                            const active = selectedTicket?.id === ticket.id;
                            return (
                                <button
                                    key={ticket.id}
                                    type="button"
                                    onClick={() => selectTicket(ticket.id)}
                                    className={`w-full text-left flex items-center gap-3 px-4 py-3.5 transition border-l-2
                    ${i < tickets.length - 1 ? "border-b border-[var(--nexus-color-border)]" : ""}
                    ${active ? "bg-[var(--nexus-color-primary-soft)] border-l-[var(--nexus-color-primary)]" : "hover:bg-[var(--nexus-color-surface-muted)] border-l-transparent"}
                  `}
                                >
                                    <Avatar name={ticket.customer_name} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2 mb-0.5">
                                            <span className={`text-sm truncate ${ticket.is_new ? "font-bold" : "font-semibold"} text-[var(--nexus-color-text)]`}>
                                                {ticket.customer_name}
                                            </span>
                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                {ticket.is_new && <NewBadge />}
                                                <StatusBadge status={ticket.status} />
                                            </div>
                                        </div>
                                        <p className="text-xs text-[var(--nexus-color-muted)] truncate">{ticket.customer_email}</p>
                                        <p className="text-[11px] text-[var(--nexus-color-subtle)] mt-0.5">{new Date(ticket.created_at).toLocaleString()}</p>
                                    </div>
                                </button>
                            );
                        })}
                        {isLoadingMore && (
                            <div className="py-4 text-center text-[var(--nexus-color-subtle)] text-xs">Loading more…</div>
                        )}
                    </div>
                </div>

                {(selectedTicket || isDetailLoading) && (
                    <TicketDetail
                        ticket={selectedTicket}
                        isLoading={isDetailLoading}
                        onMessageSent={handleMessageSent}
                        onStatusUpdated={handleTicketStatusUpdated}
                        onClose={() => setSelectedTicket(null)}
                    />
                )}

            </div>
        </div>
    );
}