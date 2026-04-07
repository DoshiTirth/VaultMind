import os
from openai import OpenAI
from dotenv import load_dotenv
from vaultmind.query.retriever import retrieve, build_context

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
CHAT_MODEL = os.getenv("CHAT_MODEL", "gpt-4o-mini")

SYSTEM_PROMPT = """You are VaultMind, an intelligent document assistant.
Answer the user's question using ONLY the context provided below.
If the answer is not found in the context, say "I couldn't find that in the uploaded documents."
Always mention which document and page your answer comes from.
You also have access to the conversation history — use it to answer follow-up questions naturally.
"""


def ask(query: str, history: list[dict] = [], n_results: int = 5) -> dict:
    """
    Full RAG pipeline with conversation history:
    1. Retrieve relevant chunks for the query
    2. Build context from chunks
    3. Send to OpenAI with history + context
    4. Return answer + sources + updated history
    """
    results = retrieve(query, n_results=n_results)

    if not results:
        return {
            "answer": "No documents found in the vault. Please upload a PDF first.",
            "sources": [],
            "history": history
        }

    context = build_context(results)

    # Build messages — system + history + new user message with context
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        *history,
        {
            "role": "user",
            "content": f"Context:\n{context}\n\nQuestion: {query}"
        }
    ]

    response = client.chat.completions.create(
        model=CHAT_MODEL,
        messages=messages,
        temperature=0.2
    )

    answer = response.choices[0].message.content

    # Append this turn to history (without context to keep it clean)
    updated_history = history + [
        {"role": "user", "content": query},
        {"role": "assistant", "content": answer}
    ]

    sources = [
        {
            "source": r["source"],
            "page_number": r["page_number"],
            "score": r["score"]
        }
        for r in results
    ]

    return {
        "answer": answer,
        "sources": sources,
        "history": updated_history
    }