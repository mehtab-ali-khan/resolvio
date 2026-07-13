# backend/app/ai/answering.py

import logging
from dataclasses import dataclass

from pgvector.django import CosineDistance

from .factory import get_ai_provider
from ..models import ArticleChunk  # field names agreed on, not yet written

logger = logging.getLogger(__name__)


TOP_K = 5
SIMILARITY_THRESHOLD = 0.5
CONFIDENCE_THRESHOLD = 70


@dataclass
class AnswerOutcome:
    """
    What the RAG pipeline decided about a customer's question.
    This module deliberately knows nothing about tickets or messages -
    the caller turns this outcome into an actual Message later.
    """

    attempted: bool  # False if Gate 1 stopped things before any LLM call
    visible_to_customer: bool
    answer_text: str | None
    confidence: float | None


def answer_question(*, company, question: str) -> AnswerOutcome:
    provider = get_ai_provider()
    logger.info(
        "AI answer requested: company_id=%s question_length=%s",
        company.id,
        len(question.strip()),
    )
    question_embedding = provider.embed_text(question)

    closest_chunks = list(
        ArticleChunk.objects.filter(company=company)
        .annotate(distance=CosineDistance("embedding", question_embedding))
        .order_by("distance")[:TOP_K]
    )

    if not closest_chunks:
        logger.info("Gate 1: no knowledge base chunks exist for this company yet")
        return AnswerOutcome(
            attempted=False,
            visible_to_customer=False,
            answer_text=None,
            confidence=None,
        )

    best_similarity = 1 - closest_chunks[0].distance

    if best_similarity < SIMILARITY_THRESHOLD:
        logger.info(
            "Gate 1 FAILED: best similarity %.2f is below threshold %.2f - skipping Gemini call",
            best_similarity,
            SIMILARITY_THRESHOLD,
        )
        return AnswerOutcome(
            attempted=False,
            visible_to_customer=False,
            answer_text=None,
            confidence=None,
        )

    logger.info("Gate 1 passed: best similarity %.2f - calling Gemini", best_similarity)

    chunk_texts = [chunk.content for chunk in closest_chunks]
    result = provider.generate_answer(question=question, context_chunks=chunk_texts)

    is_confident = result.can_answer and result.confidence >= CONFIDENCE_THRESHOLD
    logger.info(
        "Gate 2: can_answer=%s confidence=%s -> visible_to_customer=%s",
        result.can_answer,
        result.confidence,
        is_confident,
    )

    if not result.can_answer:
        logger.info("AI answer not attempted by provider: company_id=%s", company.id)
    else:
        logger.info(
            "AI answer generated: company_id=%s visible_to_customer=%s",
            company.id,
            is_confident,
        )

    return AnswerOutcome(
        attempted=True,
        visible_to_customer=is_confident,
        answer_text=result.answer,
        confidence=result.confidence,
    )
