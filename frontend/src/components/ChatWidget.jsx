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

// Inline styles for animations — works in any website
const styles = `
  @keyframes nexus-slide-up {
    from { opacity: 0; transform: translateY(20px) scale(0.95); }
    to   { opacity: 1; transform: translateY(0)    scale(1);    }
  }
  @keyframes nexus-fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes nexus-bounce-in {
    0%   { opacity: 0; transform: scale(0.5);  }
    70%  { transform: scale(1.08); }
    100% { opacity: 1; transform: scale(1);    }
  }
  @keyframes nexus-pulse-ring {
    0%   { box-shadow: 0 0 0 0 rgba(37,99,235,0.4); }
    70%  { box-shadow: 0 0 0 10px rgba(37,99,235,0); }
    100% { box-shadow: 0 0 0 0 rgba(37,99,235,0);   }
  }
  @keyframes nexus-message-in {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0);   }
  }
  @keyframes nexus-dot-bounce {
    0%, 80%, 100% { transform: translateY(0); }
    40%           { transform: translateY(-6px); }
  }

  #nexus-support-widget-root * {
    box-sizing: border-box;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }

  .nexus-widget-open {
    animation: nexus-slide-up 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  }
  .nexus-bubble {
    animation: nexus-bounce-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  }
  .nexus-bubble:hover {
    animation: nexus-pulse-ring 1.5s ease infinite;
    transform: scale(1.08) !important;
  }
  .nexus-message {
    animation: nexus-message-in 0.25s ease forwards;
  }
  .nexus-dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #94a3b8;
    animation: nexus-dot-bounce 1.2s ease infinite;
  }
  .nexus-dot:nth-child(2) { animation-delay: 0.2s; }
  .nexus-dot:nth-child(3) { animation-delay: 0.4s; }
`;

function injectGlobalStyles() {
  if (document.getElementById("nexus-styles")) return;
  const tag = document.createElement("style");
  tag.id = "nexus-styles";
  tag.textContent = styles;
  document.head.appendChild(tag);
}

