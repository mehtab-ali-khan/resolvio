from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.generics import (
    CreateAPIView,
    ListCreateAPIView,
    RetrieveUpdateAPIView,
)
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.pagination import PageNumberPagination
from rest_framework.throttling import AnonRateThrottle

from .models import Ticket
from .serializers import (
    MessageSerializer,
    SignupSerializer,
    TicketCreateSerializer,
    TicketDetailSerializer,
    TicketListSerializer,
    TicketMessageSerializer,
    TicketUpdateSerializer,
    UserSerializer,
)
from .services import add_agent_reply, add_customer_message, create_ticket_with_message

# ─── Pagination and Throttle classes ────────────────────────────────────────────────────────────────────


class TicketPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 100


class TicketCreateThrottle(AnonRateThrottle):
    scope = "ticket_create"


class CustomerMessageThrottle(AnonRateThrottle):
    scope = "customer_message"


# ─── Auth ────────────────────────────────────────────────────────────────────


class SignupView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = SignupSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "user": UserSerializer(user).data,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            status=status.HTTP_201_CREATED,
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
        return []

    def get_permissions(self):
        return [AllowAny()] if self.request.method == "POST" else [IsAuthenticated()]

    def get_queryset(self):
        return Ticket.objects.filter(company=self.request.user.company).order_by(
            "-is_new", "-updated_at"
        )

    def get_serializer_class(self):
        return (
            TicketCreateSerializer
            if self.request.method == "POST"
            else TicketListSerializer
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ticket = create_ticket_with_message(**serializer.validated_data)

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
            else TicketDetailSerializer
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
        message = add_agent_reply(
            ticket=ticket, message=serializer.validated_data["message"]
        )

        return Response(MessageSerializer(message).data, status=status.HTTP_201_CREATED)


# ─── Customer / widget views (no auth, scoped by access_token) ───────────────


class CustomerTicketDetailView(generics.RetrieveAPIView):
    permission_classes = [AllowAny]
    serializer_class = TicketDetailSerializer
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
        message = add_customer_message(
            ticket=ticket, message=serializer.validated_data["message"]
        )

        return Response(MessageSerializer(message).data, status=status.HTTP_201_CREATED)
