import os
import shutil
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request/Response models ──────────────────────────────────────────

class QueryRequest(BaseModel):
    question: str
    history: list[dict] = []
    n_results: int = 5


class QueryResponse(BaseModel):
    answer: str
    sources: list[dict]
    history: list[dict]


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

    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        pages = load_pdf(file_path)
        chunks = chunk_pages(pages)
        chunks_with_embeddings = get_embeddings(chunks)
        add_chunks(chunks_with_embeddings)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return JSONResponse(content={
        "message": f"✅ '{file.filename}' ingested successfully.",
        "pages_processed": len(pages),
        "chunks_stored": len(chunks)
    })


@app.post("/query", response_model=QueryResponse)
def query_documents(request: QueryRequest):
    """
    Ask a question against all uploaded documents.
    Accepts and returns conversation history for multi-turn chat.
    """
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    try:
        result = ask(
            query=request.question,
            history=request.history,
            n_results=request.n_results
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return QueryResponse(
        answer=result["answer"],
        sources=result["sources"],
        history=result["history"]
    )


@app.delete("/clear")
def clear_vault():
    """
    Deletes all documents from ChromaDB and uploads folder.
    """
    import chromadb
    from vaultmind.store.chroma_store import CHROMA_DB_PATH, COLLECTION_NAME

    try:
        client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
        client.delete_collection(COLLECTION_NAME)
    except Exception:
        pass

    for f in os.listdir(UPLOAD_DIR):
        os.remove(os.path.join(UPLOAD_DIR, f))

    return {"message": "🗑️ Vault cleared successfully."}


@app.get("/documents")
def list_documents():
    """
    Returns list of all uploaded documents.
    """
    files = []
    for f in os.listdir(UPLOAD_DIR):
        if f.endswith(".pdf"):
            full_path = os.path.join(UPLOAD_DIR, f)
            files.append({
                "filename": f,
                "size_kb": round(os.path.getsize(full_path) / 1024, 1)
            })
    return {"documents": files}

@app.delete("/documents/{filename}")
def delete_document(filename: str):
    """
    Deletes a single document from uploads folder.
    Note: ChromaDB chunks for this file remain queryable
    until vault is fully cleared.
    """
    file_path = os.path.join(UPLOAD_DIR, filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"File '{filename}' not found.")

    os.remove(file_path)

    return {"message": f"🗑️ '{filename}' removed from vault."}