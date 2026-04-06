import os
from openai import OpenAI
from dotenv import load_dotenv
from vaultmind.store.chroma_store import query_collection

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
EMBED_MODEL = os.getenv("EMBED_MODEL", "text-embedding-3-small")


def retrieve(query: str, n_results: int = 5) -> list[dict]:
    """
    Embeds the user query and retrieves the most relevant chunks
    from ChromaDB.
    """
    response = client.embeddings.create(
        model=EMBED_MODEL,
        input=query
    )
    query_embedding = response.data[0].embedding

    results = query_collection(query_embedding, n_results=n_results)
    return results


def build_context(results: list[dict]) -> str:
    """
    Assembles retrieved chunks into a single context string
    to pass to the LLM.
    """
    context_parts = []

    for i, result in enumerate(results):
        context_parts.append(
            f"[Source: {result['source']} | Page {result['page_number']} | Score: {result['score']}]\n"
            f"{result['text']}"
        )

    return "\n\n---\n\n".join(context_parts)