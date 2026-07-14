# backend/app/management/commands/ai_cost_report.py

from django.core.management.base import BaseCommand

from app.ai.costs import calculate_total_cost
from app.models import Company


class Command(BaseCommand):
    help = "Prints AI usage cost per company, broken down by model."

    def handle(self, *args, **options):
        companies = Company.objects.all()

        if not companies:
            self.stdout.write(self.style.WARNING("No companies found."))
            return

        for company in companies:
            result = calculate_total_cost(company=company)

            self.stdout.write("")
            self.stdout.write(self.style.SUCCESS(f"{company.name} (id={company.id})"))
            self.stdout.write(f"  Total cost: ${result['total_cost']:.6f}")

            for model_name, cost in result["by_model"].items():
                if cost is None:
                    self.stdout.write(
                        self.style.WARNING(
                            f"  - {model_name}: no active pricing found! "
                            f"Run seed_ai_pricing or add pricing manually."
                        )
                    )
                else:
                    self.stdout.write(f"  - {model_name}: ${cost:.6f}")
