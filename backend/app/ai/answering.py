# backend/app/ai/answering.py

import logging
from dataclasses import dataclass
from pgvector.django import CosineDistance

from .base import TokenUsage
from .factory import get_embedding_provider, get_generation_provider
from ..models import ArticleChunk

logger = logging.getLogger(__name__)


TOP_K = 5
SIMILARITY_THRESHOLD = 0.5
CONFIDENCE_THRESHOLD = 70

CONNECTING_MESSAGE = (
    "Thanks for reaching out! I've passed this along to our support team "
    "and someone will follow up with you shortly."
)


@dataclass
class AnswerOutcome:
    """
    What the RAG pipeline decided about a customer's question.
    This module deliberately knows nothing about tickets or messages -
    the caller turns this outcome into actual Message rows, THEN logs
    usage against them, since messages don't exist yet while we're
    still inside this function.

    requires_escalation=True means TWO messages should be created by the
    caller: an internal draft (draft_text, for agent review) and a
    customer-visible one (customer_text, a generic "connecting you"
    message) - since the real AI answer isn't confident/available enough
    to show the customer directly.
    """

    classification: str
    requires_escalation: bool
    customer_text: str
    draft_text: str | None
    confidence: float

    question_embedding_usage: TokenUsage
    question_embedding_model: str

    answer_usage: TokenUsage | None = None
    answer_model_name: str | None = None


def answer_question(*, company, question: str) -> AnswerOutcome:
    embedding_provider = get_embedding_provider()
    generation_provider = get_generation_provider()

    logger.info(
        "AI answer requested: company_id=%s question_length=%s",
        company.id,
        len(question.strip()),
    )

    question_embedding, embed_usage = embedding_provider.embed_text(question)

    closest_chunks = list(
        ArticleChunk.objects.filter(company=company)
        .annotate(distance=CosineDistance("embedding", question_embedding))
        .order_by("distance")[:TOP_K]
    )

    if closest_chunks:
        best_similarity = 1 - closest_chunks[0].distance
    else:
        best_similarity = 0.0

    if closest_chunks and best_similarity >= SIMILARITY_THRESHOLD:
        chunk_texts = [chunk.content for chunk in closest_chunks]
        logger.info(
            "Gate 1 passed: best similarity %.2f - passing real context",
            best_similarity,
        )
    else:
        chunk_texts = []
        logger.info(
            "Gate 1: no strong match (best similarity %.2f) - passing empty context",
            best_similarity,
        )

    result, answer_usage = generation_provider.generate_answer(
        question=question, context_chunks=chunk_texts
    )

    logger.info(
        "Classification: %s can_answer=%s confidence=%s",
        result.classification,
        result.can_answer,
        result.confidence,
    )

    if result.classification in ("greeting", "off_topic"):
        requires_escalation = False
        customer_text = result.answer
        draft_text = None
    elif (
        result.classification == "in_context"
        and result.confidence >= CONFIDENCE_THRESHOLD
    ):
        requires_escalation = False
        customer_text = result.answer
        draft_text = None
    else:
        # in_context but not confident enough, or on_topic_no_answer -
        # either way, don't show the AI's raw attempt to the customer.
        requires_escalation = True
        customer_text = CONNECTING_MESSAGE
        draft_text = result.answer

    logger.info(
        "AI reply decided: company_id=%s classification=%s requires_escalation=%s",
        company.id,
        result.classification,
        requires_escalation,
    )

    return AnswerOutcome(
        classification=result.classification,
        requires_escalation=requires_escalation,
        customer_text=customer_text,
        draft_text=draft_text,
        confidence=result.confidence,
        question_embedding_usage=embed_usage,
        question_embedding_model=embedding_provider.embedding_model_name,
        answer_usage=answer_usage,
        answer_model_name=generation_provider.generation_model_name,
    )
