// frontend/src/api/tickets.js

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ─── Token helper ──────────────────────────────────────────────────────────
// Only one thing is ever stored: the token itself. No user object, no
// refresh token. Anything about "who is this user" is fetched fresh from
// /api/auth/me/ whenever it's needed.

const TOKEN_KEY = "nexus_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// ─── Response parsing ──────────────────────────────────────────────────────
// Separated out because DELETE requests return 204 No Content - an empty
// body that response.json() cannot parse.

async function parseResponse(response) {
  if (response.status === 204) {
    if (!response.ok) {
      throw new Error("Something went wrong.");
    }
    return null;
  }

  const data = await response.json();

  if (!response.ok) {
    const message =
      data.detail ||
      data.non_field_errors?.[0] ||
      Object.values(data)?.[0]?.[0] ||
      "Something went wrong.";
    throw new Error(message);
  }

  return data;
}

// ─── Base fetch ───────────────────────────────────────────────────────────────
// No more "withAuth" retry-after-refresh dance. If the token is invalid or
// missing, the backend just returns 401 and the caller deals with it -
// usually by sending the person back to /login.

export async function apiFetch(path, options = {}, withAuth = false) {
  const headers = { "Content-Type": "application/json", ...options.headers };

  if (withAuth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Token ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (response.status === 401 && withAuth) {
    clearToken();
    window.location.href = "/login";
    throw new Error("Session expired. Please log in again.");
  }

  return await parseResponse(response);
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function signup(payload) {
  const data = await apiFetch("/api/auth/signup/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  setToken(data.token);
  return data;
}

export async function login(payload) {
  const data = await apiFetch("/api/auth/login/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  setToken(data.token);
  return data;
}

export function logout() {
  // No backend call at all - logging out only clears this device's
  // storage. The token in the database is untouched, so any other device
  // still logged in with the same token keeps working.
  clearToken();
}

export async function getCurrentUser() {
  return apiFetch("/api/auth/me/", {}, true);
}

// ─── Agent API (auth required) ────────────────────────────────────────────────

export async function listTickets(page = 1) {
  return apiFetch(`/api/tickets/?page=${page}`, {}, true);
}

export async function getTicketById(ticketId) {
  return apiFetch(`/api/tickets/${ticketId}/`, {}, true);
}

export async function updateTicketStatus(ticketId, status) {
  return apiFetch(`/api/tickets/${ticketId}/`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  }, true);
}

export async function createAgentReply(ticketId, payload) {
  return apiFetch(`/api/tickets/${ticketId}/agent-messages/`, {
    method: "POST",
    body: JSON.stringify(payload),
  }, true);
}

// ─── Widget / customer API (no auth, uses access_token UUID) ─────────────────

export async function createTicket(payload) {
  return apiFetch("/api/tickets/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getTicketByToken(accessToken) {
  return apiFetch(`/api/widget/tickets/${accessToken}/`);
}

export async function createCustomerMessage(accessToken, payload) {
  return apiFetch(`/api/widget/tickets/${accessToken}/messages/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}