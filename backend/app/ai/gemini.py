# backend/app/ai/gemini.py

import os
from google import genai
from .base import AIAnswer, AIProvider, TokenUsage

EMBEDDING_MODEL = "gemini-embedding-001"
GENERATION_MODEL = "gemini-2.5-flash"

ANSWER_PROMPT_TEMPLATE = """You are a customer support assistant. You must \
follow these rules in order.

STEP 1 — Classify the customer's message into exactly one type:
- "greeting": a greeting, thanks, farewell, or small talk with no actual \
support question (e.g. "hi", "hello", "thank you", "good morning", "how are you").
- "in_context": a real support question that the context below actually \
answers.
- "out_of_context": a real question, but the context does NOT contain the \
information to answer it, OR the question is unrelated to this company's \
product/support (e.g. general knowledge, unrelated topics, random chit-chat \
that isn't a greeting).

STEP 2 — Respond based on the type:
- If "greeting": can_answer = true, confidence = 100, and write a short, \
warm, natural reply (e.g. "Hi! How can I help you today?"). Do NOT use the \
context for this.
- If "in_context": can_answer = true. Answer ONLY using the information in \
the context below. Do not use any outside knowledge.
- If "out_of_context": can_answer = false. Still write your best attempt at \
an answer in the "answer" field (it will not be shown to the customer), but \
it must not be treated as a real answer.

Context:
{context}

Customer message:
{question}

Return:
- can_answer: true only for "greeting" or "in_context" cases as defined above
- confidence: your confidence (0-100) that your answer is correct and fully \
supported by the context (use 100 for greetings)
- answer: your answer, written for the customer, following the rules above
"""


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
