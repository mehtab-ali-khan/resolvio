const API_BASE_URL = "http://localhost:8000";


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
