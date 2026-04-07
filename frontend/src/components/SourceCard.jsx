export default function SourceCard({ source }) {
  const scorePercent = Math.round(source.score * 100);
  const scoreColor =
    scorePercent >= 60
      ? "var(--accent-cyan)"
      : scorePercent >= 40
      ? "var(--accent-amber)"
      : "var(--text-muted)";

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "10px",
      padding: "8px 12px",
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: "8px",
      fontSize: "11px",
      transition: "border-color 0.2s ease",
      cursor: "default",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = "var(--border-accent)";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = "var(--border)";
    }}
    >
      {/* File icon */}
      <span style={{ fontSize: "14px" }}>📄</span>

      {/* Source info */}
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        <span style={{
          color: "var(--text-primary)",
          fontFamily: "'Syne', sans-serif",
          fontWeight: 600,
          fontSize: "11px",
        }}>
          {source.source}
        </span>
        <span style={{ color: "var(--text-muted)" }}>
          Page {source.page_number}
        </span>
      </div>

      {/* Divider */}
      <div style={{
        width: "1px",
        height: "24px",
        background: "var(--border)",
        margin: "0 2px",
      }} />

      {/* Score */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
        <span style={{
          color: scoreColor,
          fontFamily: "'Syne', sans-serif",
          fontWeight: 700,
          fontSize: "13px",
        }}>
          {scorePercent}%
        </span>
        <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>match</span>
      </div>
    </div>
  );
}