# backend/app/serializers.py

from rest_framework import serializers
from decimal import Decimal

from .models import Company, KnowledgeBaseArticle, Message, Ticket, User

# ─── Ticket Preview ────────────────────────────────────────────────────────────────────

PREVIEW_LENGTH = 60


def get_message_preview(ticket):
    """
    Returns the first customer message's body, truncated for list/detail display.
    """
    first_customer_message = next(
        (
            m
            for m in ticket.messages.all()
            if m.sender_type == Message.SenderType.CUSTOMER
        ),
        None,
    )
    if not first_customer_message:
        return ""
    body = first_customer_message.body.strip()
    if len(body) <= PREVIEW_LENGTH:
        return body
    return body[:PREVIEW_LENGTH].rstrip() + "…"


# ─── Auth ────────────────────────────────────────────────────────────────────


class SignupSerializer(serializers.Serializer):
    company_name = serializers.CharField(max_length=255, trim_whitespace=True)
    first_name = serializers.CharField(max_length=150, trim_whitespace=True)
    last_name = serializers.CharField(max_length=150, trim_whitespace=True)
    email = serializers.EmailField()
    password = serializers.CharField(
        write_only=True, min_length=8, style={"input_type": "password"}
    )

    def validate_email(self, value):
        value = value.lower()
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def create(self, validated_data):
        company = Company.objects.create(name=validated_data["company_name"])
        return User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=validated_data["first_name"],
            last_name=validated_data["last_name"],
            company=company,
            role="owner",
        )


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, style={"input_type": "password"})


class UserSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source="company.name", read_only=True)
    company_api_key = serializers.UUIDField(source="company.api_key", read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "role",
            "company_name",
            "company_api_key",
        ]


# ─── Tickets ─────────────────────────────────────────────────────────────────


class TicketCreateSerializer(serializers.Serializer):
    api_key = serializers.UUIDField(write_only=True)
    message = serializers.CharField()

    def validate_api_key(self, value):
        try:
            return Company.objects.get(api_key=value)
        except Company.DoesNotExist:
            raise serializers.ValidationError("Invalid API key.")


class TicketListSerializer(serializers.ModelSerializer):
    message_preview = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = [
            "id",
            "message_preview",
            "status",
            "priority",
            "category",
            "is_new",
            "created_at",
            "updated_at",
        ]

    def get_message_preview(self, ticket):
        return get_message_preview(ticket)


class TicketUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ticket
        fields = ["status", "priority", "category"]


# ─── Messages ────────────────────────────────────────────────────────────────


class AgentMessageSerializer(serializers.ModelSerializer):
    """
    Agent-facing message serializer. Includes is_internal and ai_confidence,
    since agents need to see AI drafts and how confident the AI was.
    Never reuse this serializer anywhere a customer could see the response.

    cost sums this message's AIUsageLog rows in Python, not via .aggregate().
    aggregate() always issues a fresh query even when ai_usage_logs was
    already prefetched by the view - summing here in Python is what
    actually makes the TicketDetailView prefetch worthwhile.
    """

    cost = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            "id",
            "sender_type",
            "body",
            "is_internal",
            "ai_confidence",
            "cost",
            "created_at",
        ]

    def get_cost(self, obj):
        logs = obj.ai_usage_logs.all()
        total = sum((log.cost for log in logs), start=Decimal("0"))
        return str(total) if logs else None


class CustomerMessageSerializer(serializers.ModelSerializer):
    """
    Customer-facing message serializer. Deliberately excludes is_internal
    and ai_confidence - a customer should never see whether a message was
    an internal AI draft or how confident the AI was about anything.
    """

    class Meta:
        model = Message
        fields = ["id", "sender_type", "body", "created_at"]


class AgentTicketDetailSerializer(serializers.ModelSerializer):
    """Agent-facing ticket detail. Shows every message, including internal AI drafts."""

    messages = AgentMessageSerializer(many=True, read_only=True)
    message_preview = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = [
            "id",
            "message_preview",
            "status",
            "priority",
            "category",
            "is_new",
            "created_at",
            "messages",
        ]

    def get_message_preview(self, ticket):
        return get_message_preview(ticket)


class CustomerTicketDetailSerializer(serializers.ModelSerializer):
    """
    Customer-facing ticket detail. Filters out any is_internal=True message
    (low-confidence AI drafts meant only for agents) before it can ever
    reach the customer's widget.
    """

    messages = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = [
            "id",
            "status",
            "priority",
            "category",
            "is_new",
            "created_at",
            "messages",
        ]

    def get_messages(self, ticket):
        visible_messages = [m for m in ticket.messages.all() if not m.is_internal]
        return CustomerMessageSerializer(visible_messages, many=True).data


class TicketMessageSerializer(serializers.Serializer):
    message = serializers.CharField()


# ─── Knowledge base ──────────────────────────────────────────────────────────


class KnowledgeBaseArticleSerializer(serializers.ModelSerializer):
    class Meta:
        model = KnowledgeBaseArticle
        fields = [
            "id",
            "title",
            "body",
            "index_status",
            "index_error",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "index_status",
            "index_error",
            "created_at",
            "updated_at",
        ]

    def validate_body(self, value):
        if len(value.strip()) < 100:
            raise serializers.ValidationError(
                "Article body must be at least 100 characters."
            )
        return value
