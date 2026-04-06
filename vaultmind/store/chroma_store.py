import os
import chromadb
from dotenv import load_dotenv

load_dotenv()

CHROMA_DB_PATH = os.getenv("CHROMA_DB_PATH", "./chroma_db")
COLLECTION_NAME = "vaultmind_docs"


def get_collection():
    """Returns (or creates) the ChromaDB collection."""
    client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
    collection = client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"}
    )
    return collection


def add_chunks(chunks: list[dict]):
    """
    Stores embedded chunks into ChromaDB.
    Each chunk must have: chunk_id, text, embedding, source, page_number.
    """
    collection = get_collection()

    ids = [chunk["chunk_id"] for chunk in chunks]
    documents = [chunk["text"] for chunk in chunks]
    embeddings = [chunk["embedding"] for chunk in chunks]
    metadatas = [
        {
            "source": chunk["source"],
            "page_number": chunk["page_number"]
        }
        for chunk in chunks
    ]

    collection.add(
        ids=ids,
        documents=documents,
        embeddings=embeddings,
        metadatas=metadatas
    )

    print(f"Stored {len(chunks)} chunks into ChromaDB")


def query_collection(query_embedding: list[float], n_results: int = 5) -> list[dict]:
    """
    Searches ChromaDB for the most similar chunks.
    Returns list of results with text and metadata.
    """
    collection = get_collection()

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=n_results,
        include=["documents", "metadatas", "distances"]
    )

    output = []
    for doc, meta, dist in zip(
        results["documents"][0],
        results["metadatas"][0],
        results["distances"][0]
    ):
        output.append({
            "text": doc,
            "source": meta["source"],
            "page_number": meta["page_number"],
            "score": round(1 - dist, 4)  # cosine similarity score
        })

    return output