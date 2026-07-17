# backend/app/management/commands/seed_ai_pricing.py

from django.core.management.base import BaseCommand
from app.models import AIModelPricing

PRICES = [
    {
        "provider": AIModelPricing.Provider.GOOGLE,
        "model_name": "gemini-2.5-flash",
        "input_price_per_1k": "0.0003",  # $0.30 per 1M input tokens
        "output_price_per_1k": "0.0025",  # $2.50 per 1M output tokens
    },
    {
        "provider": AIModelPricing.Provider.GOOGLE,
        "model_name": "gemini-embedding-001",
        "input_price_per_1k": "0.00015",  # $0.15 per 1M input tokens
        "output_price_per_1k": "0.0",  # embeddings have no output cost
    },
    {
        "provider": AIModelPricing.Provider.OPENAI,
        "model_name": "gpt-4o-mini",
        "input_price_per_1k": "0.00015",  # $0.15 per 1M input tokens
        "output_price_per_1k": "0.0006",  # $0.60 per 1M output tokens
    },
    {
        "provider": AIModelPricing.Provider.ANTHROPIC,
        "model_name": "claude-haiku-4-5-20251001",
        "input_price_per_1k": "0.001",  # $1.00 per 1M input tokens
        "output_price_per_1k": "0.005",  # $5.00 per 1M output tokens
    },
]


class Command(BaseCommand):
    help = "Seeds or updates AIModelPricing rows with current known provider prices."

    def handle(self, *args, **options):
        for entry in PRICES:
            pricing, created = AIModelPricing.objects.update_or_create(
                provider=entry["provider"],
                model_name=entry["model_name"],
                defaults={
                    "input_price_per_1k": entry["input_price_per_1k"],
                    "output_price_per_1k": entry["output_price_per_1k"],
                    "is_active": True,
                },
            )
            action = "Created" if created else "Updated"
            self.stdout.write(self.style.SUCCESS(f"{action} pricing: {pricing}"))
