# backend/app/ai/base.py

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Literal
from pydantic import BaseModel


class AIAnswer(BaseModel):
    """
    The fixed-shape result every provider must return from generate_answer().
    Using a Pydantic model (not plain text) means structured-output modes
    can fill this in directly - no manual text parsing anywhere.
    """

    classification: Literal["greeting", "in_context", "off_topic", "on_topic_no_answer"]
    answer: str
    can_answer: bool
    confidence: float


@dataclass
class TokenUsage:
    """
    How many tokens a single AI call cost. Every provider method that talks
    to a paid API must return one of these alongside its normal result, so
    the app can log and total up real cost per company. output_tokens is 0
    for calls that only ever consume tokens (like embeddings).
    """

    input_tokens: int
    output_tokens: int = 0


class AIProvider(ABC):
    """
    The contract every AI provider must follow.

    Swapping providers later (Gemini -> OpenAI, etc.) means writing one new
    class that implements these two methods. Nothing else in the app changes,
    because the rest of the codebase only ever talks to this interface.
    """

    @abstractmethod
    def embed_text(self, text: str) -> tuple[list[float], TokenUsage]:
        """
        Turn a piece of text into a vector (a list of numbers).
        Returns (embedding, usage) so callers can log the real cost.
        """
        raise NotImplementedError

    @abstractmethod
    def generate_answer(
        self, question: str, context_chunks: list[str]
    ) -> tuple[AIAnswer, TokenUsage]:
        """
        Given a customer's question and the matching knowledge base chunks,
        return an answer plus the model's own confidence self-check.
        Returns (answer, usage) so callers can log the real cost.
        """
        raise NotImplementedError
