// frontend/src/components/ChatWidget.jsx

import { useEffect, useRef, useState } from "react";
import { createCustomerMessage, createTicket, getTicketByToken } from "../api/tickets.js";
import { useWebSocket } from "../hooks/useWebSocket.js";

const STORAGE_KEY = "nexus_ticket_token";

const styles = `
  #nexus-support-widget-root {
    color-scheme: light;
    --nexus-color-bg: #f6f8fb;
    --nexus-color-surface: #ffffff;
    --nexus-color-surface-muted: #f7fafc;
    --nexus-color-border: #dde5ee;
    --nexus-color-text: #182230;
    --nexus-color-muted: #58677a;
    --nexus-color-subtle: #8a98a8;
    --nexus-color-inverse: #ffffff;
    --nexus-color-primary: #2f6fed;
    --nexus-color-primary-soft: #e8f0ff;
    --nexus-color-header-text: #ffffff;
    --nexus-color-header-muted: #dbeafe;
    --nexus-color-header-pill: rgba(255,255,255,0.16);
    --nexus-color-header-border: rgba(255,255,255,0.22);
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
    --nexus-gradient-brand: linear-gradient(135deg, #2f6fed, #14a3b8);
    --nexus-gradient-header: linear-gradient(135deg, #2f6fed, #14a3b8);
    --nexus-gradient-avatar: linear-gradient(135deg, #0ea5e9 0%, #2563eb 46%, #7c3aed 100%);
    --nexus-shadow-lg: 0 22px 64px rgba(24,34,48,0.16);
  }
  @keyframes nexus-slide-up {
    from { opacity: 0; transform: translateY(20px) scale(0.95); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes nexus-bounce-in {
    0%   { opacity: 0; transform: scale(0.5); }
    70%  { transform: scale(1.08); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes nexus-message-in {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes nexus-dot-bounce {
    0%, 80%, 100% { transform: translateY(0); }
    40%           { transform: translateY(-6px); }
  }
  @keyframes nexus-expand {
    from { opacity: 0.8; transform: scaleX(0.97); }
    to   { opacity: 1; transform: scaleX(1); }
  }
  #nexus-support-widget-root * {
    box-sizing: border-box;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }
  .nexus-minimized  { animation: nexus-slide-up 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards; }
  .nexus-maximized  { animation: nexus-expand 0.25s ease forwards; }
  .nexus-bubble     { animation: nexus-bounce-in 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards; }
  .nexus-message    { animation: nexus-message-in 0.25s ease forwards; }
  .nexus-dot { display:inline-block; width:6px; height:6px; border-radius:50%; background:var(--nexus-color-subtle); animation:nexus-dot-bounce 1.2s ease infinite; }
  .nexus-dot:nth-child(2) { animation-delay:0.2s; }
  .nexus-dot:nth-child(3) { animation-delay:0.4s; }
`;

function injectGlobalStyles() {
  if (document.getElementById("nexus-styles")) return;
  const tag = document.createElement("style");
  tag.id = "nexus-styles";
  tag.textContent = styles;
  document.head.appendChild(tag);
}

function isFromTeam(senderType) {
  return senderType === "agent" || senderType === "ai";
}

function senderLabel(senderType) {
  if (senderType === "agent") return "Support";
  if (senderType === "ai") return "AI Assistant";
  return "You";
}

const initialForm = { customer_name: "", customer_email: "", message: "" };

const headerBtnStyle = {
  width: "28px", height: "28px", borderRadius: "8px", border: "none",
  background: "var(--nexus-color-header-pill)", color: "var(--nexus-color-inverse)",
  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
  flexShrink: 0,
};

const inputStyle = {
  width: "100%", padding: "9px 12px", borderRadius: "10px",
  border: "1.5px solid var(--nexus-color-border)", fontSize: "13px",
  color: "var(--nexus-color-text)", outline: "none",
  background: "var(--nexus-color-surface-muted)", transition: "border-color 0.15s",
};

const labelStyle = {
  fontSize: "12px", fontWeight: "600",
  color: "var(--nexus-color-secondary-strong, #25364a)", margin: 0,
};

