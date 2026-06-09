import { useEffect, useState } from "react";

import {
  createCustomerMessage,
  createTicket,
  getTicket,
} from "../api/tickets.js";


const initialForm = {
  customer_name: "",
  customer_email: "",
  message: "",
};

const storageKey = "nexus_support_ticket_id";


export function ChatWidget() {
  const [form, setForm] = useState(initialForm);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [ticketId, setTicketId] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoadingTicket, setIsLoadingTicket] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);

  async function loadTicket(savedTicketId) {
    setError("");
    setIsLoadingTicket(true);

    try {
      const ticket = await getTicket(savedTicketId);
      setTicketId(ticket.id);
      setMessages(ticket.messages);
    } catch (apiError) {
      localStorage.removeItem(storageKey);
      setError("Previous conversation could not be loaded.");
    } finally {
      setIsLoadingTicket(false);
    }
  }

  function updateField(event) {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  }

  async function submitTicket(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const createdTicket = await createTicket(form);
      setTicketId(createdTicket.ticket_id);
      localStorage.setItem(storageKey, createdTicket.ticket_id);
      setMessages([
        {
          body: form.message,
          sender_type: "customer",
        },
      ]);
      setForm(initialForm);
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitMessage(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const createdMessage = await createCustomerMessage(ticketId, {
        message: newMessage,
      });
      setMessages([...messages, createdMessage]);
      setNewMessage("");
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function startNewComplaint() {
    localStorage.removeItem(storageKey);
    setTicketId(null);
    setMessages([]);
    setNewMessage("");
    setError("");
    setForm(initialForm);
  }

  useEffect(() => {
    const savedTicketId = localStorage.getItem(storageKey);

    if (savedTicketId) {
      loadTicket(savedTicketId);
      return;
    }

    setIsLoadingTicket(false);
  }, []);

  if (!isOpen) {
    return (
      <button
        className="fixed bottom-6 right-6 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white shadow-2xl hover:bg-blue-700"
        type="button"
        onClick={() => {
          setIsOpen(true);
          setIsMinimized(false);
        }}
      >
        Chat
      </button>
    );
  }

  return (
    <aside className="fixed bottom-6 right-6 w-[min(360px,calc(100vw-32px))] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl">
      <div className="flex items-center justify-between bg-slate-900 px-4 py-3.5 text-white">
        <strong>Support</strong>
        <div className="flex items-center gap-2">
          <button
            className="text-lg leading-none text-slate-300 hover:text-white"
            type="button"
            onClick={() => setIsMinimized((value) => !value)}
            aria-label="Minimize chat"
          >
            _
          </button>
          <button
            className="text-lg leading-none text-slate-300 hover:text-white"
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Close chat"
          >
            x
          </button>
        </div>
      </div>

      {isMinimized && (
        <div className="border-t border-slate-200 px-4 py-4">
          <p className="text-sm text-slate-600">
            Need help? Open the chat to continue your conversation.
          </p>
        </div>
      )}

      {isLoadingTicket && (
        <p className="p-4 text-sm text-slate-600">Loading conversation...</p>
      )}

      {!isLoadingTicket && !ticketId && !isMinimized && (
        <form className="grid gap-3 p-4" onSubmit={submitTicket}>
          <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
            Name
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-blue-600"
              name="customer_name"
              value={form.customer_name}
              onChange={updateField}
              placeholder="Ali Khan"
              required
            />
          </label>

          <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
            Email
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-blue-600"
              name="customer_email"
              type="email"
              value={form.customer_email}
              onChange={updateField}
              placeholder="ali@example.com"
              required
            />
          </label>

          <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
            Complaint
            <textarea
              className="min-h-24 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-blue-600"
              name="message"
              value={form.message}
              onChange={updateField}
              placeholder="How can we help?"
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
            {isSubmitting ? "Sending..." : "Send complaint"}
          </button>
        </form>
      )}

      {!isLoadingTicket && ticketId && !isMinimized && (
        <div className="grid gap-3 p-4">
          <div className="flex items-center justify-between gap-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            <span>Ticket #{ticketId} conversation</span>
            <button
              className="font-bold text-emerald-800"
              type="button"
              onClick={startNewComplaint}
            >
              New complaint
            </button>
          </div>

          <button
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            type="button"
            onClick={() => loadTicket(ticketId)}
          >
            Refresh conversation
          </button>

          <div className="grid max-h-52 gap-2 overflow-y-auto">
            {messages.map((message, index) => (
              <article
                className="rounded-md bg-slate-50 p-3 text-sm text-slate-800"
                key={`${message.sender_type}-${index}`}
              >
                <p className="mb-1 text-xs font-bold uppercase text-blue-700">
                  {message.sender_type}
                </p>
                <p>{message.body}</p>
              </article>
            ))}
          </div>

          <form className="grid gap-3" onSubmit={submitMessage}>
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
              Add message
              <textarea
                className="min-h-20 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-blue-600"
                value={newMessage}
                onChange={(event) => setNewMessage(event.target.value)}
                placeholder="Add more details..."
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
              {isSubmitting ? "Sending..." : "Send message"}
            </button>
          </form>
        </div>
      )}
    </aside>
  );
}
