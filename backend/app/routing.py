# backend/app/routing.py

from django.urls import path
from .consumers import AgentConsumer, WidgetConsumer

websocket_urlpatterns = [
    # Agent dashboard connects here — scoped to their company
    path("ws/agent/", AgentConsumer.as_asgi()),
    # Customer widget connects here — scoped to their specific ticket
    path("ws/widget/<uuid:access_token>/", WidgetConsumer.as_asgi()),
]
