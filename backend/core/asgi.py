# backend/core/asgi.py

import os
import django
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

# These imports must come AFTER django.setup() because they import models
from app.middleware import TokenAuthMiddleware
from app.routing import websocket_urlpatterns

application = ProtocolTypeRouter(
    {
        # Regular HTTP requests go to Django's normal view system — nothing changes
        "http": get_asgi_application(),
        # WebSocket connections go through our auth middleware first,
        # then get routed to the right consumer based on the URL
        "websocket": TokenAuthMiddleware(URLRouter(websocket_urlpatterns)),
    }
)
