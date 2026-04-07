import { useState, useRef, useEffect } from "react";
import axios from "axios";

const API = "http://127.0.0.1:8000";

export default function UploadPanel({ onUploadSuccess, onVaultCleared, onSummary }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [stats, setStats] = useState(null);
  const [summarizing, setSummarizing] = useState(null);
  const fileRef = useRef();

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await axios.get(`${API}/documents`);
      setDocuments(res.data.documents);
      if (res.data.documents.length > 0) {
        onUploadSuccess(res.data.documents[res.data.documents.length - 1].filename);
      }
    } catch {
      // backend might not be ready yet
    }
  };

  const handleFile = async (file) => {
    if (!file || !file.name.endsWith(".pdf")) {
      setError("Only PDF files are supported.");
      return;
    }

    setError(null);
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post(`${API}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setStats({
        pages: res.data.pages_processed,
        chunks: res.data.chunks_stored,
      });
      onUploadSuccess(file.name);
      await fetchDocuments();
    } catch (err) {
      setError(err.response?.data?.detail || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleSummarize = async (filename) => {
    setSummarizing(filename);
    try {
      const res = await axios.get(
        `${API}/summarize/${encodeURIComponent(filename)}`
      );
      onSummary({
        filename: res.data.filename,
        summary: res.data.summary,
        total_chunks: res.data.total_chunks,
      });
    } catch (err) {
      setError(err.response?.data?.detail || "Summarization failed.");
    } finally {
      setSummarizing(null);
    }
  };

  const handleDeleteDocument = async (filename) => {
    try {
      await axios.delete(`${API}/documents/${encodeURIComponent(filename)}`);
      const updated = documents.filter((d) => d.filename !== filename);
      setDocuments(updated);
      if (updated.length === 0) {
        onVaultCleared();
        setStats(null);
      } else {
        onUploadSuccess(updated[updated.length - 1].filename);
      }
    } catch {
      setError("Failed to delete document.");
    }
  };

  const handleClearAll = async () => {
    try {
      await axios.delete(`${API}/clear`);
      setDocuments([]);
      setStats(null);
      setError(null);
      onVaultCleared();
    } catch {
      setError("Failed to clear vault.");
    }
  };

  return (
    <div style={{
      width: "320px",
      flexShrink: 0,
      borderRight: "1px solid var(--border)",
      background: "var(--bg-secondary)",
      display: "flex",
      flexDirection: "column",
      padding: "24px",
      gap: "20px",
      overflowY: "auto",
    }}>

      {/* Title */}
      <div>
        <p style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 700,
          fontSize: "13px",
          color: "var(--accent-amber)",
          letterSpacing: "2px",
          textTransform: "uppercase",
          marginBottom: "6px",
        }}>
          Document Vault
        </p>
        <p style={{ color: "var(--text-secondary)", fontSize: "12px", lineHeight: 1.6 }}>
          Upload PDFs to query their contents with AI.
        </p>
      </div>

      {/* Drop Zone */}
      <div
        onClick={() => fileRef.current.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFile(e.dataTransfer.files[0]);
        }}
        style={{
          border: `2px dashed ${dragging ? "var(--accent-cyan)" : "var(--text-muted)"}`,
          borderRadius: "var(--radius)",
          padding: "24px 16px",
          textAlign: "center",
          cursor: "pointer",
          background: dragging ? "var(--accent-cyan-dim)" : "var(--bg-card)",
          transition: "all 0.2s ease",
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".pdf"
          style={{ display: "none" }}
          onChange={(e) => handleFile(e.target.files[0])}
        />
        <div style={{ fontSize: "28px", marginBottom: "8px" }}>
          {uploading ? "⏳" : "📂"}
        </div>
        <p style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 600,
          fontSize: "13px",
          color: "var(--text-primary)",
          marginBottom: "4px",
        }}>
          {uploading ? "Processing PDF..." : "Drop PDF here"}
        </p>
        <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>
          {uploading ? "Chunking & embedding..." : "or click to browse"}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: "rgba(255, 80, 80, 0.08)",
          border: "1px solid rgba(255, 80, 80, 0.3)",
          borderRadius: "var(--radius)",
          padding: "12px",
          fontSize: "12px",
          color: "#ff6b6b",
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Last Ingestion Stats */}
      {stats && (
        <div style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "14px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}>
          <p style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            fontSize: "11px",
            color: "var(--accent-cyan)",
            letterSpacing: "1.5px",
            textTransform: "uppercase",
          }}>
            Last Ingestion
          </p>
          {[
            { label: "Pages", value: stats.pages },
            { label: "Chunks", value: stats.chunks },
          ].map(({ label, value }) => (
            <div key={label} style={{
              display: "flex",
              justifyContent: "space-between",
            }}>
              <span style={{ color: "var(--text-secondary)", fontSize: "12px" }}>{label}</span>
              <span style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 700,
                color: "var(--accent-amber)",
                fontSize: "13px",
              }}>{value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Document List */}
      {documents.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <p style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            fontSize: "11px",
            color: "var(--accent-cyan)",
            letterSpacing: "1.5px",
            textTransform: "uppercase",
          }}>
            Vault — {documents.length} doc{documents.length !== 1 ? "s" : ""}
          </p>

          {documents.map((doc) => (
            <div
              key={doc.filename}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                padding: "10px 12px",
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                transition: "border-color 0.2s ease",
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--border-accent)"}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--border)"}
            >
              {/* File info row */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "16px", flexShrink: 0 }}>📄</span>
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <p style={{
                    fontSize: "11px",
                    color: "var(--text-primary)",
                    fontFamily: "'Syne', sans-serif",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}>
                    {doc.filename}
                  </p>
                  <p style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>
                    {doc.size_kb} KB
                  </p>
                </div>

                {/* Delete button */}
                <button
                  onClick={() => handleDeleteDocument(doc.filename)}
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "6px",
                    background: "transparent",
                    border: "1px solid var(--border)",
                    color: "var(--text-muted)",
                    fontSize: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#ff6b6b";
                    e.currentTarget.style.color = "#ff6b6b";
                    e.currentTarget.style.background = "rgba(255,80,80,0.08)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.color = "var(--text-muted)";
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Summarize button */}
              <button
                onClick={() => handleSummarize(doc.filename)}
                disabled={summarizing === doc.filename}
                style={{
                  width: "100%",
                  padding: "6px",
                  borderRadius: "6px",
                  background: summarizing === doc.filename
                    ? "var(--bg-hover)"
                    : "var(--accent-cyan-dim)",
                  border: `1px solid ${summarizing === doc.filename
                    ? "var(--border)"
                    : "var(--border-accent)"}`,
                  color: summarizing === doc.filename
                    ? "var(--text-muted)"
                    : "var(--accent-cyan)",
                  fontSize: "11px",
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 600,
                  transition: "all 0.2s ease",
                  letterSpacing: "0.5px",
                }}
                onMouseEnter={(e) => {
                  if (summarizing !== doc.filename) {
                    e.currentTarget.style.background = "rgba(0,229,255,0.2)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (summarizing !== doc.filename) {
                    e.currentTarget.style.background = "var(--accent-cyan-dim)";
                  }
                }}
              >
                {summarizing === doc.filename ? "⏳ Summarizing..." : "✦ Summarize"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Clear All Button */}
      {documents.length > 0 && (
        <button
          onClick={handleClearAll}
          style={{
            padding: "10px",
            borderRadius: "var(--radius)",
            background: "transparent",
            border: "1px solid var(--border)",
            color: "var(--text-secondary)",
            fontSize: "12px",
            marginTop: "auto",
            fontFamily: "'Syne', sans-serif",
          }}
          onMouseEnter={(e) => {
            e.target.style.borderColor = "#ff6b6b";
            e.target.style.color = "#ff6b6b";
          }}
          onMouseLeave={(e) => {
            e.target.style.borderColor = "var(--border)";
            e.target.style.color = "var(--text-secondary)";
          }}
        >
          🗑️ Clear All
        </button>
      )}
    </div>
  );
}