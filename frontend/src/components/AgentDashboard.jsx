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
    open: "bg-blue-50 text-blue-600 ring-1 ring-blue-200",
    in_progress: "bg-amber-50 text-amber-600 ring-1 ring-amber-200",
    resolved: "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200",
  };
  const dots = {
    open: "bg-blue-500",
    in_progress: "bg-amber-500",
    resolved: "bg-emerald-500",
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
  const hue = (name?.charCodeAt(0) ?? 0) * 37 % 360;
  const sizeClass = size === "sm" ? "w-8 h-8 text-xs" : size === "lg" ? "w-11 h-11 text-base" : "w-9 h-9 text-sm";
  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 select-none`}
      style={{ background: `hsl(${hue},55%,50%)` }}
    >
      {initials}
    </div>
  );
}


// ─── Stat card ──────────────────────────────────────────────────────
function StatCard({ label, value, accentClass }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 p-5 border-t-2 ${accentClass}`}>
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">{label}</p>
      <p className="text-3xl font-bold text-slate-900 leading-none">{value}</p>
    </div>
  );
}


// ─── Empty state ─────────────────────────────────────────────────────
function EmptyState({ icon, title, body }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <span className="text-4xl mb-3">{icon}</span>
      <p className="font-semibold text-slate-600 text-sm mb-1">{title}</p>
      <p className="text-slate-400 text-xs leading-relaxed max-w-48">{body}</p>
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
    <div className="min-h-screen bg-slate-50">

      {/* ── Navbar ── */}
      <nav className="bg-slate-950 sticky top-0 z-10 flex items-center justify-between px-6 h-14">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="white" />
            </svg>
          </div>
          <span className="text-white font-bold text-[15px] tracking-tight">Nexus Support</span>
        </div>
        <span className="text-xs font-bold uppercase tracking-widest text-blue-400 bg-blue-950 px-3 py-1 rounded-full">
          Agent
        </span>
      </nav>

      {/* ── Body ── */}
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-7">

        {/* ── Page header ── */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-blue-600 mb-1">Support Desk</p>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Agent Dashboard</h1>
            <p className="text-sm text-slate-500 mt-0.5">Review complaints and reply from only one place.</p>
          </div>
          <button
            onClick={loadTickets}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold shadow-sm hover:bg-slate-50 transition disabled:opacity-60 disabled:cursor-wait"
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
          <StatCard label="Total" value={tickets.length} accentClass="border-t-indigo-500" />
          <StatCard label="Open" value={openCount} accentClass="border-t-blue-500" />
          <StatCard label="In progress" value={inProgressCount} accentClass="border-t-amber-500" />
          <StatCard label="Resolved" value={resolvedCount} accentClass="border-t-emerald-500" />
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="mb-5 px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
            {error}
          </div>
        )}

        {/* ── Main grid ── */}
        <div className={`grid gap-4 items-start ${selectedTicket || isDetailLoading ? "lg:grid-cols-[1fr_1.1fr]" : "grid-cols-1"}`}>

          {/* ── Ticket list panel ── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

            {/* Search */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or email…"
                className="flex-1 text-sm text-slate-900 placeholder-slate-400 bg-transparent outline-none"
              />
              {search && (
                <button onClick={() => setSearch("")} className="text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
              )}
            </div>

            {/* List */}
            <div className="overflow-y-auto max-h-[calc(100vh-280px)]">
              {isLoading && (
                <div className="py-10 text-center text-slate-400 text-sm">Loading tickets…</div>
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
                      ${i < filtered.length - 1 ? "border-b border-slate-100" : ""}
                      ${active ? "bg-blue-50 border-l-blue-500" : "hover:bg-slate-50 border-l-transparent"}
                    `}
                  >
                    <Avatar name={ticket.customer_name} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="font-semibold text-sm text-slate-900 truncate">{ticket.customer_name}</span>
                        <StatusBadge status={ticket.status} />
                      </div>
                      <p className="text-xs text-slate-500 truncate">{ticket.customer_email}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{new Date(ticket.created_at).toLocaleString()}</p>
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

  async function changeStatus(e) {
    const nextStatus = e.target.value;
    setError("");
    setIsStatusSubmitting(true);
    try {
      const updatedTicket = await updateTicketStatus(ticket.id, nextStatus);
      onStatusUpdated(ticket.id, updatedTicket.status);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsStatusSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <EmptyState icon="⏳" title="Loading conversation…" body="Please wait." />
      </div>
    );
  }

  if (!ticket) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">

      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
        <Avatar name={ticket.customer_name} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h2 className="font-bold text-slate-900 text-[15px] truncate">{ticket.customer_name}</h2>
            <StatusBadge status={ticket.status} />
          </div>
          <p className="text-xs text-slate-500 truncate">{ticket.customer_email} · Ticket #{ticket.id}</p>
        </div>
        <label className="sr-only" htmlFor={`ticket-status-${ticket.id}`}>Ticket status</label>
        <select
          id={`ticket-status-${ticket.id}`}
          value={ticket.status}
          onChange={changeStatus}
          disabled={isStatusSubmitting}
          className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60 disabled:cursor-wait"
        >
          {TICKET_STATUSES.map(status => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 text-xl leading-none p-1 rounded-lg hover:bg-slate-100 transition"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 px-5 py-4 overflow-y-auto max-h-[calc(100vh-420px)] flex flex-col gap-3">
        {ticket.messages?.length === 0 && (
          <EmptyState icon="💬" title="No messages yet" body="The customer has not sent any messages." />
        )}

        {ticket.messages?.map((msg, i) => {
          const isAgent = msg.sender_type === "agent";
          return (
            <div key={msg.id ?? i} className={`flex flex-col gap-1 ${isAgent ? "items-end" : "items-start"}`}>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-1 ${isAgent ? "text-blue-600" : "text-slate-500"}`}>
                {isAgent ? "You (agent)" : ticket.customer_name}
              </span>
              <div className={`max-w-[82%] px-3.5 py-2.5 text-sm leading-relaxed
                ${isAgent
                  ? "bg-slate-900 text-slate-100 rounded-2xl rounded-tr-sm"
                  : "bg-slate-100 text-slate-800 rounded-2xl rounded-tl-sm"
                }`}
              >
                {msg.body}
              </div>
              <span className="text-[10px] text-slate-400 px-1">
                {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          );
        })}
      </div>

      {/* Reply form */}
      <div className="border-t border-slate-100 px-5 py-4">
        {error && (
          <div className="mb-3 px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {error}
          </div>
        )}
        <form onSubmit={submitReply} className="flex gap-2 items-end">
          <textarea
            value={reply}
            onChange={e => setReply(e.target.value)}
            placeholder="Write a reply…"
            required
            rows={3}
            className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 outline-none resize-none leading-relaxed bg-slate-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 disabled:cursor-wait transition whitespace-nowrap h-fit"
          >
            {isSubmitting ? "Sending…" : "Send reply"}
          </button>
        </form>
      </div>

    </div>
  );
}
