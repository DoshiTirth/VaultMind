import { useState } from "react";
import UploadPanel from "./components/UploadPanel";
import ChatPanel from "./components/ChatPanel";
import "./index.css";

export default function App() {
  const [vaultReady, setVaultReady] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [summaryMessage, setSummaryMessage] = useState(null);
  const [suggestedQuestion, setSuggestedQuestion] = useState(null);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      background: "var(--bg-primary)",
      overflow: "hidden",
    }}>

      {/* ── Header ── */}
      <header style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 32px",
        borderBottom: "1px solid var(--border)",
        background: "var(--bg-secondary)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "32px",
            height: "32px",
            borderRadius: "8px",
            background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-amber))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "16px",
          }}>
            🧠
          </div>
          <span style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 800,
            fontSize: "20px",
            letterSpacing: "-0.5px",
            background: "linear-gradient(90deg, var(--accent-cyan), var(--accent-amber))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            VaultMind
          </span>
          <span style={{
            fontSize: "11px",
            color: "var(--text-muted)",
            fontFamily: "'JetBrains Mono', monospace",
            marginLeft: "4px",
          }}>
            v1.0 — RAG Document Intelligence
          </span>
        </div>

        {/* Status indicator */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "6px 14px",
          borderRadius: "20px",
          background: vaultReady ? "rgba(0, 229, 255, 0.08)" : "rgba(255,255,255,0.04)",
          border: `1px solid ${vaultReady ? "var(--border-accent)" : "var(--border)"}`,
        }}>
          <div style={{
            width: "7px",
            height: "7px",
            borderRadius: "50%",
            background: vaultReady ? "var(--accent-cyan)" : "var(--text-muted)",
            boxShadow: vaultReady ? "0 0 8px var(--accent-cyan)" : "none",
            animation: vaultReady ? "pulse 2s infinite" : "none",
          }} />
          <span style={{
            fontSize: "11px",
            color: vaultReady ? "var(--accent-cyan)" : "var(--text-muted)",
            fontFamily: "'Syne', sans-serif",
            fontWeight: 600,
          }}>
            {vaultReady ? `VAULT ACTIVE — ${uploadedFile}` : "NO DOCUMENT LOADED"}
          </span>
        </div>
      </header>

      {/* ── Main Layout ── */}
      <div style={{
        display: "flex",
        flex: 1,
        overflow: "hidden",
      }}>
        <UploadPanel
          onUploadSuccess={(filename) => {
            setVaultReady(true);
            setUploadedFile(filename);
          }}
          onVaultCleared={() => {
            setVaultReady(false);
            setUploadedFile(null);
          }}
          onSummary={(data) => {
            setSummaryMessage(data);
          }}
          onSuggest={(question) => {
            setSuggestedQuestion(question);
          }}
        />
        <ChatPanel
          vaultReady={vaultReady}
          summaryMessage={summaryMessage}
          onSummaryConsumed={() => setSummaryMessage(null)}
          suggestedQuestion={suggestedQuestion}
          onSuggestionConsumed={() => setSuggestedQuestion(null)}
        />
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}