# backend/app/models.py

import uuid
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from pgvector.django import VectorField
from django.contrib.postgres.search import SearchVectorField
from django.contrib.postgres.indexes import GinIndex


class Company(models.Model):
    name = models.CharField(max_length=255)
    api_key = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", "owner")
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    username = None

    ROLE_CHOICES = [
        ("owner", "Owner"),
        ("agent", "Agent"),
    ]

    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="users",
        null=True,
        blank=True,
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default="agent")

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    objects = UserManager()

    def __str__(self):
        return self.email


class Ticket(models.Model):
    class Status(models.TextChoices):
        OPEN = "open", "Open"
        RESOLVED = "resolved", "Resolved"

    class Priority(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"

    class Category(models.TextChoices):
        BILLING = "billing", "Billing"
        TECHNICAL = "technical", "Technical"
        GENERAL = "general", "General"

    company = models.ForeignKey(
        Company,
        related_name="tickets",
        on_delete=models.CASCADE,
    )
    access_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    customer_name = models.CharField(max_length=120)
    customer_email = models.EmailField()
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.OPEN,
    )
    priority = models.CharField(
        max_length=10,
        choices=Priority.choices,
        default=Priority.MEDIUM,
    )
    category = models.CharField(
        max_length=20,
        choices=Category.choices,
        default=Category.GENERAL,
    )
    is_new = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    search_vector = SearchVectorField(null=True, editable=False)

    class Meta:
        indexes = [
            GinIndex(fields=["search_vector"], name="ticket_search_vector_idx"),
        ]

    def __str__(self):
        return f"Ticket #{self.id} - {self.status}"


class Message(models.Model):
    class SenderType(models.TextChoices):
        CUSTOMER = "customer", "Customer"
        AGENT = "agent", "Agent"
        AI = "ai", "AI"

    ticket = models.ForeignKey(
        Ticket,
        related_name="messages",
        on_delete=models.CASCADE,
    )
    sender_type = models.CharField(max_length=20, choices=SenderType.choices)
    body = models.TextField()
    is_internal = models.BooleanField(default=False)
    ai_confidence = models.FloatField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def save(self, *args, **kwargs):
        is_create = self._state.adding
        super().save(*args, **kwargs)
        if is_create and self.sender_type == self.SenderType.CUSTOMER:
            self.ticket.is_new = True
            self.ticket.save(update_fields=["is_new", "updated_at"])

    def __str__(self):
        return f"{self.sender_type} message for ticket #{self.ticket_id}"


class KnowledgeBaseArticle(models.Model):
    class IndexStatus(models.TextChoices):
        READY = "ready", "Ready"
        FAILED = "failed", "Failed"

    company = models.ForeignKey(
        Company,
        related_name="knowledge_base_articles",
        on_delete=models.CASCADE,
    )
    title = models.CharField(max_length=255)
    body = models.TextField()
    index_status = models.CharField(
        max_length=10,
        choices=IndexStatus.choices,
        default=IndexStatus.FAILED,
    )
    index_error = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title


class ArticleChunk(models.Model):
    article = models.ForeignKey(
        KnowledgeBaseArticle,
        related_name="chunks",
        on_delete=models.CASCADE,
    )
    company = models.ForeignKey(
        Company,
        related_name="article_chunks",
        on_delete=models.CASCADE,
    )
    content = models.TextField()
    chunk_index = models.PositiveIntegerField()
    embedding = VectorField(dimensions=3072)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Chunk {self.chunk_index} of article #{self.article_id}"


class AIModelPricing(models.Model):
    class Provider(models.TextChoices):
        GOOGLE = "google", "Google (Gemini)"
        OPENAI = "openai", "OpenAI (ChatGPT)"
        ANTHROPIC = "anthropic", "Anthropic (Claude)"

    provider = models.CharField(max_length=20, choices=Provider.choices)
    model_name = models.CharField(max_length=100)  # e.g. "gemini-2.5-flash"

    input_price_per_1k = models.DecimalField(max_digits=10, decimal_places=6)
    output_price_per_1k = models.DecimalField(max_digits=10, decimal_places=6)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.provider}/{self.model_name}"


# Replace your existing AIUsageLog class in models.py with this version.
# (AIModelPricing class stays exactly the same, no changes needed there.)


class AIUsageLog(models.Model):
    class Purpose(models.TextChoices):
        ANSWER_GENERATION = "answer_generation", "Answer generated after Gate 1 passed"
        EMBEDDING = "embedding", "Embedding a Help Article chunk for search"

    Provider = AIModelPricing.Provider  # reuse the same provider choices
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="ai_usage_logs",
    )
    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ai_usage_logs",
    )
    message = models.ForeignKey(
        Message,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ai_usage_logs",
    )

    provider = models.CharField(max_length=20, choices=Provider.choices)
    model_name = models.CharField(max_length=100)
    purpose = models.CharField(max_length=30, choices=Purpose.choices)

    input_tokens = models.PositiveIntegerField()
    output_tokens = models.PositiveIntegerField(default=0)
    cost = models.DecimalField(max_digits=12, decimal_places=6, default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["company", "created_at"]),
        ]

    def __str__(self):
        return f"{self.company} - {self.model_name} - {self.purpose}"
