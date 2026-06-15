from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken

from rest_framework.generics import (
    CreateAPIView,
    ListCreateAPIView,
    RetrieveUpdateAPIView,
)

from .models import Ticket
from .serializers import (
    TicketCreateSerializer,
    TicketDetailSerializer,
    TicketListSerializer,
    TicketMessageSerializer,
    TicketStatusUpdateSerializer,
    SignupSerializer,
    UserSerializer,
)
from .services import add_agent_reply, add_customer_message, create_ticket_with_message


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


class TicketListCreateView(ListCreateAPIView):
    queryset = Ticket.objects.order_by("-created_at")

    # def get_permissions(self):
    #     if self.request.method == "POST":
    #         return [AllowAny()]
    #     return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return TicketCreateSerializer

        return TicketListSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        ticket = create_ticket_with_message(**serializer.validated_data)

        return Response(
            {
                "ticket_id": ticket.id,
                "status": ticket.status,
            },
            status=status.HTTP_201_CREATED,
        )


class TicketDetailView(RetrieveUpdateAPIView):
    queryset = Ticket.objects.prefetch_related("messages")

    # def get_permissions(self):
    #     if self.request.method in ["PUT", "PATCH"]:
    #         return [IsAuthenticated()]
    #     return [AllowAny()]

    def get_serializer_class(self):
        if self.request.method in ["PUT", "PATCH"]:
            return TicketStatusUpdateSerializer

        return TicketDetailSerializer


class AgentReplyCreateView(CreateAPIView):
    # permission_classes = [IsAuthenticated]
    serializer_class = TicketMessageSerializer

    def create(self, request, *args, **kwargs):
        ticket = get_object_or_404(Ticket, pk=self.kwargs["pk"])
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        message = add_agent_reply(
            ticket=ticket,
            message=serializer.validated_data["message"],
        )

        return Response(
            {
                "id": message.id,
                "sender_type": message.sender_type,
                "body": message.body,
                "created_at": message.created_at,
            },
            status=status.HTTP_201_CREATED,
        )


class CustomerMessageCreateView(CreateAPIView):
    serializer_class = TicketMessageSerializer

    def create(self, request, *args, **kwargs):
        ticket = get_object_or_404(Ticket, pk=self.kwargs["pk"])
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        message = add_customer_message(
            ticket=ticket,
            message=serializer.validated_data["message"],
        )

        return Response(
            {
                "id": message.id,
                "sender_type": message.sender_type,
                "body": message.body,
                "created_at": message.created_at,
            },
            status=status.HTTP_201_CREATED,
        )
