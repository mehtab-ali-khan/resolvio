from django.urls import path

from .views import TicketCreateView


urlpatterns = [
    path("tickets/", TicketCreateView.as_view(), name="ticket-create"),
]
