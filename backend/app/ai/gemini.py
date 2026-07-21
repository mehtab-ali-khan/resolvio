# backend/app/ai/gemini.py

import os
from google import genai
from .base import AIAnswer, AIProvider, TokenUsage
from .prompts import ANSWER_PROMPT_TEMPLATE

EMBEDDING_MODEL = "gemini-embedding-001"
GENERATION_MODEL = "gemini-2.5-flash-lite"


class GeminiProvider(AIProvider):
    embedding_model_name = EMBEDDING_MODEL
    generation_model_name = GENERATION_MODEL

    def __init__(self):
        self._client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

    def embed_text(self, text: str) -> tuple[list[float], TokenUsage]:
        token_count = self._client.models.count_tokens(
            model=EMBEDDING_MODEL,
            contents=text,
        )

        result = self._client.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=text,
        )

        usage = TokenUsage(
            input_tokens=token_count.total_tokens,
            output_tokens=0,  # embeddings have no "output" text
        )
        return result.embeddings[0].values, usage

    def generate_answer(
        self, question: str, context_chunks: list[str]
    ) -> tuple[AIAnswer, TokenUsage]:
        context = "\n\n---\n\n".join(context_chunks)
        prompt = ANSWER_PROMPT_TEMPLATE.format(context=context, question=question)

        response = self._client.models.generate_content(
            model=GENERATION_MODEL,
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": AIAnswer,
            },
        )

        usage = TokenUsage(
            input_tokens=response.usage_metadata.prompt_token_count,
            output_tokens=response.usage_metadata.candidates_token_count,
        )
        return response.parsed, usage
