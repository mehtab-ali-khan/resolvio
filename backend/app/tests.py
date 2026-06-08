import json

import pytest
from django.urls import reverse

from .models import Message, Ticket


@pytest.mark.django_db
def test_customer_message_creates_ticket_and_message(client):
    response = client.post(
        reverse("ticket-create"),
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
        reverse("ticket-create"),
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
