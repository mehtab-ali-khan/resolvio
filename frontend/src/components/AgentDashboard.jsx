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

  return (
    <section className="mt-12 max-w-4xl rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase text-blue-600">
            Agent Dashboard
          </p>
          <h2 className="text-2xl font-bold">Incoming Tickets</h2>
        </div>

        <button
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          type="button"
          onClick={loadTickets}
          disabled={isLoading}
        >
          Refresh
        </button>
      </div>

      {isLoading && <p className="text-slate-600">Loading tickets...</p>}

      {error && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}

      {!isLoading && !error && tickets.length === 0 && (
        <p className="text-slate-600">No tickets yet.</p>
      )}

      {!isLoading && !error && tickets.length > 0 && (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
          <div className="grid gap-3">
          {tickets.map((ticket) => (
            <button
              className="rounded-md border border-slate-200 p-4 text-left hover:border-blue-300 hover:bg-blue-50"
              key={ticket.id}
              type="button"
              onClick={() => selectTicket(ticket.id)}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-bold">{ticket.customer_name}</h3>
                  <p className="text-sm text-slate-600">
                    {ticket.customer_email}
                  </p>
                </div>

                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold uppercase text-blue-700">
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
    </section>
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
      <div className="rounded-md border border-slate-200 p-4 text-slate-600">
        Loading conversation...
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 p-4 text-slate-600">
        Select a ticket to view the conversation.
      </div>
    );
  }

  return (
    <div className="rounded-md border border-slate-200 p-4">
      <div className="border-b border-slate-200 pb-3">
        <h3 className="font-bold">Ticket #{ticket.id}</h3>
        <p className="text-sm text-slate-600">{ticket.customer_email}</p>
      </div>

      <div className="mt-4 grid gap-3">
        {ticket.messages.map((message) => (
          <article
            className="rounded-md bg-slate-50 p-3"
            key={message.id}
          >
            <p className="mb-1 text-xs font-bold uppercase text-blue-700">
              {message.sender_type}
            </p>
            <p className="text-sm text-slate-800">{message.body}</p>
            <p className="mt-2 text-xs text-slate-500">
              {new Date(message.created_at).toLocaleString()}
            </p>
          </article>
        ))}
      </div>

      <form className="mt-4 grid gap-3" onSubmit={submitReply}>
        <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
          Agent reply
          <textarea
            className="min-h-24 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-blue-600"
            value={reply}
            onChange={(event) => setReply(event.target.value)}
            placeholder="Write a reply..."
            required
          />
        </label>

        {error && (
          <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}

        <button
          className="rounded-md bg-blue-600 px-3.5 py-2.5 font-bold text-white disabled:cursor-wait disabled:opacity-70"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Sending..." : "Send reply"}
        </button>
      </form>
    </div>
  );
}