export function ChatWidget() {
  const [form, setForm] = useState(initialForm);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [ticketId, setTicketId] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoadingTicket, setIsLoadingTicket] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    injectGlobalStyles();
    const savedTicketId = localStorage.getItem(storageKey);
    if (savedTicketId) {
      loadTicket(savedTicketId);
      return;
    }
    setIsLoadingTicket(false);
  }, []);

  // Clear unread when opened
  useEffect(() => {
    if (isOpen) setUnread(0);
  }, [isOpen]);

  async function loadTicket(savedTicketId) {
    setError("");
    setIsLoadingTicket(true);
    try {
      const ticket = await getTicket(savedTicketId);
      setTicketId(ticket.id);
      setMessages(ticket.messages);
    } catch {
      localStorage.removeItem(storageKey);
      setError("Previous conversation could not be loaded.");
    } finally {
      setIsLoadingTicket(false);
    }
  }

  function updateField(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function submitTicket(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const createdTicket = await createTicket(form);
      setTicketId(createdTicket.ticket_id);
      localStorage.setItem(storageKey, createdTicket.ticket_id);
      setMessages([{ body: form.message, sender_type: "customer" }]);
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

  // ─── Chat bubble (closed state) ────────────────────────────────
  if (!isOpen) {
    return (
      <button
        className="nexus-bubble"
        type="button"
        onClick={() => { setIsOpen(true); setIsMinimized(false); }}
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #2563eb, #4f46e5)",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 8px 32px rgba(37,99,235,0.4)",
          transition: "transform 0.2s ease",
          zIndex: 999999,
        }}
        aria-label="Open support chat"
      >
        {/* Chat icon */}
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <path
            d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
            fill="white"
          />
        </svg>

        {/* Unread badge */}
        {unread > 0 && (
          <span style={{
            position: "absolute",
            top: "-4px",
            right: "-4px",
            width: "20px",
            height: "20px",
            borderRadius: "50%",
            background: "#ef4444",
            color: "white",
            fontSize: "11px",
            fontWeight: "700",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "2px solid white",
          }}>
            {unread}
          </span>
        )}
      </button>
    );
  }

  // ─── Chat window (open state) ───────────────────────────────────
  return (
    <div
      className="nexus-widget-open"
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        width: "min(380px, calc(100vw - 32px))",
        borderRadius: "20px",
        background: "#ffffff",
        boxShadow: "0 20px 60px rgba(15,23,42,0.18), 0 4px 16px rgba(15,23,42,0.08)",
        overflow: "hidden",
        zIndex: 999999,
        border: "1px solid rgba(226,232,240,0.8)",
      }}
    >

      {/* ── Header ── */}
      <div style={{
        background: "linear-gradient(135deg, #1e293b, #0f172a)",
        padding: "16px 18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Avatar */}
          <div style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #2563eb, #4f46e5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="white" />
            </svg>
          </div>
          <div>
            <p style={{ color: "#f8fafc", fontWeight: "600", fontSize: "14px", margin: 0, lineHeight: 1.3 }}>
              Support
            </p>
            <p style={{ color: "#94a3b8", fontSize: "11px", margin: 0, display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
              Online · usually replies quickly
            </p>
          </div>
        </div>

        {/* Header buttons */}
        <div style={{ display: "flex", gap: "4px" }}>
          <button
            type="button"
            onClick={() => setIsMinimized(v => !v)}
            style={headerBtnStyle}
            aria-label="Minimize"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            style={headerBtnStyle}
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Minimized state ── */}
      {isMinimized && (
        <div style={{ padding: "14px 18px", borderTop: "1px solid #f1f5f9" }}>
          <p style={{ color: "#64748b", fontSize: "13px", margin: 0, lineHeight: 1.5 }}>
            Chat minimized. Click to continue your conversation.
          </p>
        </div>
      )}

      {/* ── Loading state ── */}
      {!isMinimized && isLoadingTicket && (
        <div style={{ padding: "32px", textAlign: "center" }}>
          <div style={{ display: "flex", gap: "6px", justifyContent: "center", marginBottom: "10px" }}>
            <span className="nexus-dot" />
            <span className="nexus-dot" />
            <span className="nexus-dot" />
          </div>
          <p style={{ color: "#94a3b8", fontSize: "13px", margin: 0 }}>Loading your conversation...</p>
        </div>
      )}

      {/* ── New ticket form ── */}
      {!isMinimized && !isLoadingTicket && !ticketId && (
        <form onSubmit={submitTicket} style={{ padding: "18px", display: "grid", gap: "12px" }}>

          <p style={{ color: "#475569", fontSize: "13px", margin: 0, lineHeight: 1.5 }}>
            Send us a message and we'll get back to you as soon as possible.
          </p>

          <div style={{ display: "grid", gap: "6px" }}>
            <label style={labelStyle}>Name</label>
            <input
              name="customer_name"
              value={form.customer_name}
              onChange={updateField}
              placeholder="Ali Khan"
              required
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = "#2563eb"}
              onBlur={e => e.target.style.borderColor = "#e2e8f0"}
            />
          </div>

          <div style={{ display: "grid", gap: "6px" }}>
            <label style={labelStyle}>Email</label>
            <input
              name="customer_email"
              type="email"
              value={form.customer_email}
              onChange={updateField}
              placeholder="ali@example.com"
              required
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = "#2563eb"}
              onBlur={e => e.target.style.borderColor = "#e2e8f0"}
            />
          </div>

          <div style={{ display: "grid", gap: "6px" }}>
            <label style={labelStyle}>How can we help?</label>
            <textarea
              name="message"
              value={form.message}
              onChange={updateField}
              placeholder="Describe your issue..."
              required
              rows={3}
              style={{ ...inputStyle, resize: "vertical", minHeight: "80px", lineHeight: "1.5" }}
              onFocus={e => e.target.style.borderColor = "#2563eb"}
              onBlur={e => e.target.style.borderColor = "#e2e8f0"}
            />
          </div>

          {error && <ErrorBox message={error} />}

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              ...primaryBtnStyle,
              opacity: isSubmitting ? 0.7 : 1,
              cursor: isSubmitting ? "wait" : "pointer",
            }}
          >
            {isSubmitting ? "Sending..." : "Send message →"}
          </button>
        </form>
      )}

      {/* ── Conversation view ── */}
      {!isMinimized && !isLoadingTicket && ticketId && (
        <div style={{ display: "grid", gap: "0" }}>

          {/* Ticket ID bar */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 18px",
            background: "#f0fdf4",
            borderBottom: "1px solid #dcfce7",
          }}>
            <span style={{ fontSize: "12px", color: "#16a34a", fontWeight: "600" }}>
              ✓ Ticket #{ticketId} open
            </span>
            <button
              type="button"
              onClick={startNewComplaint}
              style={{ fontSize: "12px", color: "#16a34a", fontWeight: "600", background: "none", border: "none", cursor: "pointer", padding: 0 }}
            >
              New ticket
            </button>
          </div>

          {/* Messages */}
          <div style={{
            padding: "14px 18px",
            maxHeight: "240px",
            overflowY: "auto",
            display: "grid",
            gap: "10px",
          }}>
            {messages.length === 0 && (
              <p style={{ color: "#94a3b8", fontSize: "13px", textAlign: "center", margin: "16px 0" }}>
                No messages yet.
              </p>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className="nexus-message"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: msg.sender_type === "agent" ? "flex-start" : "flex-end",
                  gap: "3px",
                }}
              >
                <span style={{
                  fontSize: "10px",
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: msg.sender_type === "agent" ? "#2563eb" : "#64748b",
                }}>
                  {msg.sender_type === "agent" ? "Support" : "You"}
                </span>
                <div style={{
                  maxWidth: "85%",
                  padding: "10px 13px",
                  borderRadius: msg.sender_type === "agent" ? "4px 16px 16px 16px" : "16px 4px 16px 16px",
                  background: msg.sender_type === "agent" ? "#eff6ff" : "#1e293b",
                  color: msg.sender_type === "agent" ? "#1e40af" : "#f8fafc",
                  fontSize: "13px",
                  lineHeight: "1.5",
                }}>
                  {msg.body}
                </div>
              </div>
            ))}
          </div>

          {/* Refresh button */}
          <div style={{ padding: "0 18px 12px" }}>
            <button
              type="button"
              onClick={() => loadTicket(ticketId)}
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "10px",
                border: "1px solid #e2e8f0",
                background: "#f8fafc",
                color: "#64748b",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "background 0.15s",
              }}
            >
              ↻ Refresh conversation
            </button>
          </div>

          {/* Reply form */}
          <div style={{ borderTop: "1px solid #f1f5f9", padding: "14px 18px", display: "grid", gap: "10px" }}>
            {error && <ErrorBox message={error} />}
            <form onSubmit={submitMessage} style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
              <textarea
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                placeholder="Reply..."
                required
                rows={2}
                style={{
                  ...inputStyle,
                  flex: 1,
                  resize: "none",
                  lineHeight: "1.5",
                  fontSize: "13px",
                }}
                onFocus={e => e.target.style.borderColor = "#2563eb"}
                onBlur={e => e.target.style.borderColor = "#e2e8f0"}
              />
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "10px",
                  background: isSubmitting ? "#94a3b8" : "linear-gradient(135deg, #2563eb, #4f46e5)",
                  border: "none",
                  cursor: isSubmitting ? "wait" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "opacity 0.15s",
                }}
                aria-label="Send"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </form>
          </div>

        </div>
      )}
    </div>
  );
}

