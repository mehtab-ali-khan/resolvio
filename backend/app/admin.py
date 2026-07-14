# backend/app/admin.py

from django.urls import path
from django.contrib import admin
from django.shortcuts import render
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .ai.costs import calculate_total_cost
from .models import (
    ArticleChunk,
    Company,
    KnowledgeBaseArticle,
    Message,
    Ticket,
    User,
    AIModelPricing,
    AIUsageLog,
)


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ("id", "customer_name", "customer_email", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("customer_name", "customer_email")


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("id", "ticket", "sender_type", "is_internal", "created_at")
    list_filter = ("sender_type", "is_internal")


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "api_key", "created_at")
    search_fields = ("name",)


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    model = User
    list_display = ("email", "first_name", "last_name", "role", "company", "is_staff")
    list_filter = ("role", "is_staff")
    ordering = ("email",)
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal info", {"fields": ("first_name", "last_name", "company", "role")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser")}),
        ("Important dates", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (
            None,
            {"fields": ("email", "first_name", "last_name", "password1", "password2")},
        ),
    )
    search_fields = ("email", "first_name", "last_name")


@admin.register(KnowledgeBaseArticle)
class KnowledgeBaseArticleAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "title",
        "company",
        "index_status",
        "chunk_count",
        "updated_at",
    )
    list_filter = ("index_status", "company")
    search_fields = ("title", "body")

    def chunk_count(self, article):
        return article.chunks.count()

    chunk_count.short_description = "Chunks"


@admin.register(ArticleChunk)
class ArticleChunkAdmin(admin.ModelAdmin):
    list_display = ("id", "article", "chunk_index", "company", "created_at")
    list_filter = ("company",)
    search_fields = ("content",)
    readonly_fields = ("embedding",)


@admin.register(AIModelPricing)
class AIModelPricingAdmin(admin.ModelAdmin):
    list_display = (
        "provider",
        "model_name",
        "input_price_per_1k",
        "output_price_per_1k",
        "is_active",
        "created_at",
    )
    list_filter = ("provider", "is_active")
    search_fields = ("model_name",)


@admin.register(AIUsageLog)
class AIUsageLogAdmin(admin.ModelAdmin):
    list_display = (
        "company",
        "provider",
        "model_name",
        "purpose",
        "input_tokens",
        "output_tokens",
        "created_at",
    )
    list_filter = ("company", "provider", "model_name", "purpose")
    date_hierarchy = "created_at"
    search_fields = ("company__name",)

    def get_urls(self):
        custom_urls = [
            path(
                "cost-report/",
                self.admin_site.admin_view(self.cost_report_view),
                name="app_aiusagelog_cost_report",
            ),
        ]
        return custom_urls + super().get_urls()

    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        extra_context["cost_report_url"] = "cost-report/"
        return super().changelist_view(request, extra_context=extra_context)

    def cost_report_view(self, request):
        companies = Company.objects.all().order_by("name")
        report_rows = []

        for company in companies:
            result = calculate_total_cost(company=company)
            report_rows.append(
                {
                    "company": company,
                    "total_cost": result["total_cost"],
                    "by_model": result["by_model"],
                }
            )

        context = {
            **self.admin_site.each_context(request),
            "title": "AI Cost Report",
            "report_rows": report_rows,
            "opts": self.model._meta,  # needed for admin's breadcrumb template
        }
        return render(request, "admin/app/aiusagelog/cost_report.html", context)
