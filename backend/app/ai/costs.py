# backend/app/ai/costs.py

from collections import defaultdict
from decimal import Decimal
from django.db.models import Sum

from ..models import AIUsageLog


def calculate_total_cost(*, company, start_date=None, end_date=None):
    """
    Totals up real dollar cost for one company's AI usage, over an
    optional date range. Cost is already calculated and stored on each
    AIUsageLog row at logging time, so this just sums it - no need to
    re-look-up pricing here.

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

    grouped = logs.values("model_name").annotate(model_cost=Sum("cost"))

    by_model = {group["model_name"]: group["model_cost"] for group in grouped}
    total_cost = sum(by_model.values(), Decimal("0"))

    return {"total_cost": total_cost, "by_model": by_model}
