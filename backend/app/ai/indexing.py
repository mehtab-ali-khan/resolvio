# backend/app/ai/indexing.py

from django.db import transaction

from .chunking import split_into_chunks
from .factory import get_ai_provider
from ..models import ArticleChunk


def index_article(article):
    """
    Rebuilds the searchable chunks for a KnowledgeBaseArticle from scratch.
    This is always "delete and rebuild" - never an in-place patch - because
    chunk boundaries shift whenever the body text changes.
    """
    provider = get_ai_provider()
    chunk_texts = split_into_chunks(article.body)

    try:
        embeddings = [provider.embed_text(text) for text in chunk_texts]
    except Exception as exc:
        article.index_status = "failed"
        article.index_error = str(exc)
        article.save(update_fields=["index_status", "index_error"])
        return

    with transaction.atomic():
        article.chunks.all().delete()
        ArticleChunk.objects.bulk_create(
            [
                ArticleChunk(
                    article=article,
                    company=article.company,
                    content=text,
                    chunk_index=i,
                    embedding=embedding,
                )
                for i, (text, embedding) in enumerate(zip(chunk_texts, embeddings))
            ]
        )
        article.index_status = "ready"
        article.index_error = ""
        article.save(update_fields=["index_status", "index_error"])
