// frontend/src/components/ChatWidget.jsx

import { useEffect, useRef, useState } from "react";
import { createCustomerMessage, createTicket, getTicketByToken } from "../api/tickets.js";
import { useWebSocket } from "../hooks/useWebSocket.js";

const STORAGE_KEY = "nexus_ticket_token";

// ─── Styles ───────────────────────────────────────────────────────────────────
// The widget defines its own theme variables so it stays self-contained
// while matching the app's shared color system.

const styles = `
  #nexus-widget-root {
    --nw-p: #1d9e6d;
    --nw-p-soft: #eff6ff;
    --nw-p-strong: #149b6e;
    --nw-s: #111827;
    --nw-s-mid: #374151;
    --nw-s-soft: #f3f4f6;
    --nw-g-100: #f9fafb;
    --nw-g-200: #f3f4f6;
    --nw-g-300: #e5e7eb;
    --nw-g-400: #d1d5db;
    --nw-g-500: #9ca3af;
    --nw-g-600: #6b7280;
    --nw-shadow-sm: 0 1px 3px rgba(0,0,0,0.08);
    --nw-shadow-md: 0 4px 16px rgba(0,0,0,0.10);
    --nw-shadow-lg: 0 8px 32px rgba(0,0,0,0.14);
    --nw-gradient: linear-gradient(135deg, #0f8a5b, #1fd1ab);
    color-scheme: light;
  }

  #nexus-widget-root * {
    box-sizing: border-box;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
    margin: 0;
    padding: 0;
  }

  @keyframes nw-slide-up {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes nw-expand {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes nw-bounce-in {
    0%   { opacity: 0; transform: scale(0.6); }
    70%  { transform: scale(1.05); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes nw-msg-in {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes nw-dot {
    0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
    40%           { transform: translateY(-5px); opacity: 1; }
  }

  .nw-bubble    { animation: nw-bounce-in 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards; }
  .nw-minimized { animation: nw-slide-up 0.25s ease forwards; }
  .nw-maximized { animation: nw-expand 0.2s ease forwards; }
  .nw-msg       { animation: nw-msg-in 0.2s ease forwards; }

  .nw-dot {
    display: inline-block;
    width: 5px; height: 5px;
    border-radius: 50%;
    background: var(--nw-g-500);
    animation: nw-dot 1.2s ease infinite;
  }
  .nw-dot:nth-child(2) { animation-delay: 0.15s; }
  .nw-dot:nth-child(3) { animation-delay: 0.3s; }

  .nw-textarea:focus { outline: none; }

  .nw-send-btn:hover { background: var(--nw-gradient) !important; }

  .nw-msg-input {
    resize: none;
    border: none;
    background: transparent;
    font-size: 14px;
    line-height: 1.5;
    color: var(--nw-s);
    flex: 1;
    max-height: 120px;
    overflow-y: auto;
  }
  .nw-msg-input::placeholder { color: var(--nw-g-500); }
  .nw-msg-input:focus { outline: none; }

  .nw-scroll::-webkit-scrollbar { width: 4px; }
  .nw-scroll::-webkit-scrollbar-track { background: transparent; }
  .nw-scroll::-webkit-scrollbar-thumb { background: var(--nw-g-300); border-radius: 4px; }
`;

function injectStyles() {
  if (document.getElementById("nw-styles")) return;
  const tag = document.createElement("style");
  tag.id = "nw-styles";
  tag.textContent = styles;
  document.head.appendChild(tag);
}

function isFromTeam(senderType) {
  return senderType === "agent" || senderType === "ai";
}

function getSenderLabel(senderType) {
  if (senderType === "agent") return "Support";
  if (senderType === "ai") return "AI Assistant";
  return "You";
}

const initialForm = { customer_name: "", customer_email: "", message: "" };

// ─── Small reusable pieces ────────────────────────────────────────────────────

// The round header button (minimize, maximize, close)
function HeaderBtn({ onClick, label, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      style={{
        width: "30px", height: "30px",
        borderRadius: "8px", border: "none",
        background: "transparent",
        color: "var(--nw-g-600)",
        cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "background 0.15s, color 0.15s",
      }}
      onMouseEnter={e => { e.currentTarget.style.background = "var(--nw-g-200)"; e.currentTarget.style.color = "var(--nw-s)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--nw-g-600)"; }}
    >
      {children}
    </button>
  );
}

