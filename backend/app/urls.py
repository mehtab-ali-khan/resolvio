from django.urls import path

from .views import (
    AgentReplyCreateView,
    CustomerMessageCreateView,
    TicketDetailView,
    TicketListCreateView,
)


urlpatterns = [
    path("tickets/", TicketListCreateView.as_view(), name="ticket-list-create"),
    path("tickets/<int:pk>/", TicketDetailView.as_view(), name="ticket-detail"),
    path(
        "tickets/<int:pk>/messages/",
        AgentReplyCreateView.as_view(),
        name="agent-reply-create",
    ),
    path(
        "tickets/<int:pk>/customer-messages/",
        CustomerMessageCreateView.as_view(),
        name="customer-message-create",
    ),
]
