from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    AgentReplyCreateView,
    CustomerMessageCreateView,
    CustomerTicketDetailView,
    SignupView,
    TicketDetailView,
    TicketListCreateView,
)

urlpatterns = [
    path("auth/signup/", SignupView.as_view(), name="signup"),
    path("auth/login/", TokenObtainPairView.as_view(), name="login"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    # agent routes (by numeric pk)
    path("tickets/", TicketListCreateView.as_view(), name="ticket-list-create"),
    path("tickets/<int:pk>/", TicketDetailView.as_view(), name="ticket-detail"),
    path(
        "tickets/<int:pk>/agent-messages/",
        AgentReplyCreateView.as_view(),
        name="agent-reply",
    ),
    # customer routes (by access_token UUID — no guessing possible)
    path(
        "widget/tickets/<uuid:access_token>/",
        CustomerTicketDetailView.as_view(),
        name="customer-ticket-detail",
    ),
    path(
        "widget/tickets/<uuid:access_token>/messages/",
        CustomerMessageCreateView.as_view(),
        name="customer-message-create",
    ),
]
