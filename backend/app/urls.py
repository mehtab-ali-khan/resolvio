from django.urls import path
from .views import (
    SignupView,
    CookieTokenObtainPairView,
    CookieTokenRefreshView,
    LogoutView,
    MeView,
    AgentReplyCreateView,
    TicketDetailView,
    TicketListCreateView,
    CustomerTicketDetailView,
    CustomerMessageCreateView,
)

urlpatterns = [
    path("auth/signup/", SignupView.as_view(), name="signup"),
    path("auth/login/", CookieTokenObtainPairView.as_view(), name="login"),
    path("auth/refresh/", CookieTokenRefreshView.as_view(), name="token_refresh"),
    path("auth/logout/", LogoutView.as_view(), name="logout"),
    path("auth/me/", MeView.as_view(), name="me"),
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
