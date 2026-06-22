import logging
from django.db import transaction
from .ai.answering import answer_question
from .ai.indexing import index_article
from .models import KnowledgeBaseArticle, Message, Ticket

logger = logging.getLogger(__name__)


def create_ticket_with_message(*, company, customer_name, customer_email, message):
    customer_name = customer_name.strip()
    customer_email = customer_email.strip()
    message = message.strip()

    with transaction.atomic():
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
    Tries to have the AI answer the customer's first message. This must
    never be allowed to break ticket creation - if anything here fails,
    the ticket still exists and simply waits for a human agent, exactly
    as if the AI feature didn't exist at all.
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
    return Message.objects.create(
        ticket=ticket,
        sender_type=Message.SenderType.CUSTOMER,
        body=message.strip(),
    )


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
