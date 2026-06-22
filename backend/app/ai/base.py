# backend/app/ai/base.py

from abc import ABC, abstractmethod

from pydantic import BaseModel


class AIAnswer(BaseModel):
    """
    The fixed-shape result every provider must return from generate_answer().
    Using a Pydantic model (not plain text) means Gemini's structured-output
    mode can fill this in directly - no manual text parsing anywhere.
    """

    answer: str
    can_answer: bool
    confidence: float


class AIProvider(ABC):
    """
    The contract every AI provider must follow.

    Swapping providers later (Gemini -> OpenAI, etc.) means writing one new
    class that implements these two methods. Nothing else in the app changes,
    because the rest of the codebase only ever talks to this interface.
    """

    @abstractmethod
    def embed_text(self, text: str) -> list[float]:
        """Turn a piece of text into a vector (a list of numbers)."""
        raise NotImplementedError

    @abstractmethod
    def generate_answer(self, question: str, context_chunks: list[str]) -> AIAnswer:
        """
        Given a customer's question and the matching knowledge base chunks,
        return an answer plus the model's own confidence self-check.
        """
        raise NotImplementedError
