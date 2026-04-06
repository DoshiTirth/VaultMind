import tiktoken


def chunk_pages(pages: list[dict], chunk_size: int = 500, overlap: int = 50) -> list[dict]:
    """
    Splits page text into token-aware chunks.
    Returns list of chunks with metadata.
    """
    enc = tiktoken.get_encoding("cl100k_base")
    chunks = []
    chunk_id = 0

    for page in pages:
        tokens = enc.encode(page["text"])
        start = 0

        while start < len(tokens):
            end = start + chunk_size
            chunk_tokens = tokens[start:end]
            chunk_text = enc.decode(chunk_tokens)

            chunks.append({
                "chunk_id": f"{page['source']}_p{page['page_number']}_c{chunk_id}",
                "text": chunk_text,
                "page_number": page["page_number"],
                "source": page["source"]
            })

            chunk_id += 1
            start += chunk_size - overlap  # overlap so context isn't cut off

    return chunks