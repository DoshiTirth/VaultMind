import os
from openai import OpenAI
from dotenv import load_dotenv
from vaultmind.query.retriever import retrieve, build_context

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
CHAT_MODEL = os.getenv("CHAT_MODEL", "gpt-4o-mini")

SYSTEM_PROMPT = """You are VaultMind, an intelligent document assistant.
Answer the user's question using the context provided below.
The context may be partial or imperfect — do your best to extract relevant information.
If there is truly nothing relevant, say "I couldn't find that in the uploaded documents."
Always mention which document and page your answer comes from.
"""

def ask(query: str, n_results: int = 5) -> dict:
    """
    Full RAG pipeline:
    1. Retrieve relevant chunks for the query
    2. Build context from chunks
    3. Send to OpenAI chat with context
    4. Return answer + sources
    """
    results = retrieve(query, n_results=n_results)

    if not results:
        return {
            "answer": "No documents found in the vault. Please upload a PDF first.",
            "sources": []
        }

    context = build_context(results)

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
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
        "sources": sources
    }