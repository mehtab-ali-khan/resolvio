# backend/app/ai/factory.py

import os
from .base import AIProvider
from .gemini import GeminiProvider


def get_ai_provider() -> AIProvider:
    """
    The single place in the whole app that decides which provider class
    gets used. Every other piece of code calls this function and never
    imports GeminiProvider (or any future provider) directly.
    """
    provider_name = os.environ.get("AI_PROVIDER", "gemini")

    if provider_name == "gemini":
        return GeminiProvider()

    raise ValueError(f"Unknown AI_PROVIDER: {provider_name}")
