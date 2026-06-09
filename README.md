# Nexus Support AI

A small customer support ticket platform built step by step.

## Product Goal

Build a simple support flow for a small business:

1. A customer sends a message from a website chat widget.
2. The backend creates a support ticket.
3. An agent sees the ticket in the dashboard.
4. The agent replies.
5. The conversation stays attached to the ticket.

## Project Structure

```txt
backend/   Django API, database models, and ticket/message logic
frontend/  React agent dashboard and embeddable widget build
```

## Current Features

- Customer can submit a complaint from the React chat widget.
- Django creates a `Ticket` and first customer `Message`.
- Agent dashboard can list incoming tickets.
- Agent can open a ticket and view the conversation.
- Agent can send a reply into the ticket conversation.
- Widget state persists in localStorage so the conversation continues after reload.

- `backend/core`: Django project settings.
- `backend/app`: Django app for tickets and messages.
- `Ticket`: one customer complaint.
- `Message`: one message inside a ticket conversation.

## Local Development

Run the backend:

```bash
cd backend
python3 manage.py migrate
python3 manage.py runserver
```

Run the frontend in another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open:

```txt
http://localhost:5173
```

## API Endpoints

```txt
GET  /api/tickets/                List tickets
POST /api/tickets/                Create ticket with first customer message
GET  /api/tickets/<id>/           View ticket with conversation messages
POST /api/tickets/<id>/messages/  Add agent reply
```

## Tests

```bash
cd backend
pytest
```

## Deployment Plan

- `frontend/` will deploy to Vercel and serve the dashboard plus `widget.js`.
- `backend/` will deploy to EC2 and expose the Django API publicly.
- Customer websites will load the widget with a public script URL.
