import { useState } from "react";

import { createTicket } from "../api/tickets.js";


const initialForm = {
  customer_name: "",
  customer_email: "",
  message: "",
};


export function ChatWidget() {
  const [form, setForm] = useState(initialForm);
  const [ticket, setTicket] = useState(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      setTicket(createdTicket);
      setForm(initialForm);
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <aside className="fixed bottom-6 right-6 w-[min(360px,calc(100vw-32px))] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl">
      <div className="flex items-center justify-between bg-slate-900 px-4 py-3.5 text-white">
        <strong>Support</strong>
        <span className="text-sm text-emerald-300">Online</span>
      </div>

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
        {ticket && (
          <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Ticket #{ticket.ticket_id} created.
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
    </aside>
  );
}
