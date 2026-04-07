import { useState, useRef } from "react";
import axios from "axios";

const API = "http://127.0.0.1:8000";

export default function UploadPanel({ onUploadSuccess }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(null);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const fileRef = useRef();

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
      setUploaded(file.name);
      setStats({
        pages: res.data.pages_processed,
        chunks: res.data.chunks_stored,
      });
      onUploadSuccess(file.name);
    } catch (err) {
      setError(err.response?.data?.detail || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleClear = async () => {
    try {
      await axios.delete(`${API}/clear`);
      setUploaded(null);
      setStats(null);
      setError(null);
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
          Upload a PDF to begin querying its contents with AI.
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
          border: `2px dashed ${dragging ? "var(--accent-cyan)" : uploaded ? "var(--accent-amber)" : "var(--text-muted)"}`,
          borderRadius: "var(--radius)",
          padding: "32px 16px",
          textAlign: "center",
          cursor: "pointer",
          background: dragging
            ? "var(--accent-cyan-dim)"
            : uploaded
            ? "var(--accent-amber-dim)"
            : "var(--bg-card)",
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
        <div style={{ fontSize: "32px", marginBottom: "12px" }}>
          {uploading ? "⏳" : uploaded ? "📄" : "📂"}
        </div>
        <p style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 600,
          fontSize: "13px",
          color: uploaded ? "var(--accent-amber)" : "var(--text-primary)",
          marginBottom: "4px",
        }}>
          {uploading
            ? "Processing PDF..."
            : uploaded
            ? uploaded
            : "Drop PDF here"}
        </p>
        <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>
          {uploading ? "Chunking & embedding..." : "or click to browse"}
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}>
          <p style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            fontSize: "11px",
            color: "var(--accent-cyan)",
            letterSpacing: "1.5px",
            textTransform: "uppercase",
          }}>
            Ingestion Stats
          </p>
          {[
            { label: "Pages Processed", value: stats.pages },
            { label: "Chunks Stored", value: stats.chunks },
          ].map(({ label, value }) => (
            <div key={label} style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              <span style={{ color: "var(--text-secondary)", fontSize: "12px" }}>{label}</span>
              <span style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 700,
                color: "var(--accent-amber)",
                fontSize: "14px",
              }}>{value}</span>
            </div>
          ))}
        </div>
      )}

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

      {/* Clear Button */}
      {uploaded && (
        <button
          onClick={handleClear}
          style={{
            padding: "10px",
            borderRadius: "var(--radius)",
            background: "transparent",
            border: "1px solid var(--border)",
            color: "var(--text-secondary)",
            fontSize: "12px",
            marginTop: "auto",
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
          🗑️ Clear Vault
        </button>
      )}
    </div>
  );
}