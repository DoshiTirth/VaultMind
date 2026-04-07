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
    Upload a PDF, TXT, or DOCX file, chunk it, embed it, and store in ChromaDB.
    """
    allowed_extensions = (".pdf", ".txt", ".docx")
    filename_lower = file.filename.lower()

    if not any(filename_lower.endswith(ext) for ext in allowed_extensions):
        raise HTTPException(
            status_code=400,
            detail="Only PDF, TXT, and DOCX files are supported."
        )

    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        # Route to correct loader based on extension
        if filename_lower.endswith(".pdf"):
            from vaultmind.ingest.pdf_loader import load_pdf
            pages = load_pdf(file_path)
        elif filename_lower.endswith(".txt"):
            from vaultmind.ingest.text_loader import load_txt
            pages = load_txt(file_path)
        elif filename_lower.endswith(".docx"):
            from vaultmind.ingest.text_loader import load_docx
            pages = load_docx(file_path)

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
    allowed_extensions = (".pdf", ".txt", ".docx")
    for f in os.listdir(UPLOAD_DIR):
        if f.lower().endswith(allowed_extensions):
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

@app.get("/summarize/{filename}")
def summarize_document(filename: str):
    """
    Generates a structured summary of a specific document
    by sampling its most representative chunks.
    """
    import chromadb
    from vaultmind.store.chroma_store import CHROMA_DB_PATH, COLLECTION_NAME

    try:
        chroma_client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
        collection = chroma_client.get_or_create_collection(COLLECTION_NAME)

        # Get all chunks for this specific file
        results = collection.get(
            where={"source": filename},
            include=["documents", "metadatas"]
        )

        if not results["documents"]:
            raise HTTPException(
                status_code=404,
                detail=f"No chunks found for '{filename}'. Please upload it first."
            )

        # Sample up to 20 evenly spaced chunks to stay within token limits
        docs = results["documents"]
        metas = results["metadatas"]
        total = len(docs)
        step = max(1, total // 20)
        sampled_docs = docs[::step][:20]
        sampled_metas = metas[::step][:20]

        # Build context from sampled chunks
        context_parts = []
        for doc, meta in zip(sampled_docs, sampled_metas):
            context_parts.append(
                f"[Page {meta['page_number']}]\n{doc}"
            )
        context = "\n\n---\n\n".join(context_parts)

        # Ask OpenAI for a structured summary
        from openai import OpenAI
        llm = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

        response = llm.chat.completions.create(
            model=os.getenv("CHAT_MODEL", "gpt-4o-mini"),
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are VaultMind, an expert document summarizer. "
                        "Given document chunks, produce a structured summary with these sections:\n"
                        "**Document Overview** — 2-3 sentences on what this document is about.\n"
                        "**Key Topics** — bullet list of main topics covered.\n"
                        "**Key Findings / Main Points** — bullet list of the most important information.\n"
                        "**Document Type** — what kind of document this is (report, manual, resume, etc.).\n"
                        "Be concise and factual."
                    )
                },
                {
                    "role": "user",
                    "content": f"Summarize this document:\n\n{context}"
                }
            ],
            temperature=0.3
        )

        summary = response.choices[0].message.content

        return {
            "filename": filename,
            "total_chunks": total,
            "summary": summary
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/suggestions/{filename}")
def get_suggestions(filename: str):
    """
    Generates 3 suggested questions based on document content.
    """
    import chromadb
    from vaultmind.store.chroma_store import CHROMA_DB_PATH, COLLECTION_NAME

    try:
        chroma_client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
        collection = chroma_client.get_or_create_collection(COLLECTION_NAME)

        results = collection.get(
            where={"source": filename},
            include=["documents", "metadatas"]
        )

        if not results["documents"]:
            raise HTTPException(
                status_code=404,
                detail=f"No chunks found for '{filename}'."
            )

        # Sample first 5 chunks to understand the document
        docs = results["documents"][:5]
        context = "\n\n---\n\n".join(docs)

        from openai import OpenAI
        llm = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

        response = llm.chat.completions.create(
            model=os.getenv("CHAT_MODEL", "gpt-4o-mini"),
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are VaultMind. Based on the document content provided, "
                        "generate exactly 3 short, specific, useful questions a user might ask. "
                        "Return ONLY a JSON array of 3 strings, nothing else. "
                        "Example: [\"What are the main requirements?\", \"Who is this document for?\", \"What are the key dates?\"]"
                    )
                },
                {
                    "role": "user",
                    "content": f"Document content:\n\n{context}"
                }
            ],
            temperature=0.5
        )

        import json
        raw = response.choices[0].message.content.strip()
        suggestions = json.loads(raw)

        return {"filename": filename, "suggestions": suggestions[:3]}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))