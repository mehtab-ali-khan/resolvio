# backend/app/serializers.py

from rest_framework import serializers

from .models import Company, KnowledgeBaseArticle, Message, Ticket, User

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
    customer_name = serializers.CharField(max_length=120)
    customer_email = serializers.EmailField()
    message = serializers.CharField()

    def validate_api_key(self, value):
        try:
            return Company.objects.get(api_key=value)
        except Company.DoesNotExist:
            raise serializers.ValidationError("Invalid API key.")


class TicketListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ticket
        fields = [
            "id",
            "customer_name",
            "customer_email",
            "status",
            "priority",
            "category",
            "is_new",
            "created_at",
            "updated_at",
        ]


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
    """

    class Meta:
        model = Message
        fields = [
            "id",
            "sender_type",
            "body",
            "is_internal",
            "ai_confidence",
            "created_at",
        ]


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

    class Meta:
        model = Ticket
        fields = [
            "id",
            "customer_name",
            "customer_email",
            "status",
            "priority",
            "category",
            "is_new",
            "created_at",
            "messages",
        ]


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
            "customer_name",
            "customer_email",
            "status",
            "priority",
            "category",
            "is_new",
            "created_at",
            "messages",
        ]

    def get_messages(self, ticket):
        # ticket.messages is prefetched by the view - filtering in Python here
        # (instead of calling .filter() on the manager) reuses that prefetch
        # instead of triggering a second database query.
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