// A single message bubble
function MessageBubble({ msg }) {
  const fromTeam = isFromTeam(msg.sender_type);
  const senderLabel = getSenderLabel(msg.sender_type);
  return (
    <div
      className="nw-msg"
      style={{
        display: "flex",
        justifyContent: fromTeam ? "flex-start" : "flex-end",
      }}
    >
      <div style={{
        maxWidth: "78%",
        padding: "10px 14px",
        fontSize: "14px",
        lineHeight: "1.55",
        borderRadius: fromTeam ? "4px 18px 18px 18px" : "18px 4px 18px 18px",
        background: fromTeam ? "#ffffff" : "var(--nw-s-soft)",
        color: "var(--nw-s)",
        border: fromTeam ? "1px solid var(--nw-g-300)" : "none",
        boxShadow: fromTeam ? "var(--nw-shadow-sm)" : "none",
      }}>
        <div style={{
          marginBottom: "4px",
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: fromTeam ? "var(--nw-g-600)" : "var(--nw-s-mid)",
        }}>
          {senderLabel}
        </div>
        {msg.body}
      </div>
    </div>
  );
}

// ─── Main widget ──────────────────────────────────────────────────────────────

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
  const textareaRef = useRef(null);

  const WS_BASE = import.meta.env.VITE_WS_URL || "ws://localhost:8000";
  const wsUrl = accessToken ? `${WS_BASE}/ws/widget/${accessToken}/` : null;

  useWebSocket(wsUrl, (data) => {
    if (data.type === "new_message" && data.message) {
      setMessages(prev => {
        const alreadyExists = prev.some(m => m.id === data.message.id);
        if (alreadyExists) return prev;
        if (chatState === "closed") setUnread(u => u + 1);
        return [...prev, data.message];
      });
    }
  });

  useEffect(() => {
    injectStyles();
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      loadTicket(saved);
    } else {
      setIsLoadingTicket(false);
    }
  }, []);

  useEffect(() => {
    if (chatState !== "closed") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, chatState]);

  useEffect(() => {
    if (chatState !== "closed") setUnread(0);
  }, [chatState]);

  // Auto-grow the textarea as the user types — up to 5 lines
  function handleTextareaInput(e) {
    setNewMessage(e.target.value);
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  }

  async function loadTicket(token) {
    setIsLoadingTicket(true);
    setError("");
    try {
      const ticket = await getTicketByToken(token);
      setAccessToken(token);
      setMessages(ticket.messages);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
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
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitMessage(e) {
    e.preventDefault();
    if (isSubmitting || !newMessage.trim()) return;
    setError("");
    setIsSubmitting(true);
    try {
      await createCustomerMessage(accessToken, { message: newMessage });
      setNewMessage("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      const ticket = await getTicketByToken(accessToken);
      setMessages(ticket.messages);
    } catch {
      setError("Could not send your message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Send on Enter key, new line on Shift+Enter
  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitMessage(e);
    }
  }

  // ─── State 1: Closed — just the bubble ───────────────────────────────────

  if (chatState === "closed") {
    return (
      <button
        id="nexus-widget-root"
        className="nw-bubble"
        type="button"
        onClick={() => setChatState("minimized")}
        style={{
          position: "fixed", bottom: "24px", right: "24px",
          width: "56px", height: "56px", borderRadius: "50%",
          background: "var(--nw-gradient)",
          border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "var(--nw-shadow-lg)",
          zIndex: 999999,
        }}
        aria-label="Open support chat"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="white" />
        </svg>

        {unread > 0 && (
          <span style={{
            position: "absolute", top: "-3px", right: "-3px",
            minWidth: "18px", height: "18px",
            borderRadius: "9px",
            background: "#ef4444", color: "white",
            fontSize: "11px", fontWeight: "700",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "0 4px",
            border: "2px solid white",
          }}>
            {unread}
          </span>
        )}
      </button>
    );
  }

  // ─── Header — shared between minimized and maximized ─────────────────────

  const header = (
    <div style={{
      display: "flex", alignItems: "center",
      justifyContent: "space-between",
      padding: "12px 14px",
      borderBottom: "1px solid var(--nw-g-200)",
      background: "#ffffff",
      flexShrink: 0,
    }}>
      {/* Left side — company/product name */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {/* Small dark icon */}
        <div style={{
          width: "32px", height: "32px", borderRadius: "8px",
          background: "var(--nw-gradient)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="white" />
          </svg>
        </div>
        <div>
          <p style={{ fontSize: "16px", fontWeight: "600", color: "var(--nw-s)", lineHeight: 1.2 }}>
            SUPPORT
          </p>
        </div>
      </div>

      {/* Right side — action buttons */}
      <div style={{ display: "flex", gap: "2px" }}>
        {chatState === "maximized" && (
          <HeaderBtn onClick={() => setChatState("minimized")} label="Minimize">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="4 14 10 14 10 20" />
              <polyline points="20 10 14 10 14 4" />
              <line x1="14" y1="10" x2="21" y2="3" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          </HeaderBtn>
        )}
        {chatState === "minimized" && (
          <HeaderBtn onClick={() => setChatState("maximized")} label="Expand">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 3 21 3 21 9" />
              <polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          </HeaderBtn>
        )}
        <HeaderBtn onClick={() => setChatState("closed")} label="Close">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </HeaderBtn>
      </div>
    </div>
  );

  // ─── Body — shared between minimized and maximized ────────────────────────

  const body = (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>

      {/* Loading dots */}
      {isLoadingTicket && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
          <span className="nw-dot" />
          <span className="nw-dot" />
          <span className="nw-dot" />
        </div>
      )}

      {/* New ticket form */}
      {!isLoadingTicket && !accessToken && (
        <form
          onSubmit={submitTicket}
          style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}
        >
          <p style={{ fontSize: "13px", color: "var(--nw-g-600)", lineHeight: 1.6 }}>
            Send us a message and we'll get back to you as soon as possible.
          </p>

          {/* Name field */}
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "#374151" }}>Name</label>
            <input
              name="customer_name"
              type="text"
              value={form.customer_name}
              placeholder="Your name"
              required
              onChange={e => setForm({ ...form, customer_name: e.target.value })}
              style={{
                padding: "9px 12px", borderRadius: "8px",
                border: "1px solid var(--nw-g-300)",
                fontSize: "14px", color: "var(--nw-s)",
                background: "var(--nw-g-100)", outline: "none",
                transition: "border-color 0.15s",
              }}
              onFocus={e => (e.target.style.borderColor = "var(--nw-s)")}
              onBlur={e => (e.target.style.borderColor = "var(--nw-g-300)")}
            />
          </div>

          {/* Email field */}
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "#374151" }}>Email</label>
            <input
              name="customer_email"
              type="email"
              value={form.customer_email}
              placeholder="you@example.com"
              required
              onChange={e => setForm({ ...form, customer_email: e.target.value })}
              style={{
                padding: "9px 12px", borderRadius: "8px",
                border: "1px solid var(--nw-g-300)",
                fontSize: "14px", color: "var(--nw-s)",
                background: "var(--nw-g-100)", outline: "none",
                transition: "border-color 0.15s",
              }}
              onFocus={e => (e.target.style.borderColor = "var(--nw-s)")}
              onBlur={e => (e.target.style.borderColor = "var(--nw-g-300)")}
            />
          </div>

          {/* Message field */}
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "#374151" }}>Message</label>
            <textarea
              value={form.message}
              required
              rows={4}
              placeholder="How can we help you?"
              onChange={e => setForm({ ...form, message: e.target.value })}
              style={{
                padding: "9px 12px", borderRadius: "8px",
                border: "1px solid var(--nw-g-300)",
                fontSize: "14px", color: "var(--nw-s)",
                background: "var(--nw-g-100)", outline: "none",
                resize: "vertical", lineHeight: 1.5,
                transition: "border-color 0.15s",
                fontFamily: "inherit",
              }}
              onFocus={e => (e.target.style.borderColor = "var(--nw-s)")}
              onBlur={e => (e.target.style.borderColor = "var(--nw-g-300)")}
            />
          </div>

          {error && (
            <p style={{ fontSize: "13px", color: "var(--danger, #dc2626)" }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              padding: "11px 16px", borderRadius: "8px",
              background: "var(--nw-p)", color: "white",
              fontSize: "14px", fontWeight: "600",
              border: "none", cursor: isSubmitting ? "wait" : "pointer",
              opacity: isSubmitting ? 0.6 : 1,
              transition: "opacity 0.15s",
            }}
          >
            {isSubmitting ? "Sending…" : "Send message"}
          </button>
        </form>
      )}

      {/* Conversation view */}
      {!isLoadingTicket && accessToken && (
        <>
          {/* Messages area — scrollable */}
          <div
            className="nw-scroll"
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px 14px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              background: "var(--nw-g-100)",
            }}
          >
            {messages.length === 0 && (
              <p style={{ textAlign: "center", color: "var(--nw-g-500)", fontSize: "13px", marginTop: "20px" }}>
                No messages yet.
              </p>
            )}
            {messages.map((msg, i) => (
              <MessageBubble key={msg.id ?? i} msg={msg} />
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply box — pinned to bottom */}
          <div style={{
            padding: "10px 12px",
            background: "#ffffff",
            borderTop: "1px solid var(--nw-g-200)",
            flexShrink: 0,
          }}>
            {error && (
              <p style={{ fontSize: "12px", color: "var(--danger, #dc2626)", marginBottom: "8px" }}>{error}</p>
            )}

            {/* Input row — textarea + send button together in one box */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 12px",
              borderRadius: "12px",
              border: "1px solid var(--nw-g-300)",
              background: "var(--nw-g-100)",
              transition: "border-color 0.15s",
            }}
              onFocus={() => { }}
            >
              <textarea
                ref={textareaRef}
                className="nw-msg-input"
                value={newMessage}
                required
                rows={1}
                placeholder="Write a message…"
                onChange={handleTextareaInput}
                onKeyDown={handleKeyDown}
                style={{
                  resize: "none",
                  border: "none",
                  background: "transparent",
                  fontSize: "14px",
                  lineHeight: "1.5",
                  paddingTop: "6px",
                  paddingBottom: "6px",
                  color: "var(--nw-s)",
                  flex: 1,
                  maxHeight: "120px",
                  overflowY: "auto",
                  fontFamily: "inherit",
                  outline: "none",
                }}
              />

              {/* Send button — sits inside the input box */}
              <button
                type="button"
                onClick={submitMessage}
                disabled={isSubmitting || !newMessage.trim()}
                aria-label="Send message"
                aria-busy={isSubmitting}
                style={{
                  width: "32px", height: "32px",
                  borderRadius: "8px",
                  background: newMessage.trim() ? "var(--nw-gradient)" : "var(--nw-g-300)",
                  border: "none",
                  cursor: isSubmitting || !newMessage.trim() ? "wait" : "pointer",
                  opacity: isSubmitting ? 0.75 : 1,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                  transition: "background 0.15s",
                }}
              >
                {isSubmitting ? (
                  <span style={{ width: "12px", height: "12px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.45)", borderTopColor: "white", animation: "nw-dot 0.8s linear infinite" }} />
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                )}
              </button>
            </div>


          </div>
        </>
      )}
    </div>
  );

  // ─── State 2: Minimized — small floating card ─────────────────────────────

  if (chatState === "minimized") {
    return (
      <div
        id="nexus-widget-root"
        className="nw-minimized"
        style={{
          position: "fixed",
          bottom: "24px", right: "24px",
          width: "min(380px, calc(100vw - 32px))",
          height: "520px",
          borderRadius: "16px",
          background: "#ffffff",
          boxShadow: "var(--nw-shadow-lg)",
          border: "1px solid var(--nw-g-200)",
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
      id="nexus-widget-root"
      className="nw-maximized"
      style={{
        position: "fixed",
        top: 0, right: 0, bottom: 0,
        width: "min(45%, 480px)",
        background: "#ffffff",
        boxShadow: "-4px 0 24px rgba(0,0,0,0.08)",
        borderLeft: "1px solid var(--nw-g-200)",
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