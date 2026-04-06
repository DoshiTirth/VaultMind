import os
import sys
from dotenv import load_dotenv

load_dotenv()

from vaultmind.ingest.pdf_loader import load_pdf
from vaultmind.ingest.chunker import chunk_pages
from vaultmind.ingest.embedder import get_embeddings
from vaultmind.store.chroma_store import add_chunks
from vaultmind.llm.openai_client import ask


def test_ingest(pdf_path: str):
    print(f"\n Loading PDF: {pdf_path}")
    pages = load_pdf(pdf_path)
    print(f"  Pages loaded: {len(pages)}")

    print("\n Chunking pages...")
    chunks = chunk_pages(pages)
    print(f" Chunks created: {len(chunks)}")

    print("\n Generating embeddings...")
    chunks_with_embeddings = get_embeddings(chunks)
    print(f" Embeddings generated: {len(chunks_with_embeddings)}")

    print("\n Storing in ChromaDB...")
    add_chunks(chunks_with_embeddings)
    print(" Stored successfully")


def test_query(question: str):
    print(f"\n Question: {question}")
    result = ask(question)

    print(f"\n Answer:\n{result['answer']}")

    print("\n Sources:")
    for s in result["sources"]:
        print(f"   - {s['source']} | Page {s['page_number']} | Score: {s['score']}")


if __name__ == "__main__":
    # ── Step 1: Drop any PDF into uploads/ and set the name here ──
    PDF_NAME = "sample.pdf"   # change this to your actual PDF filename
    pdf_path = os.path.join("uploads", PDF_NAME)

    if not os.path.exists(pdf_path):
        print(f"PDF not found at: {pdf_path}")
        print("   Drop a PDF into the uploads/ folder and update PDF_NAME in this script.")
        sys.exit(1)

    # ── Step 2: Ingest ──
    test_ingest(pdf_path)

    # ── Step 3: Query ──
    questions = [
        "What is this document about?",
        "What are the main topics covered?",
        "Summarize the key points.",
    ]

    for q in questions:
        test_query(q)
        print("\n" + "="*60)