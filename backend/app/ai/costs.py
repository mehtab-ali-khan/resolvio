# backend/app/ai/costs.py

from collections import defaultdict
from decimal import Decimal

from django.db.models import Sum

from ..models import AIModelPricing, AIUsageLog


def calculate_total_cost(*, company, start_date=None, end_date=None):
    """
    Calculates real dollar cost for one company's AI usage, over an
    optional date range. Groups by (provider, model_name) first, since
    different models have different prices - you can't just add all
    tokens together and multiply by one price.

    Returns:
        {
            "total_cost": Decimal("12.4530"),
            "by_model": {
                "gemini-2.5-flash": Decimal("11.20"),
                "gemini-embedding-001": Decimal("1.25"),
            },
        }
    """
    logs = AIUsageLog.objects.filter(company=company)

    if start_date:
        logs = logs.filter(created_at__gte=start_date)
    if end_date:
        logs = logs.filter(created_at__lte=end_date)

    grouped = logs.values("provider", "model_name").annotate(
        total_input_tokens=Sum("input_tokens"),
        total_output_tokens=Sum("output_tokens"),
    )

    by_model = {}
    total_cost = Decimal("0")

    for group in grouped:
        try:
            pricing = AIModelPricing.objects.get(
                provider=group["provider"],
                model_name=group["model_name"],
                is_active=True,
            )
        except AIModelPricing.DoesNotExist:
            # No price on file for this model - skip it rather than
            # guessing, but this is worth noticing (see management
            # command's warning below).
            by_model[group["model_name"]] = None
            continue

        input_cost = (
            Decimal(group["total_input_tokens"]) / 1000
        ) * pricing.input_price_per_1k
        output_cost = (
            Decimal(group["total_output_tokens"]) / 1000
        ) * pricing.output_price_per_1k
        model_cost = input_cost + output_cost

        by_model[group["model_name"]] = model_cost
        total_cost += model_cost

    return {"total_cost": total_cost, "by_model": by_model}
