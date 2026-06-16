from django.db import transaction

from .models import Message, Ticket


def create_ticket_with_message(*, api_key, customer_name, customer_email, message):
    customer_name = customer_name.strip()
    customer_email = customer_email.strip()
    message = message.strip()

    with transaction.atomic():
        ticket = Ticket.objects.create(
            company=api_key,  # api_key is actually a Company instance after validation
            customer_name=customer_name,
            customer_email=customer_email,
        )
        Message.objects.create(
            ticket=ticket,
            sender_type=Message.SenderType.CUSTOMER,
            body=message,
        )

    return ticket


def add_agent_reply(*, ticket, message):
    return Message.objects.create(
        ticket=ticket,
        sender_type=Message.SenderType.AGENT,
        body=message.strip(),
    )


def add_customer_message(*, ticket, message):
    return Message.objects.create(
        ticket=ticket,
        sender_type=Message.SenderType.CUSTOMER,
        body=message.strip(),
    )
