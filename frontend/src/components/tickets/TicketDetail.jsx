// frontend/src/components/tickets/TicketDetail.jsx

import { useEffect, useRef, useState } from "react";
import { createAgentReply, updateTicketStatus } from "../../api/tickets.js";
import { Avatar, EmptyState } from "../shared/ui.jsx";
import { StatusBadge, TICKET_STATUSES, statusLabels } from "./StatusBadge.jsx";

function MessageBubble({ msg, customerName }) {
    const isAgent = msg.sender_type === "agent";
    const isAi = msg.sender_type === "ai";
    const isInternalDraft = isAi && msg.is_internal;
    const fromTeam = isAgent || isAi;

    const label = isAgent
        ? "You (agent)"
        : isAi
            ? (isInternalDraft ? "AI draft — internal only" : "AI Assistant")
            : customerName;

    const costTitle = isAi && msg.cost != null ? `Cost: $${msg.cost}` : undefined;

    // Internal AI draft — dashed yellow border, agent eyes only
    if (isInternalDraft) {
        return (
            <div className="flex flex-col items-end gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--warning)] px-1">
                    {label}{msg.ai_confidence != null ? ` · ${Math.round(msg.ai_confidence)}% confident` : ""}
                </span>
                <div
                    title={costTitle}
                    className="max-w-[82%] px-4 py-3 text-sm leading-relaxed rounded-lg rounded-tr-sm border border-dashed border-[var(--warning)] bg-[var(--warning-soft)] text-[var(--s-mid)]"
                >
                    {msg.body}
                </div>
                <span className="text-[10px] text-[var(--g-500)] px-1">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
            </div>
        );
    }

    return (
        <div className={`flex flex-col gap-1 ${fromTeam ? "items-end" : "items-start"}`}>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-1 ${fromTeam ? "text-[var(--p)]" : "text-[var(--g-600)]"}`}>
                {label}
            </span>
            <div
                title={costTitle}
                className={`max-w-[82%] px-4 py-3 text-sm leading-relaxed
                    ${fromTeam
                        ? "bg-white border border-[var(--g-300)] rounded-lg rounded-tr-sm shadow-[var(--shadow-sm)]"
                        : "bg-[var(--g-200)] rounded-lg rounded-tl-sm text-[var(--s)]"
                    }`}
            >
                {msg.body}
            </div>
            <span className="text-[10px] text-[var(--g-500)] px-1">
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
    const textareaRef = useRef(null);

    useEffect(() => {
        const container = messagesContainerRef.current;
        if (container) container.scrollTop = container.scrollHeight;
    }, [ticket?.id, ticket?.messages?.length]);

    async function submitReply(e) {
        e.preventDefault();
        if (!reply.trim()) return;
        setError("");
        setIsSubmitting(true);
        try {
            await createAgentReply(ticket.id, { message: reply });
            setReply("");
            if (textareaRef.current) textareaRef.current.style.height = "auto";
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    }

    // Send on Enter, new line on Shift+Enter — same as chat widget
    function handleKeyDown(e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submitReply(e);
        }
    }

    function handleTextareaInput(e) {
        setReply(e.target.value);
        const ta = e.target;
        ta.style.height = "auto";
        ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
    }

    async function changeStatus(nextStatus) {
        if (nextStatus === ticket.status) {
            setIsStatusMenuOpen(false);
            return;
        }
        setError("");
        setIsStatusSubmitting(true);
        try {
            const updated = await updateTicketStatus(ticket.id, nextStatus);
            onStatusUpdated(ticket.id, updated.status);
            setIsStatusMenuOpen(false);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsStatusSubmitting(false);
        }
    }

    if (isLoading) {
        return (
            <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--g-300)] shadow-[var(--shadow-sm)] overflow-hidden">
                <EmptyState icon="⏳" title="Loading conversation…" body="Please wait." />
            </div>
        );
    }

    if (!ticket) return null;

    return (
        <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--g-300)] shadow-[var(--shadow-sm)] flex flex-col overflow-hidden">

            {/* ── Header ── */}
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[var(--g-300)] bg-[var(--g-100)]">
                <Avatar name={ticket.customer_name} size="md" />

                {/* Name + email */}
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[var(--s)] text-sm truncate">
                        {ticket.customer_name}
                    </p>
                    <p className="text-xs text-[var(--g-600)] truncate">
                        {ticket.customer_email}
                    </p>
                </div>

                {/* Status dropdown — shows current status as the button label */}
                <div
                    className="relative flex-shrink-0"
                    onBlur={e => {
                        if (!e.currentTarget.contains(e.relatedTarget)) {
                            setIsStatusMenuOpen(false);
                        }
                    }}
                >
                    <button
                        type="button"
                        onClick={() => setIsStatusMenuOpen(v => !v)}
                        disabled={isStatusSubmitting}
                        className="h-8 px-3 rounded-[var(--radius-md)] border border-[var(--g-300)] bg-white text-xs font-semibold text-[var(--s-mid)] hover:border-[var(--p)] hover:text-[var(--p)] transition disabled:opacity-50 disabled:cursor-wait flex items-center gap-1.5"
                    >
                        {statusLabels[ticket.status] ?? ticket.status}
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="m6 9 6 6 6-6" />
                        </svg>
                    </button>

                    {isStatusMenuOpen && (
                        <div className="absolute right-0 top-10 z-20 w-36 overflow-hidden rounded-[var(--radius-md)] border border-[var(--g-300)] bg-white p-1 shadow-[var(--shadow-md)]" role="listbox">
                            {TICKET_STATUSES.map(s => {
                                const active = ticket.status === s.value;
                                return (
                                    <button
                                        key={s.value}
                                        type="button"
                                        onMouseDown={e => e.preventDefault()}
                                        onClick={() => changeStatus(s.value)}
                                        className={`flex h-8 w-full items-center justify-between rounded-[var(--radius-sm)] px-3 text-xs font-semibold transition
                                ${active
                                                ? "bg-[var(--p-soft)] text-[var(--p)]"
                                                : "text-[var(--s-mid)] hover:bg-[var(--g-200)]"
                                            }`}
                                        role="option"
                                        aria-selected={active}
                                    >
                                        {s.label}
                                        {active && <span className="w-1.5 h-1.5 rounded-full bg-[var(--p)]" />}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Close button */}
                <button
                    onClick={onClose}
                    className="text-[var(--g-500)] hover:text-[var(--s)] text-xl leading-none p-1 rounded-[var(--radius-sm)] hover:bg-[var(--g-200)] transition"
                    aria-label="Close"
                >
                    ×
                </button>
            </div>
            {/* ── Messages ── */}
            <div
                ref={messagesContainerRef}
                className="flex-1 px-5 py-4 overflow-y-auto max-h-[calc(100vh-320px)] min-h-48 flex flex-col gap-3 bg-[var(--g-100)]"
            >
                {ticket.messages?.length === 0 && (
                    <EmptyState icon="💬" title="No messages yet" body="The customer has not sent any messages." />
                )}
                {ticket.messages?.map((msg, i) => (
                    <MessageBubble key={msg.id ?? i} msg={msg} customerName={ticket.customer_name} />
                ))}
            </div>

            {/* ── Reply box ── */}
            <div className="border-t border-[var(--g-300)] px-4 py-3 bg-white">
                {error && (
                    <p className="text-xs text-[var(--danger)] mb-2">{error}</p>
                )}

                {/* Combined input + send button in one box — same as chat widget */}
                <div className="flex items-end gap-2 px-3 py-2 rounded-[var(--radius-lg)] border border-[var(--g-300)] bg-[var(--g-100)] focus-within:border-[var(--p)] transition">
                    <textarea
                        ref={textareaRef}
                        value={reply}
                        onChange={handleTextareaInput}
                        onKeyDown={handleKeyDown}
                        placeholder="Write a reply…"
                        rows={1}
                        className="flex-1 bg-transparent border-none outline-none resize-none text-sm text-[var(--s)] placeholder-[var(--g-500)] leading-relaxed max-h-[120px] overflow-y-auto py-1 font-[inherit]"
                    />

                    {/* Send button — gradient, same as chat widget */}
                    <button
                        type="button"
                        onClick={submitReply}
                        disabled={isSubmitting || !reply.trim()}
                        aria-label="Send reply"
                        className="w-8 h-8 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0 transition disabled:opacity-40 disabled:cursor-default"
                        style={{
                            background: reply.trim()
                                ? "var(--gradient)"
                                : "var(--g-300)",
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                            <line x1="22" y1="2" x2="11" y2="13" />
                            <polygon points="22 2 15 22 11 13 2 9 22 2" />
                        </svg>
                    </button>
                </div>
            </div>

        </div>
    );
}