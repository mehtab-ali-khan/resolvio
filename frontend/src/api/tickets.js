const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ─── Token helpers ────────────────────────────────────────────────────────────

export function getToken() {
  return localStorage.getItem("nexus_access_token");
}

export function setTokens({ access, refresh }) {
  localStorage.setItem("nexus_access_token", access);
  localStorage.setItem("nexus_refresh_token", refresh);
}

export function clearTokens() {
  localStorage.removeItem("nexus_access_token");
  localStorage.removeItem("nexus_refresh_token");
  localStorage.removeItem("nexus_user");
}

export function getUser() {
  const raw = localStorage.getItem("nexus_user");
  return raw ? JSON.parse(raw) : null;
}

function setUser(user) {
  localStorage.setItem("nexus_user", JSON.stringify(user));
}

// ─── Token helpers (add this one) ────────────────────────────────────────────

function getRefreshToken() {
  return localStorage.getItem("nexus_refresh_token");
}

// ─── Refresh access token ─────────────────────────────────────────────────────

async function refreshAccessToken() {
  const refresh = getRefreshToken();
  if (!refresh) throw new Error("No refresh token.");

  const response = await fetch(`${API_BASE}/api/auth/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });

  if (!response.ok) {
    // Refresh token itself expired — force logout
    clearTokens();
    window.location.href = "/login";
    throw new Error("Session expired. Please log in again.");
  }

  const data = await response.json();
  localStorage.setItem("nexus_access_token", data.access); // only access token comes back
  return data.access;
}

// ─── Base fetch ───────────────────────────────────────────────────────────────

async function apiFetch(path, options = {}, withAuth = false) {
  const headers = { "Content-Type": "application/json", ...options.headers };

  if (withAuth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });

  // Token expired — try refreshing once then retry
  if (response.status === 401 && withAuth) {
    try {
      const newToken = await refreshAccessToken();
      headers["Authorization"] = `Bearer ${newToken}`;
      const retryResponse = await fetch(`${API_BASE}${path}`, { ...options, headers });
      const retryData = await retryResponse.json();

      if (!retryResponse.ok) {
        const message =
          retryData.detail ||
          retryData.non_field_errors?.[0] ||
          Object.values(retryData)?.[0]?.[0] ||
          "Something went wrong.";
        throw new Error(message);
      }

      return retryData;
    } catch {
      // refreshAccessToken already cleared tokens and redirected
      throw new Error("Session expired. Please log in again.");
    }
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

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function signup(payload) {
  const data = await apiFetch("/api/auth/signup/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  setTokens(data);
  setUser(data.user);
  return data;
}

export async function login(payload) {
  const data = await apiFetch("/api/auth/login/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  setTokens(data);

  // fetch user profile after login
  const user = await apiFetch("/api/auth/me/", {}, true);
  setUser(user);
  return data;
}

export async function logout() {
  clearTokens();
}

// ─── Agent API (auth required) ────────────────────────────────────────────────

export async function listTickets() {
  return apiFetch("/api/tickets/", {}, true);
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
  // payload must include api_key from the embed config
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