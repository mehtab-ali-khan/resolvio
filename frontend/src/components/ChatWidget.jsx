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
  #nexus-support-widget-root {
    color-scheme: light;
    --nexus-color-bg: #f6f8fb;
    --nexus-color-bg-soft: #edf3f8;
    --nexus-color-surface: #ffffff;
    --nexus-color-surface-muted: #f7fafc;
    --nexus-color-border: #dde5ee;
    --nexus-color-border-strong: #c4d0dc;
    --nexus-color-text: #182230;
    --nexus-color-muted: #58677a;
    --nexus-color-subtle: #8a98a8;
    --nexus-color-inverse: #ffffff;
    --nexus-color-primary: #2f6fed;
    --nexus-color-primary-strong: #2458c7;
    --nexus-color-primary-soft: #e8f0ff;
    --nexus-color-primary-muted: #a7c4fb;
    --nexus-color-header-text: #ffffff;
    --nexus-color-header-muted: #dbeafe;
    --nexus-color-header-pill: rgba(255, 255, 255, 0.16);
    --nexus-color-header-border: rgba(255, 255, 255, 0.22);
    --nexus-color-secondary: #46607a;
    --nexus-color-secondary-strong: #25364a;
    --nexus-color-secondary-soft: #edf2f7;
    --nexus-color-accent: #14a3b8;
    --nexus-color-accent-strong: #0e7490;
    --nexus-color-accent-soft: #e5f8fb;
    --nexus-color-warning: #d97706;
    --nexus-color-warning-soft: #fef3c7;
    --nexus-color-success: #059669;
    --nexus-color-success-soft: #d1fae5;
    --nexus-color-danger: #dc2626;
    --nexus-color-danger-soft: #fee2e2;
    --nexus-message-agent-bg: #e8f0ff;
    --nexus-message-agent-text: #1e40af;
    --nexus-message-agent-label: #2563eb;
    --nexus-message-customer-bg: #e5f8fb;
    --nexus-message-customer-text: #164e63;
    --nexus-message-customer-label: #0e7490;
    --nexus-message-customer-border: #c6eef5;
    --nexus-radius-sm: 8px;
    --nexus-radius-md: 10px;
    --nexus-radius-lg: 14px;
    --nexus-radius-xl: 18px;
    --nexus-shadow-sm: 0 1px 2px rgba(24, 34, 48, 0.07);
    --nexus-shadow-md: 0 12px 30px rgba(24, 34, 48, 0.10);
    --nexus-shadow-lg: 0 22px 64px rgba(24, 34, 48, 0.16);
    --nexus-gradient-brand: linear-gradient(135deg, var(--nexus-color-primary), var(--nexus-color-accent));
    --nexus-gradient-header: var(--nexus-gradient-brand);
    --nexus-gradient-avatar: linear-gradient(135deg, #0ea5e9 0%, #2563eb 46%, #7c3aed 100%);
  }

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
    0%   { box-shadow: 0 0 0 0 color-mix(in srgb, var(--nexus-color-primary) 38%, transparent); }
    70%  { box-shadow: 0 0 0 10px color-mix(in srgb, var(--nexus-color-primary) 0%, transparent); }
    100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--nexus-color-primary) 0%, transparent);   }
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
    background: var(--nexus-color-subtle);
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
          background: "var(--nexus-gradient-brand)",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 8px 32px color-mix(in srgb, var(--nexus-color-primary) 34%, transparent)",
          transition: "transform 0.2s ease",
          zIndex: 999999,
        }}
        aria-label="Open support chat"
      >
        {/* Chat icon */}
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <path
            d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
            fill="var(--nexus-color-inverse)"
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
            background: "var(--nexus-color-danger)",
            color: "var(--nexus-color-inverse)",
            fontSize: "11px",
            fontWeight: "700",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "2px solid var(--nexus-color-surface)",
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
        background: "var(--nexus-color-surface)",
        boxShadow: "var(--nexus-shadow-lg)",
        overflow: "hidden",
        zIndex: 999999,
        border: "1px solid var(--nexus-color-border)",
      }}
    >

      {/* ── Header ── */}
      <div style={{
        background: "var(--nexus-gradient-header)",
        padding: "16px 18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid var(--nexus-color-header-border)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Avatar */}
          <div style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            background: "var(--nexus-gradient-brand)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="var(--nexus-color-inverse)" />
            </svg>
          </div>
          <div>
            <p style={{ color: "var(--nexus-color-header-text)", fontWeight: "600", fontSize: "14px", margin: 0, lineHeight: 1.3 }}>
              Support
            </p>
            <p style={{ color: "var(--nexus-color-header-muted)", fontSize: "11px", margin: 0, display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--nexus-color-success)", display: "inline-block" }} />
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
        <div style={{ padding: "14px 18px", borderTop: "1px solid var(--nexus-color-border)" }}>
          <p style={{ color: "var(--nexus-color-muted)", fontSize: "13px", margin: 0, lineHeight: 1.5 }}>
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
          <p style={{ color: "var(--nexus-color-subtle)", fontSize: "13px", margin: 0 }}>Loading your conversation...</p>
        </div>
      )}

      {/* ── New ticket form ── */}
      {!isMinimized && !isLoadingTicket && !ticketId && (
        <form onSubmit={submitTicket} style={{ padding: "18px", display: "grid", gap: "12px" }}>

          <p style={{ color: "var(--nexus-color-muted)", fontSize: "13px", margin: 0, lineHeight: 1.5 }}>
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
              onFocus={e => e.target.style.borderColor = "var(--nexus-color-primary)"}
              onBlur={e => e.target.style.borderColor = "var(--nexus-color-border)"}
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
              onFocus={e => e.target.style.borderColor = "var(--nexus-color-primary)"}
              onBlur={e => e.target.style.borderColor = "var(--nexus-color-border)"}
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
              onFocus={e => e.target.style.borderColor = "var(--nexus-color-primary)"}
              onBlur={e => e.target.style.borderColor = "var(--nexus-color-border)"}
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
            background: "var(--nexus-color-success-soft)",
            borderBottom: "1px solid var(--nexus-color-success-soft)",
          }}>
            <span style={{ fontSize: "12px", color: "var(--nexus-color-success)", fontWeight: "600" }}>
              ✓ Ticket #{ticketId} open
            </span>
            <button
              type="button"
              onClick={startNewComplaint}
              style={{ fontSize: "12px", color: "var(--nexus-color-success)", fontWeight: "600", background: "none", border: "none", cursor: "pointer", padding: 0 }}
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
              <p style={{ color: "var(--nexus-color-subtle)", fontSize: "13px", textAlign: "center", margin: "16px 0" }}>
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
                  color: msg.sender_type === "agent" ? "var(--nexus-message-agent-label)" : "var(--nexus-message-customer-label)",
                }}>
                  {msg.sender_type === "agent" ? "Support" : "You"}
                </span>
                <div style={{
                  maxWidth: "85%",
                  padding: "10px 13px",
                  borderRadius: msg.sender_type === "agent" ? "4px 16px 16px 16px" : "16px 4px 16px 16px",
                  background: msg.sender_type === "agent" ? "var(--nexus-message-agent-bg)" : "var(--nexus-message-customer-bg)",
                  color: msg.sender_type === "agent" ? "var(--nexus-message-agent-text)" : "var(--nexus-message-customer-text)",
                  border: msg.sender_type === "agent" ? "1px solid var(--nexus-color-primary-soft)" : "1px solid var(--nexus-message-customer-border)",
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
                border: "1px solid var(--nexus-color-border)",
                background: "var(--nexus-color-surface-muted)",
                color: "var(--nexus-color-muted)",
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
          <div style={{ borderTop: "1px solid var(--nexus-color-border)", padding: "14px 18px", display: "grid", gap: "10px" }}>
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
                onFocus={e => e.target.style.borderColor = "var(--nexus-color-primary)"}
                onBlur={e => e.target.style.borderColor = "var(--nexus-color-border)"}
              />
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "10px",
                  background: isSubmitting ? "var(--nexus-color-subtle)" : "var(--nexus-gradient-brand)",
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
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--nexus-color-inverse)" strokeWidth="2.5">
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
  background: "var(--nexus-color-header-pill)",
  color: "var(--nexus-color-inverse)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "background 0.15s, color 0.15s",
};

const labelStyle = {
  fontSize: "12px",
  fontWeight: "600",
  color: "var(--nexus-color-secondary-strong)",
  margin: 0,
};

const inputStyle = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: "10px",
  border: "1.5px solid var(--nexus-color-border)",
  fontSize: "13px",
  color: "var(--nexus-color-text)",
  outline: "none",
  background: "var(--nexus-color-surface-muted)",
  transition: "border-color 0.15s",
};

const primaryBtnStyle = {
  padding: "11px 16px",
  borderRadius: "12px",
  border: "none",
  background: "var(--nexus-gradient-brand)",
  color: "var(--nexus-color-inverse)",
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
      background: "var(--nexus-color-danger-soft)",
      border: "1px solid var(--nexus-color-danger-soft)",
      color: "var(--nexus-color-danger)",
      fontSize: "13px",
      lineHeight: 1.5,
    }}>
      {message}
    </div>
  );
}
