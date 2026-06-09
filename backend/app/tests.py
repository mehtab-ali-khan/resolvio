import json

import pytest
from django.urls import reverse

from .models import Message, Ticket


@pytest.mark.django_db
def test_customer_message_creates_ticket_and_message(client):
    response = client.post(
        reverse("ticket-list-create"),
        data=json.dumps(
            {
                "customer_name": "Ali Khan",
                "customer_email": "ali@example.com",
                "message": "My order has not arrived.",
            }
        ),
        content_type="application/json",
    )

    assert response.status_code == 201
    assert Ticket.objects.count() == 1
    assert Message.objects.count() == 1

    ticket = Ticket.objects.get()
    message = Message.objects.get()

    assert ticket.customer_name == "Ali Khan"
    assert ticket.customer_email == "ali@example.com"
    assert ticket.status == Ticket.Status.OPEN
    assert message.ticket == ticket
    assert message.sender_type == Message.SenderType.CUSTOMER
    assert message.body == "My order has not arrived."


@pytest.mark.django_db
def test_message_is_required(client):
    response = client.post(
        reverse("ticket-list-create"),
        data=json.dumps(
            {
                "customer_name": "Ali Khan",
                "customer_email": "ali@example.com",
                "message": "",
            }
        ),
        content_type="application/json",
    )

    assert response.status_code == 400
    assert Ticket.objects.count() == 0


@pytest.mark.django_db
def test_agent_can_list_tickets(client):
    Ticket.objects.create(
        customer_name="Ali Khan",
        customer_email="ali@example.com",
    )

    response = client.get(reverse("ticket-list-create"))

    assert response.status_code == 200
    tickets = response.json()

    assert len(tickets) == 1
    assert tickets[0]["customer_name"] == "Ali Khan"
    assert tickets[0]["customer_email"] == "ali@example.com"
    assert tickets[0]["status"] == Ticket.Status.OPEN
    assert "id" in tickets[0]
    assert "created_at" in tickets[0]


@pytest.mark.django_db
def test_agent_can_view_ticket_detail_with_messages(client):
    ticket = Ticket.objects.create(
        customer_name="Ali Khan",
        customer_email="ali@example.com",
    )
    Message.objects.create(
        ticket=ticket,
        sender_type=Message.SenderType.CUSTOMER,
        body="My order has not arrived.",
    )

    response = client.get(reverse("ticket-detail", kwargs={"pk": ticket.id}))

    assert response.status_code == 200
    data = response.json()

    assert data["id"] == ticket.id
    assert data["customer_name"] == "Ali Khan"
    assert data["customer_email"] == "ali@example.com"
    assert data["status"] == Ticket.Status.OPEN
    assert len(data["messages"]) == 1
    assert data["messages"][0]["sender_type"] == Message.SenderType.CUSTOMER
    assert data["messages"][0]["body"] == "My order has not arrived."


@pytest.mark.django_db
def test_agent_can_reply_to_ticket(client):
    ticket = Ticket.objects.create(
        customer_name="Ali Khan",
        customer_email="ali@example.com",
    )

    response = client.post(
        reverse("agent-reply-create", kwargs={"pk": ticket.id}),
        data=json.dumps({"message": "We are checking this for you."}),
        content_type="application/json",
    )

    assert response.status_code == 201
    assert Message.objects.count() == 1

    message = Message.objects.get()

    assert message.ticket == ticket
    assert message.sender_type == Message.SenderType.AGENT
    assert message.body == "We are checking this for you."


@pytest.mark.django_db
def test_customer_can_add_message_to_existing_ticket(client):
    ticket = Ticket.objects.create(
        customer_name="Ali Khan",
        customer_email="ali@example.com",
    )

    response = client.post(
        reverse("customer-message-create", kwargs={"pk": ticket.id}),
        data=json.dumps({"message": "My order number is 12345."}),
        content_type="application/json",
    )

    assert response.status_code == 201
    assert Message.objects.count() == 1

    message = Message.objects.get()

    assert message.ticket == ticket
    assert message.sender_type == Message.SenderType.CUSTOMER
    assert message.body == "My order number is 12345."
