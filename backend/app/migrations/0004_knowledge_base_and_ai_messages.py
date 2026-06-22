# backend/app/migrations/0004_knowledge_base_and_ai_messages.py

import pgvector.django
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0003_ticket_is_new"),
    ]

    operations = [
        pgvector.django.VectorExtension(),
        migrations.AlterField(
            model_name="message",
            name="sender_type",
            field=models.CharField(
                max_length=20,
                choices=[("customer", "Customer"), ("agent", "Agent"), ("ai", "AI")],
            ),
        ),
        migrations.AddField(
            model_name="message",
            name="is_internal",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="message",
            name="ai_confidence",
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.CreateModel(
            name="KnowledgeBaseArticle",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("title", models.CharField(max_length=255)),
                ("body", models.TextField()),
                (
                    "index_status",
                    models.CharField(
                        choices=[("ready", "Ready"), ("failed", "Failed")],
                        default="failed",
                        max_length=10,
                    ),
                ),
                ("index_error", models.TextField(blank=True, default="")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "company",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="knowledge_base_articles",
                        to="app.company",
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name="ArticleChunk",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("content", models.TextField()),
                ("chunk_index", models.PositiveIntegerField()),
                ("embedding", pgvector.django.VectorField(dimensions=3072)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "article",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="chunks",
                        to="app.knowledgebasearticle",
                    ),
                ),
                (
                    "company",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="article_chunks",
                        to="app.company",
                    ),
                ),
            ],
        ),
    ]
