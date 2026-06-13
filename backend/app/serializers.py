from rest_framework import serializers

from .models import Message, Ticket


class TicketCreateSerializer(serializers.Serializer):
    customer_name = serializers.CharField(max_length=120)
    customer_email = serializers.EmailField()
    message = serializers.CharField()


class TicketMessageSerializer(serializers.Serializer):
    message = serializers.CharField()


class TicketStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ticket
        fields = [
            "status",
        ]


class TicketListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ticket
        fields = [
            "id",
            "customer_name",
            "customer_email",
            "status",
            "created_at",
        ]


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = [
            "id",
            "sender_type",
            "body",
            "created_at",
        ]


class TicketDetailSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)

    class Meta:
        model = Ticket
        fields = [
            "id",
            "customer_name",
            "customer_email",
            "status",
            "created_at",
            "messages",
        ]
