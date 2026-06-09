# Frontend

React app for the agent dashboard and chat widget source.

## Current Features

- Chat widget form for customer name, email, and complaint.
- Ticket creation API call.
- Agent dashboard ticket list.
- Ticket detail conversation view.
- Agent reply form.
- Standalone `widget.js` bundle for embedding on any website.
- Widget launcher opens and closes from the bottom-right corner.

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

Build the embeddable widget bundle:

```bash
npm run build:widget
```

If you deploy `frontend/` to Vercel or Netlify, the built `widget.js` can be
served from the same deployment as a public script file.

## Main Files

```txt
src/App.jsx                         Demo page shell
src/components/ChatWidget.jsx       Customer complaint widget
src/components/AgentDashboard.jsx   Agent ticket list and conversation view
src/api/tickets.js                  Ticket API functions
src/widget.js                       Widget bundle entry point
widget.vite.config.js               Widget build config
```
