// frontend/src/pages/TicketsPage.jsx

import { useEffect, useState } from "react";
import { getTicketById, listTickets } from "../api/tickets.js";
import { Avatar, EmptyState } from "../components/shared/ui.jsx";
import { NewBadge, StatusBadge } from "../components/tickets/StatusBadge.jsx";
import { TicketDetail } from "../components/tickets/TicketDetail.jsx";

const LIST_POLL_INTERVAL_MS = 30000;

function sortTickets(list) {
    return [...list].sort((a, b) => {
        if (a.is_new !== b.is_new) return a.is_new ? -1 : 1;
        return new Date(b.updated_at) - new Date(a.updated_at);
    });
}

export function TicketsPage() {
    const [tickets, setTickets] = useState([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isDetailLoading, setIsDetailLoading] = useState(false);
    const [search, setSearch] = useState("");

    async function loadTickets() {
        setError("");
        setIsLoading(true);
        try {
            const data = await listTickets(1);
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
            const data = await listTickets(nextPage);
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
            currentTickets.map(ticket => (ticket.id === ticketId ? { ...ticket, status } : ticket))
        );
        setSelectedTicket(currentTicket =>
            currentTicket?.id === ticketId ? { ...currentTicket, status } : currentTicket
        );
    }

    useEffect(() => { loadTickets(); }, []);

    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const data = await listTickets(1);
                setTickets(prevTickets => {
                    const freshById = new Map(data.results.map(t => [t.id, t]));
                    const existingIds = new Set(prevTickets.map(t => t.id));
                    const brandNew = data.results.filter(t => !existingIds.has(t.id));
                    const updatedExisting = prevTickets.map(t => freshById.get(t.id) ?? t);
                    return sortTickets([...brandNew, ...updatedExisting]);
                });
            } catch {
                // silent fail on background poll — don't disrupt the agent
            }
        }, LIST_POLL_INTERVAL_MS);

        return () => clearInterval(interval);
    }, []);

    // const openCount = tickets.filter(t => t.status === "open").length;
    // const inProgressCount = tickets.filter(t => t.status === "in_progress").length;
    // const resolvedCount = tickets.filter(t => t.status === "resolved").length;

    const filtered = tickets.filter(t =>
        t.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
        t.customer_email?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-7">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--nexus-color-primary)] mb-1">Support Desk</p>
                    <h1 className="text-2xl font-bold text-[var(--nexus-color-text)] tracking-tight">Tickets</h1>
                    <p className="text-sm text-[var(--nexus-color-muted)] mt-0.5">Review complaints and reply from only one place.</p>
                </div>
                <button
                    onClick={loadTickets}
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

            {/* <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <StatCard compact label="Total" value={tickets.length} accentClass="border-t-[var(--nexus-color-secondary)]" />
                <StatCard compact label="Open" value={openCount} accentClass="border-t-[var(--nexus-color-accent)]" />
                <StatCard compact label="In progress" value={inProgressCount} accentClass="border-t-[var(--nexus-color-warning)]" />
                <StatCard compact label="Resolved" value={resolvedCount} accentClass="border-t-[var(--nexus-color-success)]" />
            </div> */}

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
                            placeholder="Search by name or email…"
                            className="flex-1 text-sm text-[var(--nexus-color-text)] placeholder-[var(--nexus-color-subtle)] bg-transparent outline-none"
                        />
                        {search && (
                            <button onClick={() => setSearch("")} className="text-[var(--nexus-color-subtle)] hover:text-[var(--nexus-color-secondary)] text-lg leading-none">×</button>
                        )}
                    </div>

                    <div className="overflow-y-auto max-h-[calc(100vh-210px)]" onScroll={handleListScroll}>
                        {isLoading && (
                            <div className="py-10 text-center text-[var(--nexus-color-subtle)] text-sm">Loading tickets…</div>
                        )}

                        {!isLoading && filtered.length === 0 && (
                            <EmptyState
                                icon="📭"
                                title={search ? "No matches" : "No tickets yet"}
                                body={search ? "Try a different search term." : "Tickets submitted via the widget will appear here."}
                            />
                        )}

                        {!isLoading && filtered.map((ticket, i) => {
                            const active = selectedTicket?.id === ticket.id;
                            return (
                                <button
                                    key={ticket.id}
                                    type="button"
                                    onClick={() => selectTicket(ticket.id)}
                                    className={`w-full text-left flex items-center gap-3 px-4 py-3.5 transition border-l-2
                    ${i < filtered.length - 1 ? "border-b border-[var(--nexus-color-border)]" : ""}
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