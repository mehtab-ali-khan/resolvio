from django.shortcuts import get_object_or_404

from rest_framework import status
from rest_framework.generics import CreateAPIView, ListCreateAPIView, RetrieveAPIView
from rest_framework.response import Response

from .models import Ticket
from .serializers import (
    AgentReplySerializer,
    TicketCreateSerializer,
    TicketDetailSerializer,
    TicketListSerializer,
)
from .services import add_agent_reply, create_ticket_with_message


class TicketListCreateView(ListCreateAPIView):
    queryset = Ticket.objects.order_by("-created_at")

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


class TicketDetailView(RetrieveAPIView):
    queryset = Ticket.objects.prefetch_related("messages")
    serializer_class = TicketDetailSerializer


class AgentReplyCreateView(CreateAPIView):
    serializer_class = AgentReplySerializer

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
