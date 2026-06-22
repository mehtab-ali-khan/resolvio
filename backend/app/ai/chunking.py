# backend/app/ai/chunking.py

WORDS_PER_CHUNK = 400


def split_into_chunks(text: str) -> list[str]:
    """
    Splits article text into chunks along paragraph boundaries, grouping
    consecutive paragraphs together until a chunk reaches roughly
    WORDS_PER_CHUNK words. Chunking by paragraph - not by raw character
    count - keeps each chunk semantically coherent instead of slicing
    through the middle of a sentence.
    """
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]

    chunks = []
    current_paragraphs = []
    current_word_count = 0

    for paragraph in paragraphs:
        paragraph_word_count = len(paragraph.split())

        if (
            current_paragraphs
            and current_word_count + paragraph_word_count > WORDS_PER_CHUNK
        ):
            chunks.append("\n\n".join(current_paragraphs))
            current_paragraphs = []
            current_word_count = 0

        current_paragraphs.append(paragraph)
        current_word_count += paragraph_word_count

    if current_paragraphs:
        chunks.append("\n\n".join(current_paragraphs))

    return chunks
