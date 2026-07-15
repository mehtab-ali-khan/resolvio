# backend/app/ai/usage.py

import logging
from decimal import Decimal

from ..models import AIModelPricing, AIUsageLog
from .base import TokenUsage

logger = logging.getLogger(__name__)

CURRENT_PROVIDER = AIUsageLog.Provider.GOOGLE


def _calculate_cost(*, provider, model_name, usage: TokenUsage) -> Decimal:
    """
    Looks up the currently active price for this model and calculates
    the real dollar cost of this one call. Returns 0 if no active
    pricing exists yet, rather than crashing the whole log attempt -
    you'll still see the row (with 0 cost) and can spot it's missing
    a price in the admin.
    """
    try:
        pricing = AIModelPricing.objects.get(
            provider=provider, model_name=model_name, is_active=True
        )
    except AIModelPricing.DoesNotExist:
        logger.warning(
            "No active pricing found for %s/%s - logging usage with cost=0",
            provider,
            model_name,
        )
        return Decimal("0")

    input_cost = (Decimal(usage.input_tokens) / 1000) * pricing.input_price_per_1k
    output_cost = (Decimal(usage.output_tokens) / 1000) * pricing.output_price_per_1k
    return input_cost + output_cost


def log_ai_usage(
    *, company, ticket, model_name, purpose, usage: TokenUsage, message=None
):
    """
    Saves one row recording a single AI API call, with its cost already
    calculated. Called right after every paid Gemini call succeeds -
    never before, since a failed call costs nothing.
    """
    try:
        cost = _calculate_cost(
            provider=CURRENT_PROVIDER, model_name=model_name, usage=usage
        )
        AIUsageLog.objects.create(
            company=company,
            ticket=ticket,
            message=message,
            provider=CURRENT_PROVIDER,
            model_name=model_name,
            purpose=purpose,
            input_tokens=usage.input_tokens,
            output_tokens=usage.output_tokens,
            cost=cost,
        )
    except Exception:
        logger.exception(
            "Failed to log AI usage: company_id=%s purpose=%s",
            company.id,
            purpose,
        )
