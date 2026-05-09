export default function Loader({ isVideo }: { isVideo?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", padding: "3rem" }}>
      <div style={{
        width: 52, height: 52, border: "3px solid var(--border)",
        borderTopColor: "var(--accent)", borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
      <p style={{ color: "var(--text-dim)", fontWeight: 500 }}>
        {isVideo ? "Processing video — this may take a moment…" : "Running detection…"}
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
