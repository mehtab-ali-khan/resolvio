# backend/app/ai/openai_provider.py

import os
from openai import OpenAI

from .base import AIAnswer, AIProvider, TokenUsage
from .prompts import ANSWER_PROMPT_TEMPLATE

GENERATION_MODEL = "gpt-4o-mini"


class OpenAIProvider(AIProvider):
    """
    Generation-only provider. This app's permanent embedding model is
    Gemini's (see factory.get_embedding_provider) - OpenAI is never used
    for embedding, so embed_text() is intentionally not usable here.
    Calling it means something in the code is wrong, not a normal path.
    """

    generation_model_name = GENERATION_MODEL

    def __init__(self):
        self._client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

    def embed_text(self, text: str) -> tuple[list[float], TokenUsage]:
        raise NotImplementedError(
            "OpenAIProvider does not support embedding in this app. "
            "The embedding model is fixed to Gemini - use "
            "factory.get_embedding_provider() instead of this provider "
            "for embed_text()."
        )

    def generate_answer(
        self, question: str, context_chunks: list[str]
    ) -> tuple[AIAnswer, TokenUsage]:
        context = "\n\n---\n\n".join(context_chunks)
        prompt = ANSWER_PROMPT_TEMPLATE.format(context=context, question=question)

        response = self._client.chat.completions.parse(
            model=GENERATION_MODEL,
            messages=[{"role": "user", "content": prompt}],
            response_format=AIAnswer,
        )

        usage = TokenUsage(
            input_tokens=response.usage.prompt_tokens,
            output_tokens=response.usage.completion_tokens,
        )
        return response.choices[0].message.parsed, usage
