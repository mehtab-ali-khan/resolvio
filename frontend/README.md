# Frontend

React app for the agent dashboard and chat widget source.

## Current Features

- Demo website page.
- Chat widget form for customer name, email, and complaint.
- Ticket creation API call.
- Agent dashboard ticket list.
- Ticket detail conversation view.
- Agent reply form.

## Local Development

```bash
npm install
npm run dev
```

The chat widget sends new complaints to the Django backend at:

```txt
http://localhost:8000/api/tickets/
```

The dashboard also reads ticket data from:

```txt
GET http://localhost:8000/api/tickets/
GET http://localhost:8000/api/tickets/<id>/
```

Agent replies are sent to:

```txt
POST http://localhost:8000/api/tickets/<id>/messages/
```

## Main Files

```txt
src/App.jsx                         Demo page shell
src/components/ChatWidget.jsx       Customer complaint widget
src/components/AgentDashboard.jsx   Agent ticket list and conversation view
src/api/tickets.js                  Ticket API functions
```
