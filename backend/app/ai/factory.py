# backend/app/ai/factory.py

import os
from .base import AIProvider
from .gemini import GeminiProvider

# from .openai_provider import OpenAIProvider


def get_embedding_provider() -> AIProvider:
    """
    The embedding model is permanent and shared by every company's articles
    and questions - it never changes based on env settings. Switching it
    would silently break search for every company already using the app,
    since old and new embeddings would no longer be comparable.
    """
    return GeminiProvider()


def get_generation_provider() -> AIProvider:
    """
    The generation (answer-writing) model is freely swappable. Every other
    piece of code calls this function - and get_embedding_provider() above -
    and never imports a provider class directly.
    """
    provider_name = os.environ.get("GENERATION_PROVIDER", "gemini")

    if provider_name == "gemini":
        return GeminiProvider()
    # if provider_name == "openai":
    #     return OpenAIProvider()

    raise ValueError(f"Unknown GENERATION_PROVIDER: {provider_name}")
