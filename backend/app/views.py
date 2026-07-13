# backend/app/views.py

import logging

from django.shortcuts import get_object_or_404
from django.contrib.postgres.search import SearchQuery
from rest_framework import generics, status
from rest_framework.generics import (
    CreateAPIView,
    ListCreateAPIView,
    RetrieveUpdateAPIView,
    RetrieveUpdateDestroyAPIView,
)
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from rest_framework.pagination import PageNumberPagination
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from django.contrib.auth import authenticate

from .models import Ticket, KnowledgeBaseArticle
from .serializers import (
    CustomerMessageSerializer,
    CustomerTicketDetailSerializer,
    KnowledgeBaseArticleSerializer,
    AgentMessageSerializer,
    LoginSerializer,
    SignupSerializer,
    TicketCreateSerializer,
    AgentTicketDetailSerializer,
    TicketListSerializer,
    TicketMessageSerializer,
    TicketUpdateSerializer,
    UserSerializer,
)
from .services import (
    add_agent_reply,
    add_customer_message,
    create_knowledge_base_article,
    create_ticket_with_message,
    update_knowledge_base_article,
)

logger = logging.getLogger(__name__)

# ─── Pagination and Throttle classes ────────────────────────────────────────────────────────────────────


class TicketPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 100


class TicketListThrottle(UserRateThrottle):
    scope = "ticket_list"


class TicketCreateThrottle(AnonRateThrottle):
    scope = "ticket_create"


class CustomerMessageThrottle(AnonRateThrottle):
    scope = "customer_message"


# ─── Auth ────────────────────────────────────────────────────────────────────


