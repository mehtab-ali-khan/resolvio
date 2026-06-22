// frontend/src/api/tickets.js

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ─── Token helpers ────────────────────────────────────────────────────────────

export function getToken() {
  return localStorage.getItem("nexus_access_token");
}

export function setAccessToken(access) {
  localStorage.setItem("nexus_access_token", access);
}

export function clearTokens() {
  localStorage.removeItem("nexus_access_token");
  localStorage.removeItem("nexus_user");
}

export function getUser() {
  const raw = localStorage.getItem("nexus_user");
  return raw ? JSON.parse(raw) : null;
}

function setUser(user) {
  localStorage.setItem("nexus_user", JSON.stringify(user));
}

async function refreshAccessToken() {
  const response = await fetch(`${API_BASE}/api/auth/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  if (!response.ok) {
    clearTokens();
    window.location.href = "/login";
    throw new Error("Session expired. Please log in again.");
  }

  const data = await response.json();
  setAccessToken(data.access);
  return data.access;
}

// ─── Response parsing ──────────────────────────────────────────────────────────
// Separated out because DELETE requests return 204 No Content - an empty
// body that response.json() cannot parse. Both the normal path and the
// retry-after-refresh path need this same handling, so it lives in one place.

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

export async function apiFetch(path, options = {}, withAuth = false) {
  const headers = { "Content-Type": "application/json", ...options.headers };

  if (withAuth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (response.status === 401 && withAuth) {
    try {
      const newToken = await refreshAccessToken();
      headers["Authorization"] = `Bearer ${newToken}`;
      const retryResponse = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
        credentials: "include",
      });
      return await parseResponse(retryResponse);
    } catch {
      throw new Error("Session expired. Please log in again.");
    }
  }

  return await parseResponse(response);
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function signup(payload) {
  const data = await apiFetch("/api/auth/signup/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  setAccessToken(data.access);
  setUser(data.user);
  return data;
}

export async function login(payload) {
  const data = await apiFetch("/api/auth/login/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  setAccessToken(data.access);

  const user = await apiFetch("/api/auth/me/", {}, true);
  setUser(user);
  return data;
}

export async function logout() {
  try {
    await fetch(`${API_BASE}/api/auth/logout/`, {
      method: "POST",
      credentials: "include",
    });
  } finally {
    clearTokens();
  }
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