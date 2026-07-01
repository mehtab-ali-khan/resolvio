# backend/app/services.py

import logging
from django.db import transaction
from .ai.answering import answer_question
from .ai.indexing import index_article
from .models import KnowledgeBaseArticle, Message, Ticket

logger = logging.getLogger(__name__)


def create_ticket_with_message(*, company, customer_name, customer_email, message):
    """
    Finds or creates the ONE ticket for this email within this company.
    A visitor never ends up with two tickets just because they filled the
    widget form again on a new device or after clearing their browser -
    whatever they already have (open or resolved) is reused, so an agent
    never sees the same person split across tickets.
    """
    customer_name = customer_name.strip()
    customer_email = customer_email.strip()
    message = message.strip()

    with transaction.atomic():
        ticket = (
            Ticket.objects.filter(company=company, customer_email=customer_email)
            .order_by("-created_at")
            .first()
        )

        if ticket is None:
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

    _attempt_ai_reply(ticket=ticket, question=message)

    return ticket


def _attempt_ai_reply(*, ticket, question):
    """
    Tries to have the AI answer the customer's message. This runs on every
    customer message, not just the first - so the AI can keep helping
    through a whole conversation, not just greet once. It must never be
    allowed to break ticket creation or message sending - if anything here
    fails, the message still exists and simply waits for a human agent,
    exactly as if the AI feature didn't exist at all.
    """
    try:
        outcome = answer_question(company=ticket.company, question=question)
    except Exception:
        logger.exception("AI reply attempt failed for ticket #%s", ticket.id)
        return

    if not outcome.attempted:
        return  # Gate 1 failed, or no knowledge base chunks exist yet

    Message.objects.create(
        ticket=ticket,
        sender_type=Message.SenderType.AI,
        body=outcome.answer_text,
        is_internal=not outcome.visible_to_customer,
        ai_confidence=outcome.confidence,
    )


def add_agent_reply(*, ticket, message):
    return Message.objects.create(
        ticket=ticket,
        sender_type=Message.SenderType.AGENT,
        body=message.strip(),
    )


def add_customer_message(*, ticket, message):
    message = message.strip()
    created_message = Message.objects.create(
        ticket=ticket,
        sender_type=Message.SenderType.CUSTOMER,
        body=message,
    )

    _attempt_ai_reply(ticket=ticket, question=message)

    return created_message


def create_knowledge_base_article(*, company, title, body):
    article = KnowledgeBaseArticle.objects.create(
        company=company,
        title=title.strip(),
        body=body.strip(),
    )
    index_article(article)
    return article


def update_knowledge_base_article(*, article, title, body):
    article.title = title.strip()
    article.body = body.strip()
    article.save(update_fields=["title", "body", "updated_at"])
    index_article(article)
    return article
