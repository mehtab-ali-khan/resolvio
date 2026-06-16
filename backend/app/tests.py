import json
import pytest

from django.urls import reverse
from rest_framework.test import APIClient

from .models import Company, Message, Ticket, User

# ─── Fixtures ────────────────────────────────────────────────────────────────


@pytest.fixture
def company():
    return Company.objects.create(name="Acme Inc")


@pytest.fixture
def agent(company):
    return User.objects.create_user(
        email="agent@acme.com",
        password="testpass123",
        first_name="John",
        last_name="Doe",
        company=company,
        role="agent",
    )


@pytest.fixture
def auth_client(agent):
    """Authenticated API client for agent."""
    client = APIClient()
    client.force_authenticate(user=agent)
    return client


@pytest.fixture
def anon_client():
    """Unauthenticated API client for customer/widget."""
    return APIClient()


@pytest.fixture
def ticket(company):
    return Ticket.objects.create(
        company=company,
        customer_name="Ali Khan",
        customer_email="ali@example.com",
    )


# ─── Auth ────────────────────────────────────────────────────────────────────


@pytest.mark.django_db
def test_signup_creates_company_and_owner(anon_client):
    response = anon_client.post(
        reverse("signup"),
        data={
            "company_name": "New Corp",
            "first_name": "Jane",
            "last_name": "Smith",
            "email": "jane@newcorp.com",
            "password": "securepass123",
        },
        format="json",
    )

    assert response.status_code == 201
    data = response.json()

    assert "access" in data
    assert "refresh" in data
    assert data["user"]["email"] == "jane@newcorp.com"
    assert data["user"]["role"] == "owner"
    assert data["user"]["company_name"] == "New Corp"
    assert "company_api_key" in data["user"]

    assert Company.objects.filter(name="New Corp").exists()
    assert User.objects.filter(email="jane@newcorp.com").exists()


@pytest.mark.django_db
def test_signup_rejects_duplicate_email(anon_client, agent):
    response = anon_client.post(
        reverse("signup"),
        data={
            "company_name": "Another Corp",
            "first_name": "Jane",
            "last_name": "Smith",
            "email": "agent@acme.com",  # already exists
            "password": "securepass123",
        },
        format="json",
    )

    assert response.status_code == 400


@pytest.mark.django_db
def test_login_returns_tokens(anon_client, agent):
    response = anon_client.post(
        reverse("login"),
        data={"email": "agent@acme.com", "password": "testpass123"},
        format="json",
    )

    assert response.status_code == 200
    assert "access" in response.json()
    assert "refresh" in response.json()


@pytest.mark.django_db
def test_login_rejects_wrong_password(anon_client, agent):
    response = anon_client.post(
        reverse("login"),
        data={"email": "agent@acme.com", "password": "wrongpassword"},
        format="json",
    )

    assert response.status_code == 401


# ─── Ticket creation (widget / customer) ─────────────────────────────────────


@pytest.mark.django_db
def test_widget_creates_ticket_with_valid_api_key(anon_client, company):
    response = anon_client.post(
        reverse("ticket-list-create"),
        data={
            "api_key": str(company.api_key),
            "customer_name": "Ali Khan",
            "customer_email": "ali@example.com",
            "message": "My order has not arrived.",
        },
        format="json",
    )

    assert response.status_code == 201
    data = response.json()
    assert "ticket_id" in data
    assert "access_token" in data
    assert data["status"] == Ticket.Status.OPEN

    assert Ticket.objects.count() == 1
    assert Message.objects.count() == 1

    ticket = Ticket.objects.get()
    message = Message.objects.get()

    assert ticket.company == company
    assert ticket.customer_name == "Ali Khan"
    assert message.sender_type == Message.SenderType.CUSTOMER
    assert message.body == "My order has not arrived."


@pytest.mark.django_db
def test_widget_rejects_invalid_api_key(anon_client):
    response = anon_client.post(
        reverse("ticket-list-create"),
        data={
            "api_key": "00000000-0000-0000-0000-000000000000",
            "customer_name": "Ali Khan",
            "customer_email": "ali@example.com",
            "message": "Help!",
        },
        format="json",
    )

    assert response.status_code == 400
    assert Ticket.objects.count() == 0


@pytest.mark.django_db
def test_widget_rejects_empty_message(anon_client, company):
    response = anon_client.post(
        reverse("ticket-list-create"),
        data={
            "api_key": str(company.api_key),
            "customer_name": "Ali Khan",
            "customer_email": "ali@example.com",
            "message": "",
        },
        format="json",
    )

    assert response.status_code == 400
    assert Ticket.objects.count() == 0


# ─── Agent ticket list ────────────────────────────────────────────────────────


@pytest.mark.django_db
def test_agent_can_list_own_company_tickets(auth_client, ticket):
    response = auth_client.get(reverse("ticket-list-create"))

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["customer_name"] == "Ali Khan"
    assert data[0]["status"] == Ticket.Status.OPEN
    assert "id" in data[0]
    assert "created_at" in data[0]


@pytest.mark.django_db
def test_agent_cannot_see_other_company_tickets(auth_client):
    other_company = Company.objects.create(name="Other Corp")
    Ticket.objects.create(
        company=other_company,
        customer_name="Bob",
        customer_email="bob@other.com",
    )

    response = auth_client.get(reverse("ticket-list-create"))

    assert response.status_code == 200
    assert len(response.json()) == 0  # agent sees nothing from other company


