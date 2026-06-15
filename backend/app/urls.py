from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    AgentReplyCreateView,
    CustomerMessageCreateView,
    SignupView,
    TicketDetailView,
    TicketListCreateView,
)

urlpatterns = [
    path("auth/signup/", SignupView.as_view(), name="signup"),
    path("auth/login/", TokenObtainPairView.as_view(), name="login"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("tickets/", TicketListCreateView.as_view(), name="ticket-list-create"),
    path("tickets/<int:pk>/", TicketDetailView.as_view(), name="ticket-detail"),
    path(
        "tickets/<int:pk>/agent-messages/",
        AgentReplyCreateView.as_view(),
        name="agent-reply-create",
    ),
    path(
        "tickets/<int:pk>/customer-messages/",
        CustomerMessageCreateView.as_view(),
        name="customer-message-create",
    ),
]
