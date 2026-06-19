from django.shortcuts import get_object_or_404
from django.conf import settings
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
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.exceptions import TokenError

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


class TicketListThrottle(UserRateThrottle):
    scope = "ticket_list"


class TicketCreateThrottle(AnonRateThrottle):
    scope = "ticket_create"


class CustomerMessageThrottle(AnonRateThrottle):
    scope = "customer_message"


# ─── Cookie helper ─────────────────────────────────────────────────────────────


def set_refresh_cookie(response, refresh_token):
    response.set_cookie(
        key="refresh_token",
        value=str(refresh_token),
        httponly=True,
        secure=not settings.DEBUG,
        samesite="Lax",
        max_age=int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds()),
        path="/api/auth/",
    )


# ─── Auth ────────────────────────────────────────────────────────────────────


class SignupView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = SignupSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)

        response = Response(
            {
                "user": UserSerializer(user).data,
                "access": str(refresh.access_token),
            },
            status=status.HTTP_201_CREATED,
        )
        set_refresh_cookie(response, refresh)
        return response


class CookieTokenObtainPairView(TokenObtainPairView):
    """Login. Lets simplejwt validate credentials as normal, then pulls the
    refresh token out of the JSON body and puts it in an httpOnly cookie."""

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            refresh_token = response.data.pop("refresh", None)
            if refresh_token:
                set_refresh_cookie(response, refresh_token)
        return response


class CookieTokenRefreshView(TokenRefreshView):
    """Reads the refresh token from the httpOnly cookie instead of the
    request body, then hands off to simplejwt's normal validation."""

    def post(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get("refresh_token")
        if refresh_token is None:
            return Response(
                {"detail": "No refresh token found"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        serializer = self.get_serializer(data={"refresh": refresh_token})
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError:
            return Response(
                {"detail": "Invalid or expired refresh token"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        return Response(serializer.validated_data, status=status.HTTP_200_OK)


class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        response = Response({"detail": "Logged out"}, status=status.HTTP_200_OK)
        response.delete_cookie("refresh_token", path="/api/auth/")
        return response


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
        ticket = create_ticket_with_message(
            company=validated[
                "api_key"
            ],  # serializer already converted this to a Company instance
            customer_name=validated["customer_name"],
            customer_email=validated["customer_email"],
            message=validated["message"],
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