const primaryBtnStyle = {
  padding: "11px 16px", borderRadius: "12px", border: "none",
  background: "var(--nexus-gradient-brand)", color: "var(--nexus-color-inverse)",
  fontSize: "14px", fontWeight: "600", cursor: "pointer", width: "100%",
  transition: "opacity 0.15s",
};

function ErrorBox({ message }) {
  return (
    <div style={{
      padding: "10px 13px", borderRadius: "10px",
      background: "var(--nexus-color-danger-soft)",
      border: "1px solid var(--nexus-color-danger-soft)",
      color: "var(--nexus-color-danger)", fontSize: "13px", lineHeight: 1.5,
    }}>
      {message}
    </div>
  );
}

// ─── The 3 possible states ────────────────────────────────────────────────────
// "closed"    → only the bubble button shows in the corner
// "minimized" → small floating card in the bottom right (normal chat view)
// "maximized" → full height panel pinned to the right side of the screen

export function ChatWidget({ apiKey }) {
  const [chatState, setChatState] = useState("closed");
  const [isLoadingTicket, setIsLoadingTicket] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [accessToken, setAccessToken] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [error, setError] = useState("");
  const [unread, setUnread] = useState(0);
  const messagesEndRef = useRef(null);

  const WS_BASE = import.meta.env.VITE_WS_URL || "ws://localhost:8000";
  const wsUrl = accessToken ? `${WS_BASE}/ws/widget/${accessToken}/` : null;

  useWebSocket(wsUrl, (data) => {
    if (data.type === "new_message" && data.message) {
      setMessages(prev => {
        const alreadyExists = prev.some(m => m.id === data.message.id);
        if (alreadyExists) return prev;
        // Only increment unread badge when chat is fully closed
        if (chatState === "closed") {
          setUnread(u => u + 1);
        }
        return [...prev, data.message];
      });
    }
  });

  useEffect(() => {
    injectGlobalStyles();
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      loadTicket(saved);
    } else {
      setIsLoadingTicket(false);
    }
  }, []);

  // Auto-scroll to latest message whenever messages change
  useEffect(() => {
    if (chatState !== "closed") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, chatState]);

  // Clear unread badge whenever the chat is opened in any state
  useEffect(() => {
    if (chatState !== "closed") setUnread(0);
  }, [chatState]);

  async function loadTicket(token) {
    setIsLoadingTicket(true);
    setError("");
    try {
      const ticket = await getTicketByToken(token);
      setAccessToken(token);
      setMessages(ticket.messages);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      setError("Previous conversation could not be loaded.");
    } finally {
      setIsLoadingTicket(false);
    }
  }

  async function submitTicket(e) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const created = await createTicket({ ...form, api_key: apiKey });
      const token = created.access_token;
      localStorage.setItem(STORAGE_KEY, token);
      setAccessToken(token);
      const ticket = await getTicketByToken(token);
      setMessages(ticket.messages);
      setForm(initialForm);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitMessage(e) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await createCustomerMessage(accessToken, { message: newMessage });
      setNewMessage("");
      const ticket = await getTicketByToken(accessToken);
      setMessages(ticket.messages);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  // ─── State 1: Closed — just the bubble ───────────────────────────────────

  if (chatState === "closed") {
    return (
      <button
        className="nexus-bubble"
        type="button"
        onClick={() => setChatState("minimized")}
        style={{
          position: "fixed", bottom: "24px", right: "24px",
          width: "60px", height: "60px", borderRadius: "50%",
          background: "var(--nexus-gradient-brand)", border: "none",
          cursor: "pointer", display: "flex", alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 8px 32px rgba(47,111,237,0.34)", zIndex: 999999,
        }}
        aria-label="Open support chat"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="white" />
        </svg>

        {/* Unread badge — only shows when there are unread messages */}
        {unread > 0 && (
          <span style={{
            position: "absolute", top: "-4px", right: "-4px",
            width: "20px", height: "20px", borderRadius: "50%",
            background: "var(--nexus-color-danger)", color: "white",
            fontSize: "11px", fontWeight: "700",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "2px solid white",
          }}>
            {unread}
          </span>
        )}
      </button>
    );
  }

  // ─── Header — shared between minimized and maximized states ──────────────

  const header = (
    <div style={{
      background: "var(--nexus-gradient-header)",
      padding: "14px 16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottom: "1px solid var(--nexus-color-header-border)",
      flexShrink: 0,
    }}>
      {/* Brand / title */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{
          width: "34px", height: "34px", borderRadius: "50%",
          background: "rgba(255,255,255,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="white" />
          </svg>
        </div>
        <p style={{
          color: "var(--nexus-color-header-text)",
          fontWeight: "600", fontSize: "14px", margin: 0,
        }}>
          Support
        </p>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: "4px" }}>

        {/* Minimize button — only shown when maximized, shrinks back to small card */}
        {chatState === "maximized" && (
          <button
            type="button"
            onClick={() => setChatState("minimized")}
            style={headerBtnStyle}
            aria-label="Minimize to small chat"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        )}

        {/* Maximize button — only shown when minimized, expands to full height */}
        {chatState === "minimized" && (
          <button
            type="button"
            onClick={() => setChatState("maximized")}
            style={headerBtnStyle}
            aria-label="Expand to full height"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 3 21 3 21 9" />
              <polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          </button>
        )}

        {/* Close button — always shown, goes back to bubble */}
        <button
          type="button"
          onClick={() => setChatState("closed")}
          style={headerBtnStyle}
          aria-label="Close chat"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );

  // ─── Chat body — shared between minimized and maximized states ────────────

  const body = (
    <>
      {/* Loading spinner */}
      {isLoadingTicket && (
        <div style={{ padding: "32px", textAlign: "center", flex: 1 }}>
          <div style={{ display: "flex", gap: "6px", justifyContent: "center", marginBottom: "10px" }}>
            <span className="nexus-dot" />
            <span className="nexus-dot" />
            <span className="nexus-dot" />
          </div>
          <p style={{ color: "var(--nexus-color-subtle)", fontSize: "13px", margin: 0 }}>
            Loading…
          </p>
        </div>
      )}

      {/* New ticket form — shown when customer has no existing ticket */}
      {!isLoadingTicket && !accessToken && (
        <form
          onSubmit={submitTicket}
          style={{ padding: "18px", display: "grid", gap: "12px", flex: 1, overflowY: "auto" }}
        >
          <p style={{ color: "var(--nexus-color-muted)", fontSize: "13px", margin: 0, lineHeight: 1.5 }}>
            Send us a message and we'll get back to you as soon as possible.
          </p>

          {[
            { name: "customer_name", label: "Name", type: "text", placeholder: "Ali Khan" },
            { name: "customer_email", label: "Email", type: "email", placeholder: "ali@example.com" },
          ].map(({ name, label, type, placeholder }) => (
            <div key={name} style={{ display: "grid", gap: "6px" }}>
              <label style={labelStyle}>{label}</label>
              <input
                name={name} type={type} value={form[name]}
                placeholder={placeholder} required
                onChange={e => setForm({ ...form, [e.target.name]: e.target.value })}
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = "var(--nexus-color-primary)")}
                onBlur={e => (e.target.style.borderColor = "var(--nexus-color-border)")}
              />
            </div>
          ))}

          <div style={{ display: "grid", gap: "6px" }}>
            <label style={labelStyle}>How can we help?</label>
            <textarea
              name="message" value={form.message} required rows={3}
              placeholder="Describe your issue…"
              onChange={e => setForm({ ...form, message: e.target.value })}
              style={{ ...inputStyle, resize: "vertical", minHeight: "80px", lineHeight: 1.5 }}
              onFocus={e => (e.target.style.borderColor = "var(--nexus-color-primary)")}
              onBlur={e => (e.target.style.borderColor = "var(--nexus-color-border)")}
            />
          </div>

          {error && <ErrorBox message={error} />}

          <button
            type="submit" disabled={isSubmitting}
            style={{ ...primaryBtnStyle, opacity: isSubmitting ? 0.7 : 1 }}
          >
            {isSubmitting ? "Sending…" : "Send message →"}
          </button>
        </form>
      )}

      {/* Conversation — shown when customer has an existing ticket */}
      {!isLoadingTicket && accessToken && (
        <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>

          {/* Messages list */}
          <div style={{
            padding: "14px 18px",
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}>
            {messages.length === 0 && (
              <p style={{
                color: "var(--nexus-color-subtle)", fontSize: "13px",
                textAlign: "center", margin: "16px 0",
              }}>
                No messages yet.
              </p>
            )}

            {messages.map((msg, i) => {
              const fromTeam = isFromTeam(msg.sender_type);
              return (
                <div
                  key={msg.id ?? i}
                  className="nexus-message"
                  style={{
                    display: "flex", flexDirection: "column",
                    alignItems: fromTeam ? "flex-start" : "flex-end",
                    gap: "3px",
                  }}
                >
                  <span style={{
                    fontSize: "10px", fontWeight: "700",
                    textTransform: "uppercase", letterSpacing: "0.05em",
                    color: fromTeam
                      ? "var(--nexus-message-agent-label)"
                      : "var(--nexus-message-customer-label)",
                  }}>
                    {senderLabel(msg.sender_type)}
                  </span>
                  <div style={{
                    maxWidth: "85%", padding: "10px 13px",
                    fontSize: "13px", lineHeight: 1.5,
                    borderRadius: fromTeam
                      ? "4px 16px 16px 16px"
                      : "16px 4px 16px 16px",
                    background: fromTeam
                      ? "var(--nexus-message-agent-bg)"
                      : "var(--nexus-message-customer-bg)",
                    color: fromTeam
                      ? "var(--nexus-message-agent-text)"
                      : "var(--nexus-message-customer-text)",
                    border: fromTeam
                      ? "1px solid var(--nexus-color-primary-soft)"
                      : "1px solid var(--nexus-message-customer-border)",
                  }}>
                    {msg.body}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply box — always pinned to the bottom */}
          <div style={{
            borderTop: "1px solid var(--nexus-color-border)",
            padding: "14px 18px",
            display: "grid",
            gap: "10px",
            flexShrink: 0,
            background: "var(--nexus-color-surface)",
          }}>
            {error && <ErrorBox message={error} />}
            <form
              onSubmit={submitMessage}
              style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}
            >
              <textarea
                value={newMessage} required rows={2} placeholder="Reply…"
                onChange={e => setNewMessage(e.target.value)}
                style={{ ...inputStyle, flex: 1, resize: "none", lineHeight: 1.5, fontSize: "13px" }}
                onFocus={e => (e.target.style.borderColor = "var(--nexus-color-primary)")}
                onBlur={e => (e.target.style.borderColor = "var(--nexus-color-border)")}
              />
              <button
                type="submit" disabled={isSubmitting} aria-label="Send"
                style={{
                  width: "38px", height: "38px", borderRadius: "10px", border: "none",
                  background: isSubmitting
                    ? "var(--nexus-color-subtle)"
                    : "var(--nexus-gradient-brand)",
                  cursor: isSubmitting ? "wait" : "pointer",
                  display: "flex", alignItems: "center",
                  justifyContent: "center", flexShrink: 0,
                }}
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
    </>
  );

  // ─── State 2: Minimized — small floating card ─────────────────────────────

  if (chatState === "minimized") {
    return (
      <div
        id="nexus-support-widget-root"
        className="nexus-minimized"
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          width: "min(380px, calc(100vw - 32px))",
          height: "520px",        // fixed height for the small card
          borderRadius: "20px",
          background: "var(--nexus-color-surface)",
          boxShadow: "var(--nexus-shadow-lg)",
          border: "1px solid var(--nexus-color-border)",
          zIndex: 999999,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {header}
        {body}
      </div>
    );
  }

  // ─── State 3: Maximized — full height side panel ──────────────────────────

  return (
    <div
      id="nexus-support-widget-root"
      className="nexus-maximized"
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: "min(45%, 500px)",  // 45% of screen, max 500px
        background: "var(--nexus-color-surface)",
        boxShadow: "-8px 0 32px rgba(24,34,48,0.12)",
        borderLeft: "1px solid var(--nexus-color-border)",
        zIndex: 999999,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {header}
      {body}
    </div>
  );
}