import { useState, useRef, useEffect } from "react";
import axios from "axios";
import SourceCard from "./SourceCard";
import ReactMarkdown from "react-markdown";

const API = "http://127.0.0.1:8000";

export default function ChatPanel({ vaultReady, summaryMessage, onSummaryConsumed, suggestedQuestion, onSuggestionConsumed }) {
  const [messages, setMessages] = useState([
    {
      role: "system",
      text: "VaultMind is ready. Upload a document and start asking questions.",
    },
  ]);
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Reset history when vault is cleared
  useEffect(() => {
    if (!vaultReady) {
      setHistory([]);
      setMessages([
        {
          role: "system",
          text: "VaultMind is ready. Upload a document and start asking questions.",
        },
      ]);
    }
  }, [vaultReady]);
  useEffect(() => {
      if (summaryMessage) {
        setMessages((prev) => [
          ...prev,
          {
            role: "summary",
            filename: summaryMessage.filename,
            text: summaryMessage.summary,
            total_chunks: summaryMessage.total_chunks,
          },
        ]);
        onSummaryConsumed();
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }, [summaryMessage]);
  
    useEffect(() => {
    if (suggestedQuestion) {
      setInput(suggestedQuestion);
      onSuggestionConsumed();
    }
  }, [suggestedQuestion]);

  const sendMessage = async () => {
    if (!input.trim() || loading || !vaultReady) return;

    const question = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setLoading(true);

    try {
      const res = await axios.post(`${API}/query`, {
        question,
        history,
        n_results: 5,
      });

      setHistory(res.data.history);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: res.data.answer,
          sources: res.data.sources,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "⚠️ Failed to get a response. Make sure the backend is running.",
          sources: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setHistory([]);
    setMessages([
      {
        role: "system",
        text: "Conversation cleared. Ask a new question.",
      },
    ]);
  };

  return (
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      background: "var(--bg-primary)",
    }}>

      {/* ── Chat Toolbar ── */}
      {messages.length > 1 && vaultReady && (
        <div style={{
          padding: "8px 32px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--bg-secondary)",
        }}>
          <span style={{
            fontSize: "11px",
            color: "var(--text-muted)",
            fontFamily: "'Syne', sans-serif",
          }}>
            {history.length / 2} turn{history.length / 2 !== 1 ? "s" : ""} in conversation
          </span>
          <button
            onClick={clearChat}
            style={{
              padding: "4px 12px",
              borderRadius: "6px",
              background: "transparent",
              border: "1px solid var(--border)",
              color: "var(--text-muted)",
              fontSize: "11px",
              fontFamily: "'Syne', sans-serif",
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = "var(--accent-amber)";
              e.target.style.color = "var(--accent-amber)";
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = "var(--border)";
              e.target.style.color = "var(--text-muted)";
            }}
          >
            Clear Chat
          </button>
        </div>
      )}

      {/* ── Messages ── */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "24px 32px",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
      }}>
        {messages.map((msg, i) => (
          <div key={i}>

            {/* System message */}
            {msg.role === "system" && (
              <div style={{
                textAlign: "center",
                color: "var(--text-muted)",
                fontSize: "12px",
                fontFamily: "'Syne', sans-serif",
                padding: "8px 16px",
                border: "1px solid var(--border)",
                borderRadius: "20px",
                display: "inline-block",
                margin: "0 auto",
                width: "100%",
              }}>
                {msg.text}
              </div>
            )}

            {/* User message */}
            {msg.role === "user" && (
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <div style={{
                  maxWidth: "65%",
                  background: "linear-gradient(135deg, var(--accent-cyan-dim), var(--accent-amber-dim))",
                  border: "1px solid var(--border-accent)",
                  borderRadius: "12px 12px 2px 12px",
                  padding: "12px 16px",
                  fontSize: "13px",
                  color: "var(--text-primary)",
                  lineHeight: 1.6,
                }}>
                  {msg.text}
                </div>
              </div>
            )}

            {/* Assistant message */}
            {msg.role === "assistant" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                  {/* Avatar */}
                  <div style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "8px",
                    background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-amber))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "14px",
                    flexShrink: 0,
                  }}>
                    🧠
                  </div>

                  {/* Answer */}
                  <div style={{
                    flex: 1,
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: "2px 12px 12px 12px",
                    padding: "14px 16px",
                    fontSize: "13px",
                    color: "var(--text-primary)",
                    lineHeight: 1.8,
                  }}>
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p style={{ marginBottom: "8px" }}>{children}</p>,
                        strong: ({ children }) => <strong style={{ color: "var(--accent-cyan)", fontWeight: 700 }}>{children}</strong>,
                        em: ({ children }) => <em style={{ color: "var(--accent-amber)" }}>{children}</em>,
                        ul: ({ children }) => <ul style={{ paddingLeft: "20px", marginBottom: "8px" }}>{children}</ul>,
                        ol: ({ children }) => <ol style={{ paddingLeft: "20px", marginBottom: "8px" }}>{children}</ol>,
                        li: ({ children }) => <li style={{ marginBottom: "4px" }}>{children}</li>,
                        code: ({ children }) => (
                          <code style={{
                            background: "var(--bg-hover)",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            fontSize: "12px",
                            color: "var(--accent-amber)",
                            fontFamily: "'JetBrains Mono', monospace",
                          }}>
                            {children}
                          </code>
                        ),
                        h1: ({ children }) => <h1 style={{ fontSize: "16px", fontFamily: "'Syne', sans-serif", color: "var(--accent-cyan)", marginBottom: "8px" }}>{children}</h1>,
                        h2: ({ children }) => <h2 style={{ fontSize: "14px", fontFamily: "'Syne', sans-serif", color: "var(--accent-cyan)", marginBottom: "6px" }}>{children}</h2>,
                        h3: ({ children }) => <h3 style={{ fontSize: "13px", fontFamily: "'Syne', sans-serif", color: "var(--accent-amber)", marginBottom: "6px" }}>{children}</h3>,
                      }}
                    >
                      {msg.text}
                    </ReactMarkdown>
                  </div>
                </div>

                {/* Sources */}
                {msg.sources && msg.sources.length > 0 && (
                  <div style={{ paddingLeft: "40px" }}>
                    <p style={{
                      fontSize: "11px",
                      color: "var(--text-muted)",
                      fontFamily: "'Syne', sans-serif",
                      letterSpacing: "1.5px",
                      textTransform: "uppercase",
                      marginBottom: "8px",
                    }}>
                      Sources
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {msg.sources.map((src, j) => (
                        <SourceCard key={j} source={src} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* Summary message */}
            {msg.role === "summary" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                  <div style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "8px",
                    background: "linear-gradient(135deg, var(--accent-amber), var(--accent-cyan))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "14px",
                    flexShrink: 0,
                  }}>
                    📋
                  </div>
                  <div style={{
                    flex: 1,
                    background: "var(--bg-card)",
                    border: "1px solid var(--accent-amber)",
                    borderRadius: "2px 12px 12px 12px",
                    padding: "14px 16px",
                    fontSize: "13px",
                    color: "var(--text-primary)",
                    lineHeight: 1.8,
                  }}>
                    <p style={{
                      fontFamily: "'Syne', sans-serif",
                      fontWeight: 700,
                      fontSize: "11px",
                      color: "var(--accent-amber)",
                      letterSpacing: "1.5px",
                      textTransform: "uppercase",
                      marginBottom: "10px",
                    }}>
                      📋 Summary — {msg.filename}
                    </p>
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p style={{ marginBottom: "8px" }}>{children}</p>,
                        strong: ({ children }) => <strong style={{ color: "var(--accent-amber)", fontWeight: 700 }}>{children}</strong>,
                        ul: ({ children }) => <ul style={{ paddingLeft: "20px", marginBottom: "8px" }}>{children}</ul>,
                        li: ({ children }) => <li style={{ marginBottom: "4px" }}>{children}</li>,
                      }}
                    >
                      {msg.text}
                    </ReactMarkdown>
                    <p style={{
                      fontSize: "10px",
                      color: "var(--text-muted)",
                      marginTop: "10px",
                      borderTop: "1px solid var(--border)",
                      paddingTop: "8px",
                    }}>
                      Generated from {msg.total_chunks} chunks
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <div style={{
              width: "28px",
              height: "28px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-amber))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "14px",
            }}>
              🧠
            </div>
            <div style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "2px 12px 12px 12px",
              padding: "14px 16px",
              display: "flex",
              gap: "6px",
              alignItems: "center",
            }}>
              {[0, 1, 2].map((d) => (
                <div key={d} style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "var(--accent-cyan)",
                  animation: "bounce 1.2s infinite",
                  animationDelay: `${d * 0.2}s`,
                }} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input Bar ── */}
      <div style={{
        padding: "16px 32px 24px",
        borderTop: "1px solid var(--border)",
        background: "var(--bg-secondary)",
      }}>
        <div style={{
          display: "flex",
          gap: "12px",
          alignItems: "flex-end",
          background: "var(--bg-card)",
          border: `1px solid ${vaultReady ? "var(--border-accent)" : "var(--border)"}`,
          borderRadius: "var(--radius)",
          padding: "12px 16px",
          transition: "border-color 0.2s ease",
        }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={vaultReady ? "Ask anything about your document..." : "Upload a document first..."}
            disabled={!vaultReady || loading}
            rows={1}
            style={{
              flex: 1,
              background: "transparent",
              color: "var(--text-primary)",
              fontSize: "13px",
              lineHeight: 1.6,
              resize: "none",
              maxHeight: "120px",
              overflowY: "auto",
              caretColor: "var(--accent-cyan)",
            }}
            onInput={(e) => {
              e.target.style.height = "auto";
              e.target.style.height = e.target.scrollHeight + "px";
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!vaultReady || loading || !input.trim()}
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              background: vaultReady && input.trim()
                ? "linear-gradient(135deg, var(--accent-cyan), var(--accent-amber))"
                : "var(--bg-hover)",
              color: vaultReady && input.trim() ? "#000" : "var(--text-muted)",
              fontSize: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "all 0.2s ease",
            }}
          >
            ↑
          </button>
        </div>
        <p style={{
          fontSize: "11px",
          color: "var(--text-muted)",
          marginTop: "8px",
          textAlign: "center",
        }}>
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}