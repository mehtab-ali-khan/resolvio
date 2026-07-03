// frontend/src/components/tickets/TicketDetail.jsx

import { useEffect, useRef, useState } from "react";
import { createAgentReply, updateTicketStatus } from "../../api/tickets.js";
import { Avatar, EmptyState } from "../shared/ui.jsx";
import { StatusBadge, TICKET_STATUSES, statusLabels } from "./StatusBadge.jsx";

function MessageBubble({ msg, customerName }) {
    const isAgent = msg.sender_type === "agent";
    const isAi = msg.sender_type === "ai";
    const isInternalDraft = isAi && msg.is_internal;
    const alignRight = isAgent || isAi;

    const label = isAgent
        ? "You (agent)"
        : isAi
            ? (isInternalDraft ? "AI draft (internal)" : "AI Assistant")
            : customerName;

    const bubbleClass = isInternalDraft
        ? "bg-[var(--nexus-color-warning-soft)] text-[var(--nexus-color-secondary-strong)] border border-dashed border-[var(--nexus-color-warning)] rounded-[var(--nexus-radius-lg)] rounded-tr-sm"
        : alignRight
            ? "bg-[var(--nexus-message-agent-bg)] text-[var(--nexus-message-agent-text)] rounded-[var(--nexus-radius-lg)] rounded-tr-sm border border-[var(--nexus-color-primary-soft)]"
            : "bg-[var(--nexus-message-customer-bg)] text-[var(--nexus-message-customer-text)] rounded-[var(--nexus-radius-lg)] rounded-tl-sm border border-[var(--nexus-message-customer-border)]";

    const labelClass = isInternalDraft
        ? "text-[var(--nexus-color-warning)]"
        : alignRight
            ? "text-[var(--nexus-message-agent-label)]"
            : "text-[var(--nexus-message-customer-label)]";

    return (
        <div className={`flex flex-col gap-1 ${alignRight ? "items-end" : "items-start"}`}>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-1 ${labelClass}`}>
                {label}{isInternalDraft && msg.ai_confidence != null ? ` · ${Math.round(msg.ai_confidence)}% confident` : ""}
            </span>
            <div className={`max-w-[82%] px-4 py-3 text-sm leading-relaxed shadow-[var(--nexus-shadow-sm)] ${bubbleClass}`}>
                {msg.body}
            </div>
            <span className="text-[10px] text-[var(--nexus-color-subtle)] px-1">
                {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
        </div>
    );
}

export function TicketDetail({ ticket, isLoading, onStatusUpdated, onClose }) {
    const [reply, setReply] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isStatusSubmitting, setIsStatusSubmitting] = useState(false);
    const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
    const messagesContainerRef = useRef(null);

    useEffect(() => {
        const container = messagesContainerRef.current;
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }, [ticket?.id, ticket?.messages?.length]);

    async function submitReply(e) {
        e.preventDefault();
        setError("");
        setIsSubmitting(true);
        try {
            // Just send the reply to the server — don't add it to the
            // screen here. The WebSocket push will add it automatically,
            // which is the single source of truth for new messages.
            await createAgentReply(ticket.id, { message: reply });
            setReply("");
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    }

    async function changeStatus(nextStatus) {
        if (nextStatus === ticket.status) {
            setIsStatusMenuOpen(false);
            return;
        }
        setError("");
        setIsStatusSubmitting(true);
        try {
            const updatedTicket = await updateTicketStatus(ticket.id, nextStatus);
            onStatusUpdated(ticket.id, updatedTicket.status);
            setIsStatusMenuOpen(false);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsStatusSubmitting(false);
        }
    }

    if (isLoading) {
        return (
            <div className="bg-[var(--nexus-color-surface)] rounded-[var(--nexus-radius-xl)] border border-[var(--nexus-color-border)] shadow-[var(--nexus-shadow-sm)] overflow-hidden">
                <EmptyState icon="⏳" title="Loading conversation…" body="Please wait." />
            </div>
        );
    }

    if (!ticket) return null;

    return (
        <div className="bg-[var(--nexus-color-surface)] rounded-[var(--nexus-radius-xl)] border border-[var(--nexus-color-border)] shadow-[var(--nexus-shadow-sm)] overflow-hidden flex flex-col h-full">

            <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--nexus-color-border)] bg-[var(--nexus-color-surface-muted)]">
                <Avatar name={ticket.customer_name} size="lg" />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <h2 className="font-bold text-[var(--nexus-color-text)] text-[15px] truncate">{ticket.customer_name}</h2>
                        <StatusBadge status={ticket.status} />
                    </div>
                    <p className="text-xs text-[var(--nexus-color-muted)] truncate">{ticket.customer_email} · Ticket #{ticket.id}</p>
                </div>
                <div
                    className="relative flex-shrink-0"
                    onBlur={event => {
                        if (!event.currentTarget.contains(event.relatedTarget)) {
                            setIsStatusMenuOpen(false);
                        }
                    }}
                >
                    <label className="sr-only" htmlFor={`ticket-status-${ticket.id}`}>Ticket status</label>
                    <button
                        id={`ticket-status-${ticket.id}`}
                        type="button"
                        onClick={() => setIsStatusMenuOpen(open => !open)}
                        disabled={isStatusSubmitting}
                        className="h-9 min-w-32 rounded-[var(--nexus-radius-md)] border border-[var(--nexus-color-border-strong)] bg-[var(--nexus-color-surface)] pl-3.5 pr-9 text-left text-xs font-bold text-[var(--nexus-color-secondary-strong)] shadow-[var(--nexus-shadow-sm)] outline-none transition hover:border-[var(--nexus-color-primary-muted)] focus:border-[var(--nexus-color-primary)] focus:ring-2 focus:ring-[var(--nexus-color-primary-soft)] disabled:opacity-60 disabled:cursor-wait"
                        aria-haspopup="listbox"
                        aria-expanded={isStatusMenuOpen}
                    >
                        {statusLabels[ticket.status] ?? ticket.status}
                    </button>
                    <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--nexus-color-primary)]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="m6 9 6 6 6-6" />
                    </svg>
                    {isStatusMenuOpen && (
                        <div className="absolute right-0 top-11 z-20 w-40 overflow-hidden rounded-[var(--nexus-radius-md)] border border-[var(--nexus-color-border)] bg-[var(--nexus-color-surface)] p-1 shadow-[var(--nexus-shadow-md)]" role="listbox">
                            {TICKET_STATUSES.map(status => {
                                const selected = ticket.status === status.value;
                                return (
                                    <button
                                        key={status.value}
                                        type="button"
                                        onMouseDown={event => event.preventDefault()}
                                        onClick={() => changeStatus(status.value)}
                                        className={`flex h-9 w-full items-center justify-between rounded-[var(--nexus-radius-sm)] px-3 text-left text-xs font-semibold transition
                      ${selected ? "bg-[var(--nexus-color-primary-soft)] text-[var(--nexus-color-primary-strong)]" : "text-[var(--nexus-color-secondary-strong)] hover:bg-[var(--nexus-color-surface-muted)]"}`}
                                        role="option"
                                        aria-selected={selected}
                                    >
                                        {status.label}
                                        {selected && <span className="h-1.5 w-1.5 rounded-full bg-[var(--nexus-color-primary)]" />}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
                <button
                    onClick={onClose}
                    className="text-[var(--nexus-color-subtle)] hover:text-[var(--nexus-color-secondary)] text-xl leading-none p-1 rounded-[var(--nexus-radius-sm)] hover:bg-[var(--nexus-color-secondary-soft)] transition"
                    aria-label="Close"
                >
                    ×
                </button>
            </div>
            <div ref={messagesContainerRef} className="flex-1 px-5 py-4 overflow-y-auto max-h-[calc(100vh-330px)] min-h-48 flex flex-col gap-4 bg-[var(--nexus-color-surface)]">
                {ticket.messages?.length === 0 && (
                    <EmptyState icon="💬" title="No messages yet" body="The customer has not sent any messages." />
                )}
                {ticket.messages?.map((msg, i) => (
                    <MessageBubble key={msg.id ?? i} msg={msg} customerName={ticket.customer_name} />
                ))}
            </div>

            <div className="border-t border-[var(--nexus-color-border)] px-5 py-4 bg-[var(--nexus-color-surface-muted)]">
                {error && (
                    <div className="mb-3 px-3 py-2 rounded-[var(--nexus-radius-md)] bg-[var(--nexus-color-danger-soft)] border border-[var(--nexus-color-danger-soft)] text-[var(--nexus-color-danger)] text-xs">
                        {error}
                    </div>
                )}
                <form onSubmit={submitReply} className="grid gap-2 sm:grid-cols-[1fr_118px] sm:items-stretch">
                    <textarea
                        value={reply}
                        onChange={e => setReply(e.target.value)}
                        placeholder="Write a reply…"
                        required
                        rows={2}
                        className="h-14 min-h-14 w-full px-3.5 py-2.5 rounded-[var(--nexus-radius-md)] border border-[var(--nexus-color-border-strong)] text-sm text-[var(--nexus-color-text)] placeholder-[var(--nexus-color-subtle)] outline-none resize-none leading-relaxed bg-[var(--nexus-color-surface)] shadow-[var(--nexus-shadow-sm)] focus:border-[var(--nexus-color-primary)] focus:ring-2 focus:ring-[var(--nexus-color-primary-soft)] transition"
                    />
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="h-14 min-h-14 w-full px-4 rounded-[var(--nexus-radius-md)] [background:var(--nexus-gradient-brand)] text-[var(--nexus-color-inverse)] text-sm font-bold hover:opacity-95 disabled:opacity-60 disabled:cursor-wait transition whitespace-nowrap shadow-[var(--nexus-shadow-sm)]"
                    >
                        {isSubmitting ? "Sending…" : "Send reply"}
                    </button>
                </form>
            </div>

        </div>
    );
}