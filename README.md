# VaultMind — RAG Document Intelligence

VaultMind is an AI-powered document Q&A application built with a clean RAG (Retrieval-Augmented Generation) pipeline. Upload any PDF and ask questions in natural language — VaultMind retrieves the most relevant chunks and generates accurate answers with source citations.

---

## Screenshots

### Empty State
![Empty State](assets/screenshot-empty.png)

### Vault Active — Document Uploaded
![Vault Active](assets/screenshot-vault-active.png)

### Chat with Answer & Sources
![Chat](assets/screenshot-chat.png)

---

## Architecture

```
PDF Upload → Text Extraction → Chunking → OpenAI Embeddings → ChromaDB
                                                                    ↓
User Question → OpenAI Embeddings → Similarity Search → Context Assembly → GPT-4o-mini → Answer + Sources
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Embeddings** | OpenAI `text-embedding-3-small` |
| **LLM** | OpenAI `gpt-4o-mini` |
| **Vector Store** | ChromaDB (local persistent) |
| **PDF Parsing** | PyPDF |
| **Chunking** | tiktoken (token-aware, 500 tokens + 50 overlap) |
| **Backend API** | FastAPI + Uvicorn |
| **Frontend** | React + Vite |
| **Environment** | Conda (Python 3.11) |

---

## Project Structure

```
VaultMind/
├── vaultmind/
│   ├── ingest/
│   │   ├── pdf_loader.py       ← PDF text extraction
│   │   ├── chunker.py          ← Token-aware chunking
│   │   └── embedder.py         ← OpenAI embeddings
│   ├── store/
│   │   └── chroma_store.py     ← ChromaDB operations
│   ├── query/
│   │   └── retriever.py        ← Similarity search
│   ├── llm/
│   │   └── openai_client.py    ← RAG answer generation
│   └── api/
│       └── main.py             ← FastAPI endpoints
├── frontend/                   ← React + Vite UI
├── uploads/                    ← PDFs stored here
├── chroma_db/                  ← Vector store (local)
├── assets/                     ← Screenshots
├── test_pipeline.py            ← CLI end-to-end test
├── .env.example                ← Environment template
├── environment.yml             ← Conda environment
└── requirements.txt
```

---

## Setup & Installation

### Prerequisites
- Python 3.11+
- Anaconda or Miniconda
- Node.js 18+
- OpenAI API key

### 1. Clone the repo

```bash
git clone https://github.com/DoshiTirth/VaultMind.git
cd VaultMind
```

### 2. Create the conda environment

```bash
conda create -n vaultmind python=3.11 -y
conda activate vaultmind
```

### 3. Install Python dependencies

```bash
conda install -c conda-forge numpy=1.26 -y
pip install -r requirements.txt
```

### 4. Set up environment variables

```bash
cp .env.example .env
```

Open `.env` and add your OpenAI API key:

```
OPENAI_API_KEY=sk-your-key-here
```

### 5. Install and run the frontend

```bash
cd frontend
npm install
npm run dev
```

### 6. Run the backend (separate terminal)

```bash
conda activate vaultmind
uvicorn vaultmind.api.main:app --reload
```

### 7. Open the app

```
http://localhost:5173
```

---

## Usage

1. **Upload a PDF** — drag and drop or click the upload zone
2. **Wait for ingestion** — VaultMind chunks and embeds the document automatically
3. **Ask questions** — type any natural language question about the document
4. **Review sources** — each answer includes source cards showing the file, page number, and match score

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Health check |
| `POST` | `/upload` | Upload and ingest a PDF |
| `POST` | `/query` | Ask a question, get answer + sources |
| `DELETE` | `/clear` | Clear all documents from the vault |

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `OPENAI_API_KEY` | Your OpenAI API key | required |
| `CHROMA_DB_PATH` | Path to ChromaDB storage | `./chroma_db` |
| `UPLOAD_DIR` | Path to uploads folder | `./uploads` |
| `EMBED_MODEL` | OpenAI embedding model | `text-embedding-3-small` |
| `CHAT_MODEL` | OpenAI chat model | `gpt-4o-mini` |

---

## Author

**Tirth Doshi**
- GitHub: [@DoshiTirth](https://github.com/DoshiTirth)
