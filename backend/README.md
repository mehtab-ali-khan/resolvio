# Backend

Django backend for tickets and chat messages.

```txt
core/  Django project settings
app/   Django app for ticket features
```

## Current Features

- Ticket and message database models.
- Create ticket with first customer message.
- List tickets for the agent dashboard.
- View ticket details with conversation messages.
- Add agent reply to a ticket.
- Pytest coverage for the current ticket flow.

## Local Development

```bash
python3 manage.py migrate
python3 manage.py runserver
```

## Tests

```bash
pytest
```

## API Endpoints

```txt
GET  /api/tickets/
POST /api/tickets/
GET  /api/tickets/<id>/
POST /api/tickets/<id>/messages/
```

## Deployment Note

This app will be deployed separately from the frontend, likely on EC2, so the
widget and dashboard can talk to a public API instead of `localhost`.