// ─── Shared style tokens ────────────────────────────────────────────
const headerBtnStyle = {
  width: "28px",
  height: "28px",
  borderRadius: "8px",
  border: "none",
  background: "rgba(255,255,255,0.08)",
  color: "#94a3b8",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "background 0.15s, color 0.15s",
};

const labelStyle = {
  fontSize: "12px",
  fontWeight: "600",
  color: "#475569",
  margin: 0,
};

const inputStyle = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: "10px",
  border: "1.5px solid #e2e8f0",
  fontSize: "13px",
  color: "#0f172a",
  outline: "none",
  background: "#fafafa",
  transition: "border-color 0.15s",
};

const primaryBtnStyle = {
  padding: "11px 16px",
  borderRadius: "12px",
  border: "none",
  background: "linear-gradient(135deg, #2563eb, #4f46e5)",
  color: "white",
  fontSize: "14px",
  fontWeight: "600",
  cursor: "pointer",
  transition: "opacity 0.15s, transform 0.15s",
  letterSpacing: "0.01em",
};

function ErrorBox({ message }) {
  return (
    <div style={{
      padding: "10px 13px",
      borderRadius: "10px",
      background: "#fef2f2",
      border: "1px solid #fecaca",
      color: "#dc2626",
      fontSize: "13px",
      lineHeight: 1.5,
    }}>
      {message}
    </div>
  );
}