class SignupView(generics.CreateAPIView):
    """
    Creates a new company + owner user, then returns the same kind of
    {user, token} response as login - so the frontend can treat signup
    and login identically once the request succeeds.
    """

    permission_classes = [AllowAny]
    serializer_class = SignupSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        token, _ = Token.objects.get_or_create(user=user)

        return Response(
            {
                "user": UserSerializer(user).data,
                "token": token.key,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    """
    Validates email + password, then returns this user's token - the SAME
    token every time, no matter how many times they log in or from how
    many devices. We never delete or rotate it here.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = authenticate(
            request,
            username=serializer.validated_data["email"],
            password=serializer.validated_data["password"],
        )
        if user is None:
            return Response(
                {"detail": "Invalid email or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        token, _ = Token.objects.get_or_create(user=user)

        return Response(
            {
                "user": UserSerializer(user).data,
                "token": token.key,
            },
            status=status.HTTP_200_OK,
        )


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


# ─── Agent views (auth required, scoped to agent's company) ──────────────────


class TicketListCreateView(ListCreateAPIView):
    pagination_class = TicketPagination

    def get_throttles(self):
        if self.request.method == "POST":
            return [TicketCreateThrottle()]
        return [TicketListThrottle()]

    def get_permissions(self):
        return [AllowAny()] if self.request.method == "POST" else [IsAuthenticated()]

    def get_queryset(self):
        queryset = Ticket.objects.filter(company=self.request.user.company)

        status_filter = self.request.query_params.get("status")
        if status_filter in (Ticket.Status.OPEN, Ticket.Status.RESOLVED):
            queryset = queryset.filter(status=status_filter)

        search_term = self.request.query_params.get("search", "").strip()
        if search_term:
            queryset = queryset.filter(search_vector=SearchQuery(search_term))

        return queryset.order_by("-is_new", "-updated_at")

    def get_serializer_class(self):
        return (
            TicketCreateSerializer
            if self.request.method == "POST"
            else TicketListSerializer
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated_data = serializer.validated_data

        try:
            ticket = create_ticket_with_message(
                company=validated_data["api_key"],
                customer_name=validated_data["customer_name"],
                customer_email=validated_data["customer_email"],
                message=validated_data["message"],
            )
        except Exception:
            logger.exception(
                "Ticket creation failed for customer_email=%s",
                validated_data.get("customer_email"),
            )
            raise

        logger.info(
            "Ticket created: ticket_id=%s customer_email=%s is_new=%s",
            ticket.id,
            validated_data["customer_email"],
            ticket.is_new,
        )

        return Response(
            {
                "ticket_id": ticket.id,
                "access_token": str(ticket.access_token),
                "status": ticket.status,
            },
            status=status.HTTP_201_CREATED,
        )


class TicketDetailView(RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Ticket.objects.filter(
            company=self.request.user.company
        ).prefetch_related("messages")

    def get_serializer_class(self):
        return (
            TicketUpdateSerializer
            if self.request.method in ["PUT", "PATCH"]
            else AgentTicketDetailSerializer
        )

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.is_new:
            instance.is_new = False
            instance.save(update_fields=["is_new"])
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class AgentReplyCreateView(CreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = TicketMessageSerializer

    def create(self, request, *args, **kwargs):
        ticket = get_object_or_404(
            Ticket, pk=self.kwargs["pk"], company=request.user.company
        )
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            message = add_agent_reply(
                ticket=ticket, message=serializer.validated_data["message"]
            )
        except Exception:
            logger.exception(
                "Agent reply failed: ticket_id=%s agent_id=%s",
                ticket.id,
                request.user.id,
            )
            raise

        logger.info(
            "Agent replied: ticket_id=%s agent_id=%s message_id=%s",
            ticket.id,
            request.user.id,
            message.id,
        )

        return Response(
            AgentMessageSerializer(message).data, status=status.HTTP_201_CREATED
        )


# ─── Knowledge base views (auth required, scoped to agent's company) ─────────


class KnowledgeBaseArticleListCreateView(ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = KnowledgeBaseArticleSerializer
    pagination_class = TicketPagination

    def get_queryset(self):
        return KnowledgeBaseArticle.objects.filter(
            company=self.request.user.company
        ).order_by("-created_at")

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            article = create_knowledge_base_article(
                company=request.user.company,
                title=serializer.validated_data["title"],
                body=serializer.validated_data["body"],
            )
        except Exception:
            logger.exception(
                "Knowledge base article creation failed: company_id=%s user_id=%s",
                request.user.company_id,
                request.user.id,
            )
            raise

        logger.info(
            "Knowledge base article created: article_id=%s company_id=%s user_id=%s",
            article.id,
            request.user.company_id,
            request.user.id,
        )

        return Response(
            KnowledgeBaseArticleSerializer(article).data,
            status=status.HTTP_201_CREATED,
        )


class KnowledgeBaseArticleDetailView(RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = KnowledgeBaseArticleSerializer

    def get_queryset(self):
        return KnowledgeBaseArticle.objects.filter(company=self.request.user.company)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        article = self.get_object()
        serializer = self.get_serializer(article, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        try:
            updated_article = update_knowledge_base_article(
                article=article,
                title=serializer.validated_data.get("title", article.title),
                body=serializer.validated_data.get("body", article.body),
            )
        except Exception:
            logger.exception(
                "Knowledge base article update failed: article_id=%s user_id=%s",
                article.id,
                request.user.id,
            )
            raise

        logger.info(
            "Knowledge base article updated: article_id=%s user_id=%s",
            updated_article.id,
            request.user.id,
        )

        return Response(KnowledgeBaseArticleSerializer(updated_article).data)


# ─── Customer / widget views (no auth, scoped by access_token) ───────────────


class CustomerTicketDetailView(generics.RetrieveAPIView):
    permission_classes = [AllowAny]
    serializer_class = CustomerTicketDetailSerializer
    lookup_field = "access_token"

    def get_queryset(self):
        return Ticket.objects.prefetch_related("messages")


class CustomerMessageCreateView(CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = TicketMessageSerializer
    throttle_classes = [CustomerMessageThrottle]

    def create(self, request, *args, **kwargs):
        ticket = get_object_or_404(Ticket, access_token=self.kwargs["access_token"])
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            message = add_customer_message(
                ticket=ticket, message=serializer.validated_data["message"]
            )
        except Exception:
            logger.exception("Customer message failed: ticket_id=%s", ticket.id)
            raise

        logger.info(
            "Customer message created: ticket_id=%s message_id=%s",
            ticket.id,
            message.id,
        )

        return Response(
            CustomerMessageSerializer(message).data, status=status.HTTP_201_CREATED
        )
