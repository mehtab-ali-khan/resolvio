from rest_framework import status
from rest_framework.generics import CreateAPIView
from rest_framework.response import Response

from .serializers import TicketCreateSerializer
from .services import create_ticket_with_message


class TicketCreateView(CreateAPIView):
    serializer_class = TicketCreateSerializer

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
