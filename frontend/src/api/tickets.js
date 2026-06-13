const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";


export async function listTickets() {
  const response = await fetch(`${API_BASE_URL}/api/tickets/`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Tickets could not be loaded.");
  }

  return data;
}


export async function getTicket(ticketId) {
  const response = await fetch(`${API_BASE_URL}/api/tickets/${ticketId}/`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Ticket could not be loaded.");
  }

  return data;
}


export async function updateTicketStatus(ticketId, status) {
  const response = await fetch(`${API_BASE_URL}/api/tickets/${ticketId}/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || data.status?.[0] || "Ticket status could not be updated.");
  }

  return data;
}


export async function createAgentReply(ticketId, payload) {
  const response = await fetch(`${API_BASE_URL}/api/tickets/${ticketId}/messages/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Reply could not be sent.");
  }

  return data;
}


export async function createCustomerMessage(ticketId, payload) {
  const response = await fetch(
    `${API_BASE_URL}/api/tickets/${ticketId}/customer-messages/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Message could not be sent.");
  }

  return data;
}


export async function createTicket(payload) {
  const response = await fetch(`${API_BASE_URL}/api/tickets/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Ticket could not be created.");
  }

  return data;
}
