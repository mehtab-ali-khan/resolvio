# backend/app/consumers.py

import logging
import json
from channels.generic.websocket import AsyncWebsocketConsumer

logger = logging.getLogger(__name__)


class AgentConsumer(AsyncWebsocketConsumer):
    """
    Handles WebSocket connections from the agent dashboard.
    Each agent joins a group named after their company ID, so when
    anything happens in that company (new ticket, new message), all
    connected agents for that company get notified at once.
    """

    async def connect(self):
        user = self.scope.get("user")

        if not user or not user.company_id:
            logger.warning(
                "Rejected agent websocket connection: missing user or company"
            )
            await self.close()
            return

        self.company_group = f"company_{user.company_id}"

        await self.channel_layer.group_add(
            self.company_group,
            self.channel_name,
        )

        await self.accept()
        logger.info(
            "Agent websocket connected: user_id=%s company_id=%s",
            user.id,
            user.company_id,
        )

    async def disconnect(self, close_code):
        if hasattr(self, "company_group"):
            await self.channel_layer.group_discard(
                self.company_group,
                self.channel_name,
            )
            logger.info(
                "Agent websocket disconnected: company_group=%s close_code=%s",
                self.company_group,
                close_code,
            )

    async def ticket_update(self, event):
        await self.send(text_data=json.dumps(event["data"]))


class WidgetConsumer(AsyncWebsocketConsumer):
    """
    Handles WebSocket connections from the customer chat widget.
    Each widget connection joins a group named after its ticket ID,
    so when an agent or AI replies to that specific ticket, only
    that customer's widget gets the update.
    """

    async def connect(self):
        access_token = self.scope["url_route"]["kwargs"]["access_token"]

        # Import here (after django.setup()) to avoid circular imports
        from .models import Ticket
        from channels.db import database_sync_to_async

        @database_sync_to_async
        def get_ticket():
            try:
                return Ticket.objects.get(access_token=access_token)
            except Ticket.DoesNotExist:
                return None

        ticket = await get_ticket()

        if not ticket:
            logger.warning("Rejected widget websocket connection: invalid access token")
            await self.close()
            return

        self.ticket_group = f"ticket_{ticket.id}"

        await self.channel_layer.group_add(
            self.ticket_group,
            self.channel_name,
        )

        await self.accept()
        logger.info("Widget websocket connected: ticket_id=%s", ticket.id)

    async def disconnect(self, close_code):
        if hasattr(self, "ticket_group"):
            await self.channel_layer.group_discard(
                self.ticket_group,
                self.channel_name,
            )
            logger.info(
                "Widget websocket disconnected: ticket_group=%s close_code=%s",
                self.ticket_group,
                close_code,
            )

    async def new_message(self, event):
        await self.send(text_data=json.dumps(event["data"]))
