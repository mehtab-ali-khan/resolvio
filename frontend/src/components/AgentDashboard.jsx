import { useEffect, useState } from "react";
import {
  createAgentReply,
  getTicket,
  listTickets,
  updateTicketStatus,
} from "../api/tickets.js";

const TICKET_STATUSES = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
];

const statusLabels = TICKET_STATUSES.reduce((labels, status) => {
  labels[status.value] = status.label;
  return labels;
}, {});


// ─── Status badge ───────────────────────────────────────────────────
function StatusBadge({ status }) {
  const styles = {
    open: "bg-[var(--nexus-color-accent-soft)] text-[var(--nexus-color-accent-strong)] ring-1 ring-[var(--nexus-color-accent-soft)]",
    in_progress: "bg-[var(--nexus-color-warning-soft)] text-[var(--nexus-color-warning)] ring-1 ring-[var(--nexus-color-warning-soft)]",
    resolved: "bg-[var(--nexus-color-success-soft)] text-[var(--nexus-color-success)] ring-1 ring-[var(--nexus-color-success-soft)]",
  };
  const dots = {
    open: "bg-[var(--nexus-color-accent)]",
    in_progress: "bg-[var(--nexus-color-warning)]",
    resolved: "bg-[var(--nexus-color-success)]",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${styles[status] ?? styles.open}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dots[status] ?? dots.open}`} />
      {statusLabels[status] ?? status}
    </span>
  );
}


// ─── Avatar ─────────────────────────────────────────────────────────
function Avatar({ name, size = "md" }) {
  const initials = name?.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() ?? "?";
  const sizeClass = size === "sm" ? "w-8 h-8 text-xs" : size === "lg" ? "w-11 h-11 text-base" : "w-9 h-9 text-sm";
  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-bold text-[var(--nexus-color-inverse)] flex-shrink-0 select-none [background:var(--nexus-gradient-avatar)] ring-2 ring-[var(--nexus-color-primary-soft)]`}
    >
      {initials}
    </div>
  );
}


// ─── Stat card ──────────────────────────────────────────────────────
function StatCard({ label, value, accentClass }) {
  return (
    <div className={`bg-[var(--nexus-color-surface)] rounded-[var(--nexus-radius-lg)] border border-[var(--nexus-color-border)] p-5 border-t-2 shadow-[var(--nexus-shadow-sm)] ${accentClass}`}>
      <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--nexus-color-subtle)] mb-2">{label}</p>
      <p className="text-3xl font-bold text-[var(--nexus-color-text)] leading-none">{value}</p>
    </div>
  );
}


// ─── Empty state ─────────────────────────────────────────────────────
function EmptyState({ icon, title, body }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <span className="text-4xl mb-3">{icon}</span>
      <p className="font-semibold text-[var(--nexus-color-muted)] text-sm mb-1">{title}</p>
      <p className="text-[var(--nexus-color-subtle)] text-xs leading-relaxed max-w-48">{body}</p>
    </div>
  );
}


// ─── Main dashboard ──────────────────────────────────────────────────
export function AgentDashboard() {
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [search, setSearch] = useState("");

  async function loadTickets() {
    setError("");
    setIsLoading(true);
    try {
      const loaded = await listTickets();
      setTickets(loaded);
    } catch (e) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function selectTicket(id) {
    setError("");
    setIsDetailLoading(true);
    try {
      const detail = await getTicket(id);
      setSelectedTicket(detail);
    } catch (e) {
      setError(e.message);
    } finally {
      setIsDetailLoading(false);
    }
  }

  function handleTicketStatusUpdated(ticketId, status) {
    setTickets(currentTickets =>
      currentTickets.map(ticket =>
        ticket.id === ticketId ? { ...ticket, status } : ticket
      )
    );
    setSelectedTicket(currentTicket =>
      currentTicket?.id === ticketId ? { ...currentTicket, status } : currentTicket
    );
  }

  useEffect(() => { loadTickets(); }, []);

  const openCount = tickets.filter(t => t.status === "open").length;
  const inProgressCount = tickets.filter(t => t.status === "in_progress").length;
  const resolvedCount = tickets.filter(t => t.status === "resolved").length;

  const filtered = tickets.filter(t =>
    t.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.customer_email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[var(--nexus-color-bg)]">

      {/* ── Navbar ── */}
      <nav className="[background:var(--nexus-gradient-header)] sticky top-0 z-10 flex items-center justify-between px-6 h-14 shadow-[var(--nexus-shadow-sm)] border-b border-[var(--nexus-color-header-border)]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-[var(--nexus-radius-sm)] [background:var(--nexus-gradient-brand)] flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="var(--nexus-color-inverse)" />
            </svg>
          </div>
          <span className="text-[var(--nexus-color-header-text)] font-bold text-[15px] tracking-tight">Nexus Support</span>
        </div>
        <span className="text-xs font-bold uppercase tracking-widest text-[var(--nexus-color-inverse)] bg-[var(--nexus-color-header-pill)] px-3 py-1 rounded-full">
          Agent
        </span>
      </nav>

      {/* ── Body ── */}
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-7">

        {/* ── Page header ── */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--nexus-color-primary)] mb-1">Support Desk</p>
            <h1 className="text-2xl font-bold text-[var(--nexus-color-text)] tracking-tight">Agent Dashboard</h1>
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

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard label="Total" value={tickets.length} accentClass="border-t-[var(--nexus-color-secondary)]" />
          <StatCard label="Open" value={openCount} accentClass="border-t-[var(--nexus-color-accent)]" />
          <StatCard label="In progress" value={inProgressCount} accentClass="border-t-[var(--nexus-color-warning)]" />
          <StatCard label="Resolved" value={resolvedCount} accentClass="border-t-[var(--nexus-color-success)]" />
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="mb-5 px-4 py-3 rounded-[var(--nexus-radius-md)] bg-[var(--nexus-color-danger-soft)] border border-[var(--nexus-color-danger-soft)] text-[var(--nexus-color-danger)] text-sm">
            {error}
          </div>
        )}

        {/* ── Main grid ── */}
        <div className={`grid gap-4 items-start ${selectedTicket || isDetailLoading ? "lg:grid-cols-[1fr_1.1fr]" : "grid-cols-1"}`}>

          {/* ── Ticket list panel ── */}
          <div className="bg-[var(--nexus-color-surface)] rounded-[var(--nexus-radius-xl)] border border-[var(--nexus-color-border)] shadow-[var(--nexus-shadow-sm)] overflow-hidden">

            {/* Search */}
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

            {/* List */}
            <div className="overflow-y-auto max-h-[calc(100vh-280px)]">
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
                        <span className="font-semibold text-sm text-[var(--nexus-color-text)] truncate">{ticket.customer_name}</span>
                        <StatusBadge status={ticket.status} />
                      </div>
                      <p className="text-xs text-[var(--nexus-color-muted)] truncate">{ticket.customer_email}</p>
                      <p className="text-[11px] text-[var(--nexus-color-subtle)] mt-0.5">{new Date(ticket.created_at).toLocaleString()}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Ticket detail panel ── */}
          {(selectedTicket || isDetailLoading) && (
            <TicketDetail
              ticket={selectedTicket}
              isLoading={isDetailLoading}
              onReplyCreated={selectTicket}
              onStatusUpdated={handleTicketStatusUpdated}
              onClose={() => setSelectedTicket(null)}
            />
          )}

        </div>
      </div>
    </div>
  );
}


