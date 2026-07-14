# backend/app/ai/usage.py

import logging
from ..models import AIUsageLog
from .base import TokenUsage

logger = logging.getLogger(__name__)


CURRENT_PROVIDER = AIUsageLog.Provider.GOOGLE


def log_ai_usage(*, company, ticket, model_name, purpose, usage: TokenUsage):
    """
    Saves one row recording a single AI API call. Called right after every
    paid Gemini call succeeds - never before, since a failed call costs
    nothing (or Gemini's own error tells you separately if it did).
    """
    try:
        AIUsageLog.objects.create(
            company=company,
            ticket=ticket,
            provider=CURRENT_PROVIDER,
            model_name=model_name,
            purpose=purpose,
            input_tokens=usage.input_tokens,
            output_tokens=usage.output_tokens,
        )
    except Exception:
        logger.exception(
            "Failed to log AI usage: company_id=%s purpose=%s",
            company.id,
            purpose,
        )
