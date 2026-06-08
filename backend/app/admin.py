from django.contrib import admin

from .models import Message, Ticket


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ("id", "customer_name", "customer_email", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("customer_name", "customer_email")


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("id", "ticket", "sender_type", "created_at")
    list_filter = ("sender_type",)
