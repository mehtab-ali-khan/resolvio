# backend/app/ai/claude_provider.py

import os
from anthropic import Anthropic

from .base import AIAnswer, AIProvider, TokenUsage
from .prompts import ANSWER_PROMPT_TEMPLATE

GENERATION_MODEL = "claude-haiku-4-5-20251001"
MAX_TOKENS = 1024


class ClaudeProvider(AIProvider):
    """
    Generation-only provider. This app's permanent embedding model is
    Gemini's (see factory.get_embedding_provider) - Claude is never used
    for embedding, so embed_text() is intentionally not usable here.
    Calling it means something in the code is wrong, not a normal path.
    """

    generation_model_name = GENERATION_MODEL

    def __init__(self):
        self._client = Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    def embed_text(self, text: str) -> tuple[list[float], TokenUsage]:
        raise NotImplementedError(
            "ClaudeProvider does not support embedding in this app. "
            "The embedding model is fixed to Gemini - use "
            "factory.get_embedding_provider() instead of this provider "
            "for embed_text()."
        )

    def generate_answer(
        self, question: str, context_chunks: list[str]
    ) -> tuple[AIAnswer, TokenUsage]:
        context = "\n\n---\n\n".join(context_chunks)
        prompt = ANSWER_PROMPT_TEMPLATE.format(context=context, question=question)

        response = self._client.messages.parse(
            model=GENERATION_MODEL,
            max_tokens=MAX_TOKENS,
            messages=[{"role": "user", "content": prompt}],
            output_format=AIAnswer,
        )

        usage = TokenUsage(
            input_tokens=response.usage.input_tokens,
            output_tokens=response.usage.output_tokens,
        )
        return response.parsed_output, usage
