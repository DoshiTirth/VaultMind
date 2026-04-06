import os
import shutil
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv

from vaultmind.ingest.pdf_loader import load_pdf
from vaultmind.ingest.chunker import chunk_pages
from vaultmind.ingest.embedder import get_embeddings
from vaultmind.store.chroma_store import add_chunks
from vaultmind.llm.openai_client import ask

load_dotenv()

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI(
    title="VaultMind",
    description="RAG-based document Q&A API",
    version="1.0.0"
)


# ── Request/Response models ──────────────────────────────────────────

class QueryRequest(BaseModel):
    question: str
    n_results: int = 5


class QueryResponse(BaseModel):
    answer: str
    sources: list[dict]


# ── Routes ───────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"message": "VaultMind is running 🧠"}


@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    """
    Upload a PDF, chunk it, embed it, and store in ChromaDB.
    """
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    # Save file to uploads/
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        # Full ingestion pipeline
        pages = load_pdf(file_path)
        chunks = chunk_pages(pages)
        chunks_with_embeddings = get_embeddings(chunks)
        add_chunks(chunks_with_embeddings)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return JSONResponse(content={
        "message": f" '{file.filename}' ingested successfully.",
        "pages_processed": len(pages),
        "chunks_stored": len(chunks)
    })


@app.post("/query", response_model=QueryResponse)
def query_documents(request: QueryRequest):
    """
    Ask a question against all uploaded documents.
    """
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    try:
        result = ask(request.question, n_results=request.n_results)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return QueryResponse(
        answer=result["answer"],
        sources=result["sources"]
    )


@app.delete("/clear")
def clear_vault():
    """
    Deletes all documents from ChromaDB and uploads folder.
    Useful for resetting during development.
    """
    import chromadb
    from vaultmind.store.chroma_store import CHROMA_DB_PATH, COLLECTION_NAME

    try:
        client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
        client.delete_collection(COLLECTION_NAME)
    except Exception:
        pass

    # Clear uploads folder
    for f in os.listdir(UPLOAD_DIR):
        os.remove(os.path.join(UPLOAD_DIR, f))

    return {"message": "🗑️ Vault cleared successfully."}