@pytest.mark.django_db
def test_unauthenticated_agent_cannot_list_tickets(anon_client, ticket):
    response = anon_client.get(reverse("ticket-list-create"))
    assert response.status_code == 401


# ─── Agent ticket detail & status update ─────────────────────────────────────


@pytest.mark.django_db
def test_agent_can_update_ticket_status(auth_client, ticket):
    response = auth_client.patch(
        reverse("ticket-detail", kwargs={"pk": ticket.id}),
        data={"status": Ticket.Status.IN_PROGRESS},
        format="json",
    )

    assert response.status_code == 200
    assert response.json()["status"] == Ticket.Status.IN_PROGRESS

    ticket.refresh_from_db()
    assert ticket.status == Ticket.Status.IN_PROGRESS


@pytest.mark.django_db
def test_agent_cannot_update_other_company_ticket(agent, ticket):
    other_company = Company.objects.create(name="Other Corp")
    other_agent = User.objects.create_user(
        email="other@corp.com",
        password="pass1234",
        first_name="Other",
        last_name="Agent",
        company=other_company,
        role="agent",
    )
    client = APIClient()
    client.force_authenticate(user=other_agent)

    response = client.patch(
        reverse("ticket-detail", kwargs={"pk": ticket.id}),
        data={"status": Ticket.Status.IN_PROGRESS},
        format="json",
    )

    assert response.status_code == 404  # scoped queryset hides it entirely
    ticket.refresh_from_db()
    assert ticket.status == Ticket.Status.OPEN


@pytest.mark.django_db
def test_agent_cannot_set_invalid_status(auth_client, ticket):
    response = auth_client.patch(
        reverse("ticket-detail", kwargs={"pk": ticket.id}),
        data={"status": "closed"},
        format="json",
    )

    assert response.status_code == 400
    ticket.refresh_from_db()
    assert ticket.status == Ticket.Status.OPEN


@pytest.mark.django_db
def test_unauthenticated_cannot_update_status(anon_client, ticket):
    response = anon_client.patch(
        reverse("ticket-detail", kwargs={"pk": ticket.id}),
        data={"status": Ticket.Status.RESOLVED},
        format="json",
    )

    assert response.status_code == 401


# ─── Agent reply ─────────────────────────────────────────────────────────────


@pytest.mark.django_db
def test_agent_can_reply_to_ticket(auth_client, ticket):
    response = auth_client.post(
        reverse("agent-reply", kwargs={"pk": ticket.id}),
        data={"message": "We are looking into this."},
        format="json",
    )

    assert response.status_code == 201
    data = response.json()
    assert data["sender_type"] == Message.SenderType.AGENT
    assert data["body"] == "We are looking into this."

    message = Message.objects.get()
    assert message.ticket == ticket


@pytest.mark.django_db
def test_agent_cannot_reply_to_other_company_ticket(agent, ticket):
    other_company = Company.objects.create(name="Other Corp")
    other_agent = User.objects.create_user(
        email="other@corp.com",
        password="pass1234",
        first_name="Other",
        last_name="Agent",
        company=other_company,
        role="agent",
    )
    client = APIClient()
    client.force_authenticate(user=other_agent)

    response = client.post(
        reverse("agent-reply", kwargs={"pk": ticket.id}),
        data={"message": "Sneaky reply."},
        format="json",
    )

    assert response.status_code == 404
    assert Message.objects.count() == 0


# ─── Customer / widget views (by access_token) ───────────────────────────────


@pytest.mark.django_db
def test_customer_can_view_ticket_by_access_token(anon_client, ticket):
    Message.objects.create(
        ticket=ticket,
        sender_type=Message.SenderType.CUSTOMER,
        body="My order has not arrived.",
    )

    response = anon_client.get(
        reverse("customer-ticket-detail", kwargs={"access_token": ticket.access_token})
    )

    assert response.status_code == 200
    data = response.json()
    assert data["customer_name"] == "Ali Khan"
    assert len(data["messages"]) == 1
    assert data["messages"][0]["body"] == "My order has not arrived."


@pytest.mark.django_db
def test_customer_can_send_message_by_access_token(anon_client, ticket):
    response = anon_client.post(
        reverse(
            "customer-message-create", kwargs={"access_token": ticket.access_token}
        ),
        data={"message": "My order number is 12345."},
        format="json",
    )

    assert response.status_code == 201
    data = response.json()
    assert data["sender_type"] == Message.SenderType.CUSTOMER
    assert data["body"] == "My order number is 12345."

    message = Message.objects.get()
    assert message.ticket == ticket


@pytest.mark.django_db
def test_customer_cannot_access_ticket_with_wrong_token(anon_client):
    response = anon_client.get(
        reverse(
            "customer-ticket-detail",
            kwargs={"access_token": "00000000-0000-0000-0000-000000000000"},
        )
    )

    assert response.status_code == 404


@pytest.mark.django_db
def test_unauthenticated_cannot_view_ticket_detail(anon_client, ticket):
    response = anon_client.get(reverse("ticket-detail", kwargs={"pk": ticket.id}))
    assert response.status_code == 401