// ─── Ticket detail ───────────────────────────────────────────────────
function TicketDetail({ ticket, isLoading, onReplyCreated, onStatusUpdated, onClose }) {
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStatusSubmitting, setIsStatusSubmitting] = useState(false);
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);

  async function submitReply(e) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await createAgentReply(ticket.id, { message: reply });
      setReply("");
      onReplyCreated(ticket.id);
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
    <div className="bg-[var(--nexus-color-surface)] rounded-[var(--nexus-radius-xl)] border border-[var(--nexus-color-border)] shadow-[var(--nexus-shadow-sm)] overflow-hidden flex flex-col">

      {/* Header */}
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
          <svg
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--nexus-color-primary)]"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
          {isStatusMenuOpen && (
            <div
              className="absolute right-0 top-11 z-20 w-40 overflow-hidden rounded-[var(--nexus-radius-md)] border border-[var(--nexus-color-border)] bg-[var(--nexus-color-surface)] p-1 shadow-[var(--nexus-shadow-md)]"
              role="listbox"
            >
              {TICKET_STATUSES.map(status => {
                const selected = ticket.status === status.value;
                return (
                  <button
                    key={status.value}
                    type="button"
                    onMouseDown={event => event.preventDefault()}
                    onClick={() => changeStatus(status.value)}
                    className={`flex h-9 w-full items-center justify-between rounded-[var(--nexus-radius-sm)] px-3 text-left text-xs font-semibold transition
                      ${selected
                        ? "bg-[var(--nexus-color-primary-soft)] text-[var(--nexus-color-primary-strong)]"
                        : "text-[var(--nexus-color-secondary-strong)] hover:bg-[var(--nexus-color-surface-muted)]"
                      }`}
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

      {/* Messages */}
      <div className="flex-1 px-5 py-5 overflow-y-auto max-h-[calc(100vh-410px)] min-h-48 flex flex-col gap-4 bg-[var(--nexus-color-surface)]">
        {ticket.messages?.length === 0 && (
          <EmptyState icon="💬" title="No messages yet" body="The customer has not sent any messages." />
        )}

        {ticket.messages?.map((msg, i) => {
          const isAgent = msg.sender_type === "agent";
          return (
            <div key={msg.id ?? i} className={`flex flex-col gap-1 ${isAgent ? "items-end" : "items-start"}`}>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-1 ${isAgent ? "text-[var(--nexus-message-agent-label)]" : "text-[var(--nexus-message-customer-label)]"}`}>
                {isAgent ? "You (agent)" : ticket.customer_name}
              </span>
              <div className={`max-w-[82%] px-4 py-3 text-sm leading-relaxed shadow-[var(--nexus-shadow-sm)]
                ${isAgent
                  ? "bg-[var(--nexus-message-agent-bg)] text-[var(--nexus-message-agent-text)] rounded-[var(--nexus-radius-lg)] rounded-tr-sm border border-[var(--nexus-color-primary-soft)]"
                  : "bg-[var(--nexus-message-customer-bg)] text-[var(--nexus-message-customer-text)] rounded-[var(--nexus-radius-lg)] rounded-tl-sm border border-[var(--nexus-message-customer-border)]"
                }`}
              >
                {msg.body}
              </div>
              <span className="text-[10px] text-[var(--nexus-color-subtle)] px-1">
                {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          );
        })}
      </div>

      {/* Reply form */}
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
