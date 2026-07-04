# backend/app/ai/indexing.py

import logging
from django.db import transaction
from .chunking import split_into_chunks
from .factory import get_ai_provider
from ..models import ArticleChunk

logger = logging.getLogger(__name__)


def index_article(article):
    """
    Rebuilds the searchable chunks for a KnowledgeBaseArticle from scratch.
    Never raises — if anything fails, it saves a clean status on the article
    and logs the real technical error for developers to investigate.
    """
    provider = get_ai_provider()
    chunk_texts = split_into_chunks(article.body)

    try:
        embeddings = [provider.embed_text(text) for text in chunk_texts]
    except Exception as exc:
        logger.exception(
            "Failed to index article #%s ('%s'): %s", article.id, article.title, exc
        )
        article.index_status = "failed"
        article.index_error = (
            "The article was saved but could not be indexed for AI search. "
            "This may be a temporary issue. Try saving again in a moment."
        )
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
