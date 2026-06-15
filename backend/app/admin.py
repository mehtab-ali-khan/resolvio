from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import Message, Ticket, Company, User


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ("id", "customer_name", "customer_email", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("customer_name", "customer_email")


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("id", "ticket", "sender_type", "created_at")
    list_filter = ("sender_type",)


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "api_key", "created_at")
    search_fields = ("name",)


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    model = User
    list_display = ("email", "first_name", "last_name", "role", "company", "is_staff")
    ordering = ("email",)
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal info", {"fields": ("first_name", "last_name", "company", "role")}),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        ("Important dates", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (
            None,
            {"fields": ("email", "first_name", "last_name", "password1", "password2")},
        ),
    )
    search_fields = ("email", "first_name", "last_name")
