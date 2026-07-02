# backend/app/middleware.py

from django.http import HttpResponse
from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from rest_framework.authtoken.models import Token

WIDGET_PATH_PREFIXES = ("/api/widget/",)
WIDGET_CREATE_TICKET_PATH = "/api/tickets/"


def _is_widget_path(path):
    if path.startswith(WIDGET_PATH_PREFIXES):
        return True
    if path == WIDGET_CREATE_TICKET_PATH:
        return True
    return False


class WidgetCorsMiddleware:
    """
    Allows any website to call the widget-facing endpoints (ticket creation
    and the customer-side ticket/message views), while every other endpoint
    keeps using the normal strict CORS_ALLOWED_ORIGINS list from settings.

    Security for the widget endpoints comes from the company api_key and
    the per-ticket access_token UUID, not from CORS - so opening CORS here
    does not weaken anything.

    This middleware handles the OPTIONS preflight request itself instead of
    relying on CorsMiddleware, because CorsMiddleware only answers preflight
    requests for origins already in CORS_ALLOWED_ORIGINS - which, for the
    widget, is every random customer website and can never be a fixed list.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        is_widget = _is_widget_path(request.path)
        origin = request.headers.get("Origin")

        # Answer the browser's preflight request directly - don't let it
        # fall through to the view at all.
        if is_widget and request.method == "OPTIONS" and origin:
            response = HttpResponse()
            response["Access-Control-Allow-Origin"] = origin
            response["Access-Control-Allow-Methods"] = (
                "GET, POST, PATCH, DELETE, OPTIONS"
            )
            response["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
            response["Access-Control-Max-Age"] = "86400"
            response["Vary"] = "Origin"
            return response

        response = self.get_response(request)

        if is_widget and origin:
            response["Access-Control-Allow-Origin"] = origin
            response["Vary"] = "Origin"

        return response


# backend/app/middleware.py — add this BELOW your existing WidgetCorsMiddleware


@database_sync_to_async
def get_user_from_token(token_key):
    """
    Looks up the user for a given token key.
    Returns None if the token doesn't exist or is invalid.
    database_sync_to_async is needed because database queries are
    synchronous but WebSocket code runs asynchronously - this wrapper
    bridges that gap safely.
    """
    try:
        token = Token.objects.select_related("user").get(key=token_key)
        return token.user
    except Token.DoesNotExist:
        return None


class TokenAuthMiddleware(BaseMiddleware):
    """
    Reads the auth token from the WebSocket URL query string
    (e.g. ws://localhost:8000/ws/agent/?token=abc123) and attaches
    the matching user to the connection scope, exactly like DRF's
    TokenAuthentication does for HTTP requests.

    We use the query string instead of a header because browsers don't
    allow setting custom headers on WebSocket connections - query string
    is the standard workaround for WebSocket authentication.
    """

    async def __call__(self, scope, receive, send):
        query_string = scope.get("query_string", b"").decode()
        params = dict(
            pair.split("=") for pair in query_string.split("&") if "=" in pair
        )
        token_key = params.get("token")

        scope["user"] = None
        if token_key:
            scope["user"] = await get_user_from_token(token_key)

        return await super().__call__(scope, receive, send)
