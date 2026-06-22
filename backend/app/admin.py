# backend/app/admin.py

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import ArticleChunk, Company, KnowledgeBaseArticle, Message, Ticket, User


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
