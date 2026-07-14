# backend/app/services.py

import logging
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction
from .ai.answering import answer_question
from .ai.indexing import index_article
from .models import KnowledgeBaseArticle, Message, Ticket

logger = logging.getLogger(__name__)
channel_layer = get_channel_layer()


def _push_to_agents(company_id, data):
    """
    Sends a real-time update to all agents currently connected to
    the dashboard for this company. Uses async_to_sync because our
    service functions are regular synchronous Python, but channel
    layer communication is async.
    """
    async_to_sync(channel_layer.group_send)(
        f"company_{company_id}",
        {
            "type": "ticket_update",
            "data": data,
        },
    )


def _push_to_widget(ticket_id, data):
    """
    Sends a real-time update to the customer's widget for a specific
    ticket — so they see the agent/AI reply instantly without polling.
    """
    async_to_sync(channel_layer.group_send)(
        f"ticket_{ticket_id}",
        {
            "type": "new_message",
            "data": data,
        },
    )


def create_ticket_with_message(*, company, customer_name, customer_email, message):
    customer_name = customer_name.strip()
    customer_email = customer_email.strip()
    message = message.strip()

    logger.info(
        "Creating ticket: company_id=%s customer_email=%s",
        company.id,
        customer_email,
    )

    with transaction.atomic():
        ticket = (
            Ticket.objects.filter(company=company, customer_email=customer_email)
            .order_by("-created_at")
            .first()
        )

        is_new_ticket = ticket is None

        if is_new_ticket:
            ticket = Ticket.objects.create(
                company=company,
                customer_name=customer_name,
                customer_email=customer_email,
            )

        Message.objects.create(
            ticket=ticket,
            sender_type=Message.SenderType.CUSTOMER,
            body=message,
        )

    logger.info(
        "Customer message stored: ticket_id=%s is_new_ticket=%s",
        ticket.id,
        is_new_ticket,
    )

    _push_to_agents(
        company.id,
        {
            "type": "ticket_update",
            "ticket_id": ticket.id,
            "is_new_ticket": is_new_ticket,
        },
    )

    _attempt_ai_reply(ticket=ticket, question=message)

    return ticket


def _attempt_ai_reply(*, ticket, question):
    try:
        outcome = answer_question(
            company=ticket.company, question=question, ticket=ticket
        )
    except Exception:
        logger.exception("AI reply attempt failed for ticket #%s", ticket.id)
        return

    if not outcome.attempted:
        return

    message = Message.objects.create(
        ticket=ticket,
        sender_type=Message.SenderType.AI,
        body=outcome.answer_text,
        is_internal=not outcome.visible_to_customer,
        ai_confidence=outcome.confidence,
    )

    _push_to_agents(
        ticket.company_id,
        {
            "type": "new_message",
            "ticket_id": ticket.id,
            "message": {
                "id": message.id,
                "sender_type": message.sender_type,
                "body": message.body,
                "is_internal": message.is_internal,
                "ai_confidence": message.ai_confidence,
                "created_at": message.created_at.isoformat(),
            },
        },
    )

    if outcome.visible_to_customer:
        _push_to_widget(
            ticket.id,
            {
                "type": "new_message",
                "message": {
                    "id": message.id,
                    "sender_type": message.sender_type,
                    "body": message.body,
                    "created_at": message.created_at.isoformat(),
                },
            },
        )


def add_agent_reply(*, ticket, message):
    message = message.strip()
    created_message = Message.objects.create(
        ticket=ticket,
        sender_type=Message.SenderType.AGENT,
        body=message,
    )

    logger.info(
        "Agent reply stored: ticket_id=%s message_id=%s",
        ticket.id,
        created_message.id,
    )

    _push_to_agents(
        ticket.company_id,
        {
            "type": "new_message",
            "ticket_id": ticket.id,
            "message": {
                "id": created_message.id,
                "sender_type": created_message.sender_type,
                "body": created_message.body,
                "is_internal": created_message.is_internal,
                "ai_confidence": created_message.ai_confidence,
                "created_at": created_message.created_at.isoformat(),
            },
        },
    )

    _push_to_widget(
        ticket.id,
        {
            "type": "new_message",
            "message": {
                "id": created_message.id,
                "sender_type": created_message.sender_type,
                "body": created_message.body,
                "created_at": created_message.created_at.isoformat(),
            },
        },
    )

    return created_message


def add_customer_message(*, ticket, message):
    message = message.strip()
    created_message = Message.objects.create(
        ticket=ticket,
        sender_type=Message.SenderType.CUSTOMER,
        body=message,
    )

    logger.info(
        "Customer message stored: ticket_id=%s message_id=%s",
        ticket.id,
        created_message.id,
    )

    _push_to_agents(
        ticket.company_id,
        {
            "type": "new_message",
            "ticket_id": ticket.id,
            "message": {
                "id": created_message.id,
                "sender_type": created_message.sender_type,
                "body": created_message.body,
                "is_internal": False,
                "ai_confidence": None,
                "created_at": created_message.created_at.isoformat(),
            },
        },
    )

    _attempt_ai_reply(ticket=ticket, question=message)

    return created_message


def create_knowledge_base_article(*, company, title, body):
    try:
        article = KnowledgeBaseArticle.objects.create(
            company=company,
            title=title.strip(),
            body=body.strip(),
        )
        index_article(article)
    except Exception:
        logger.exception(
            "Knowledge base article create failed: company_id=%s",
            company.id,
        )
        raise

    logger.info(
        "Knowledge base article created: article_id=%s company_id=%s",
        article.id,
        company.id,
    )
    return article


def update_knowledge_base_article(*, article, title, body):
    try:
        article.title = title.strip()
        article.body = body.strip()
        article.save(update_fields=["title", "body", "updated_at"])
        index_article(article)
    except Exception:
        logger.exception(
            "Knowledge base article update failed: article_id=%s company_id=%s",
            article.id,
            article.company_id,
        )
        raise

    logger.info(
        "Knowledge base article updated: article_id=%s company_id=%s",
        article.id,
        article.company_id,
    )
    return article
