import { useEffect, useState } from "react";

import {
  createAgentReply,
  getTicket,
  listTickets,
} from "../api/tickets.js";


export function AgentDashboard() {
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  async function loadTickets() {
    setError("");
    setIsLoading(true);

    try {
      const loadedTickets = await listTickets();
      setTickets(loadedTickets);
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function selectTicket(ticketId) {
    setError("");
    setIsDetailLoading(true);

    try {
      const ticketDetail = await getTicket(ticketId);
      setSelectedTicket(ticketDetail);
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setIsDetailLoading(false);
    }
  }

  useEffect(() => {
    loadTickets();
  }, []);

  const openTicketCount = tickets.filter((ticket) => ticket.status === "open").length;

  return (
    <section className="mx-auto grid min-h-screen max-w-7xl gap-6 px-4 py-6 sm:px-8 sm:py-8">
      <header className="rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm backdrop-blur sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-blue-600">
              Support Desk
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-[2.15rem]">
              Agent Dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              Review incoming customer complaints, open a ticket, and reply from
              one calm workspace.
            </p>
          </div>

          <button
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50"
            type="button"
            onClick={loadTickets}
            disabled={isLoading}
          >
            Refresh
          </button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryItem label="Total tickets" value={tickets.length} />
        <SummaryItem label="Open tickets" value={openTicketCount} />
        <SummaryItem
          label="Selected ticket"
          value={selectedTicket ? `#${selectedTicket.id}` : "-"}
        />
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white/85 p-5 shadow-sm backdrop-blur">
        {isLoading && <p className="text-slate-600">Loading tickets...</p>}

        {error && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}

        {!isLoading && !error && tickets.length === 0 && (
          <p className="py-6 text-center text-slate-600">No tickets yet.</p>
        )}

        {!isLoading && !error && tickets.length > 0 && (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(380px,1fr)]">
            <div className="grid gap-3">
              {tickets.map((ticket) => (
                <button
                  className={`rounded-2xl border p-4 text-left transition ${
                    selectedTicket?.id === ticket.id
                      ? "border-blue-400 bg-blue-50 shadow-sm"
                      : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50"
                  }`}
                  key={ticket.id}
                  type="button"
                  onClick={() => selectTicket(ticket.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-slate-950">
                        {ticket.customer_name}
                      </h3>
                      <p className="text-sm text-slate-600">
                        {ticket.customer_email}
                      </p>
                    </div>

                    <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-blue-700">
                      {ticket.status}
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-slate-500">
                    Created {new Date(ticket.created_at).toLocaleString()}
                  </p>
                </button>
              ))}
            </div>

            <TicketDetail
              isLoading={isDetailLoading}
              onReplyCreated={selectTicket}
              ticket={selectedTicket}
            />
          </div>
        )}
      </div>
    </section>
  );
}


function SummaryItem({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/85 p-4 shadow-sm backdrop-blur">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
        {value}
      </p>
    </div>
  );
}


function TicketDetail({ isLoading, onReplyCreated, ticket }) {
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitReply(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await createAgentReply(ticket.id, { message: reply });
      setReply("");
      onReplyCreated(ticket.id);
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 p-4 text-slate-600">
        Loading conversation...
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-slate-600">
        Select a ticket to view the conversation.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm">
      <div className="border-b border-slate-200 pb-3">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
          Ticket #{ticket.id}
        </p>
        <h3 className="mt-1 text-lg font-semibold text-slate-950">
          {ticket.customer_name}
        </h3>
        <p className="text-sm text-slate-600">{ticket.customer_email}</p>
      </div>

      <div className="mt-4 grid gap-3">
        {ticket.messages.map((message) => (
          <article
            className={`rounded-2xl p-3 ${
              message.sender_type === "agent"
                ? "ml-6 border border-blue-100 bg-blue-50"
                : "mr-6 border border-slate-200 bg-white"
            }`}
            key={message.id}
          >
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-blue-700">
              {message.sender_type}
            </p>
            <p className="text-sm text-slate-800">{message.body}</p>
            <p className="mt-2 text-xs text-slate-500">
              {new Date(message.created_at).toLocaleString()}
            </p>
          </article>
        ))}
      </div>

      <form className="mt-4 grid gap-3 rounded-2xl bg-white p-3" onSubmit={submitReply}>
        <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
          Agent reply
          <textarea
            className="min-h-24 w-full resize-y rounded-xl border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            value={reply}
            onChange={(event) => setReply(event.target.value)}
            placeholder="Write a reply..."
            required
          />
        </label>

        {error && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}

        <button
          className="rounded-xl bg-slate-950 px-3.5 py-2.5 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-wait disabled:opacity-70"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Sending..." : "Send reply"}
        </button>
      </form>
    </div>
  );
}
