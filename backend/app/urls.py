# backend/app/urls.py

from django.urls import path
from .views import (
    AgentReplyCreateView,
    CustomerMessageCreateView,
    CustomerTicketDetailView,
    KnowledgeBaseArticleDetailView,
    KnowledgeBaseArticleListCreateView,
    LoginView,
    MeView,
    SignupView,
    TicketDetailView,
    TicketListCreateView,
)

urlpatterns = [
    path("auth/signup/", SignupView.as_view(), name="signup"),
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/me/", MeView.as_view(), name="me"),
    # agent routes (by numeric pk)
    path("tickets/", TicketListCreateView.as_view(), name="ticket-list-create"),
    path("tickets/<int:pk>/", TicketDetailView.as_view(), name="ticket-detail"),
    path(
        "tickets/<int:pk>/agent-messages/",
        AgentReplyCreateView.as_view(),
        name="agent-reply",
    ),
    # knowledge base routes (agent only)
    path(
        "knowledge-base/",
        KnowledgeBaseArticleListCreateView.as_view(),
        name="kb-list-create",
    ),
    path(
        "knowledge-base/<int:pk>/",
        KnowledgeBaseArticleDetailView.as_view(),
        name="kb-detail",
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
