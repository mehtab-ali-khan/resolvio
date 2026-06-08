from rest_framework import serializers


class TicketCreateSerializer(serializers.Serializer):
    customer_name = serializers.CharField(max_length=120)
    customer_email = serializers.EmailField()
    message = serializers.CharField()
