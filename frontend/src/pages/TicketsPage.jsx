// frontend/src/pages/TicketsPage.jsx

import { useCallback, useEffect, useState } from "react";
import { getTicketById, getToken, listTickets } from "../api/tickets.js";
import { useWebSocket } from "../hooks/useWebSocket.js";
import { Avatar, EmptyState, formatDateTime } from "../components/shared/ui.jsx";
import { NewBadge, StatusBadge } from "../components/tickets/StatusBadge.jsx";
import { TicketDetail } from "../components/tickets/TicketDetail.jsx";

const WS_BASE = import.meta.env.VITE_WS_URL || "ws://localhost:8000";

const STATUS_FILTERS = [
    { value: "all", label: "All" },
    { value: "open", label: "Open" },
    { value: "resolved", label: "Resolved" },
];

const SEARCH_DEBOUNCE_MS = 400;

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

    const token = getToken();
    const wsUrl = token ? `${WS_BASE}/ws/agent/?token=${token}` : null;

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

    const handleWebSocketMessage = useCallback((data) => {
        if (data.type === "ticket_update") {
            loadTickets();
        }

        if (data.type === "new_message") {
            const isCurrentlyOpen = selectedTicket?.id === data.ticket_id;

            setTickets(prev => sortTickets(prev.map(t =>
                t.id === data.ticket_id
                    ? {
                        ...t,
                        is_new: isCurrentlyOpen ? false : true,
                        updated_at: new Date().toISOString()
                    }
                    : t
            )));

            if (isCurrentlyOpen) {
                getTicketById(data.ticket_id).catch(() => { });
            }

            setSelectedTicket(current => {
                if (!current || current.id !== data.ticket_id) return current;
                const alreadyExists = current.messages.some(m => m.id === data.message?.id);
                if (alreadyExists) return current;
                return {
                    ...current,
                    messages: [...current.messages, data.message],
                };
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilter, debouncedSearch, selectedTicket]);

    useWebSocket(wsUrl, handleWebSocketMessage);

    async function selectTicket(id) {
        setError("");
        setIsDetailLoading(true);
        try {
            const detail = await getTicketById(id);
            setSelectedTicket(detail);
            setTickets(prev => sortTickets(prev.map(t =>
                t.id === id ? { ...t, is_new: false } : t
            )));
        } catch (e) {
            setError(e.message);
        } finally {
            setIsDetailLoading(false);
        }
    }

    function handleTicketStatusUpdated(ticketId, status) {
        setTickets(currentTickets =>
            currentTickets
                .map(t => (t.id === ticketId ? { ...t, status } : t))
                .filter(t => statusFilter === "all" || t.status === statusFilter)
        );
        setSelectedTicket(current =>
            current?.id === ticketId ? { ...current, status } : current
        );
    }

    function handleFilterChange(nextFilter) {
        setStatusFilter(nextFilter);
        setSelectedTicket(null);
        loadTickets(nextFilter, debouncedSearch);
    }

    useEffect(() => { loadTickets(); }, []);

    useEffect(() => {
        setSelectedTicket(null);
        loadTickets(statusFilter, debouncedSearch);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch]);

    return (
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-7">

            {/* ── Page header ── */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-[var(--s)] tracking-tight">
                    Tickets
                </h1>
                <p className="text-sm text-[var(--g-600)] mt-0.5">
                    Review and reply to customer messages.
                </p>
            </div>

            {/* ── Error ── */}
            {error && (
                <div className="mb-5 px-4 py-3 rounded-[var(--radius-md)] bg-[var(--danger-soft)] text-[var(--danger)] text-sm">
                    {error}
                </div>
            )}

            {/* ── Main grid — list on left, detail on right ── */}
            <div className={`grid gap-4 items-start ${selectedTicket || isDetailLoading ? "lg:grid-cols-[1fr_1.1fr]" : "grid-cols-1"}`}>

                {/* ── Ticket list panel ── */}
                <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--g-300)] shadow-[var(--shadow-sm)] overflow-hidden">

                    {/* Search input */}
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--g-300)] bg-[var(--g-100)]">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--g-500)" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search by message…"
                            className="flex-1 text-sm text-[var(--s)] placeholder-[var(--g-500)] bg-transparent outline-none"
                        />
                        {search && (
                            <button
                                onClick={() => setSearch("")}
                                className="text-[var(--g-500)] hover:text-[var(--s)] text-lg leading-none transition"
                            >
                                ×
                            </button>
                        )}
                    </div>

                    {/* Filter buttons — Default / Open / Resolved */}
                    <div className="flex items-center gap-1 px-4 py-2.5 border-b border-[var(--g-300)] bg-white">
                        {STATUS_FILTERS.map(filter => (
                            <button
                                key={filter.value}
                                type="button"
                                onClick={() => handleFilterChange(filter.value)}
                                className={`px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-semibold transition ${statusFilter === filter.value
                                    ? "bg-[var(--p-soft)] text-[var(--p)]"
                                    : "text-[var(--g-600)] hover:bg-[var(--g-200)] hover:text-[var(--s)]"
                                    }`}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>

                    {/* Scrollable ticket list */}
                    <div
                        className="overflow-y-auto max-h-[calc(100vh-255px)]"
                        onScroll={handleListScroll}
                    >
                        {/* Loading state */}
                        {isLoading && (
                            <div className="py-10 text-center text-[var(--g-500)] text-sm">
                                Loading tickets…
                            </div>
                        )}

                        {/* Empty state */}
                        {!isLoading && tickets.length === 0 && (
                            <EmptyState
                                title={search ? "No matches found" : "No tickets yet"}
                                body={search ? "Try a different search term." : "Tickets submitted via the widget will appear here."}
                            />
                        )}

                        {/* Ticket rows */}
                        {!isLoading && tickets.map((ticket, i) => {
                            const active = selectedTicket?.id === ticket.id;
                            return (
                                <button
                                    key={ticket.id}
                                    type="button"
                                    onClick={() => selectTicket(ticket.id)}
                                    className={`w-full text-left flex items-center gap-3 px-4 py-3.5 transition border-l-2
                                        ${i < tickets.length - 1 ? "border-b border-[var(--g-300)]" : ""}
                                        ${active
                                            ? "bg-[var(--p-soft)] border-l-[var(--p)]"
                                            : "hover:bg-[var(--g-100)] border-l-transparent"
                                        }`}
                                >
                                    <Avatar />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2 mb-0.5">
                                            <span className={`text-sm truncate ${ticket.is_new ? "font-bold" : "font-semibold"} text-[var(--s)]`}>
                                                {ticket.message_preview || "New conversation"}
                                            </span>
                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                {ticket.is_new && <NewBadge />}
                                                <StatusBadge status={ticket.status} />
                                            </div>
                                        </div>
                                        <p className="text-[11px] text-[var(--g-500)] mt-0.5">
                                            {formatDateTime(ticket.created_at)}
                                        </p>
                                    </div>
                                </button>
                            );
                        })}

                        {/* Load more indicator */}
                        {isLoadingMore && (
                            <div className="py-4 text-center text-[var(--g-500)] text-xs">
                                Loading more…
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Ticket detail panel ── */}
                {(selectedTicket || isDetailLoading) && (
                    <TicketDetail
                        ticket={selectedTicket}
                        isLoading={isDetailLoading}
                        onStatusUpdated={handleTicketStatusUpdated}
                        onClose={() => setSelectedTicket(null)}
                    />
                )}
            </div>
        </div>
    );
}