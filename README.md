# Nexus Support AI

A small customer support ticket platform built step by step.

## First Goal

Build the smallest useful chat support flow:

1. A customer sends a message from a website chat widget.
2. The backend creates a support ticket.
3. An agent sees the ticket in the dashboard.
4. The agent replies.
5. The customer sees the reply in the widget.

## Project Structure

```txt
backend/   Django API, database models, and later WebSockets
frontend/  React support software dashboard and widget source
demo/      Simple business website that loads the widget
```

## Current Step

We are starting with the backend data model only:

- `backend/core`: Django project settings.
- `backend/app`: Django app for tickets and messages.
- `Ticket`: one customer complaint.
- `Message`: one message inside a ticket conversation.
