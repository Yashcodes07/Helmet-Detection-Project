import type { Detection } from "../utils/types";

const LABEL_COLORS: Record<string, string> = {
  helmet: "#22c55e",
  person: "#4f8ef7",
  motorcycle: "#f97316",
};

interface Props {
  detections: Detection[];
  isVideo?: boolean;
}

export default function DetectionTable({ detections, isVideo }: Props) {
  if (detections.length === 0) return null;

  // For video, show unique label counts instead of every frame hit
  if (isVideo) {
    const counts: Record<string, number> = {};
    for (const d of detections) counts[d.label] = (counts[d.label] ?? 0) + 1;

    return (
      <div>
        <h3 style={{ fontWeight: 600, marginBottom: "0.75rem", color: "var(--text-dim)", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Detections per class
        </h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
          {Object.entries(counts).map(([label, count]) => (
            <div key={label} style={{
              background: "var(--surface2)",
              border: `1px solid var(--border)`,
              borderRadius: "8px",
              padding: "0.6rem 1rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}>
              <span style={{
                width: 10, height: 10, borderRadius: "50%",
                background: LABEL_COLORS[label] ?? "#94a3b8", flexShrink: 0
              }} />
              <span style={{ fontWeight: 600, textTransform: "capitalize" }}>{label}</span>
              <span style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>× {count} frames</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ fontWeight: 600, marginBottom: "0.75rem", color: "var(--text-dim)", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        Detected objects
      </h3>
      <div style={{ overflowX: "auto", borderRadius: "8px", border: "1px solid var(--border)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
          <thead>
            <tr style={{ background: "var(--surface2)", color: "var(--text-dim)" }}>
              {["#", "Label", "Confidence", "Bounding Box"].map(h => (
                <th key={h} style={{ padding: "0.6rem 1rem", textAlign: "left", fontWeight: 500, whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {detections.map((d, i) => (
              <tr key={i} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={{ padding: "0.55rem 1rem", color: "var(--text-dim)" }}>{i + 1}</td>
                <td style={{ padding: "0.55rem 1rem" }}>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: "0.4rem",
                    background: "var(--surface2)", borderRadius: 6, padding: "2px 8px",
                    fontWeight: 600, textTransform: "capitalize",
                    color: LABEL_COLORS[d.label] ?? "var(--text)",
                  }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: LABEL_COLORS[d.label] ?? "#94a3b8" }} />
                    {d.label}
                  </span>
                </td>
                <td style={{ padding: "0.55rem 1rem" }}>
                  <span style={{
                    background: "var(--surface2)", borderRadius: 6, padding: "2px 8px",
                    fontWeight: 500, color: "var(--accent)",
                  }}>
                    {(d.confidence * 100).toFixed(1)}%
                  </span>
                </td>
                <td style={{ padding: "0.55rem 1rem", color: "var(--text-dim)", fontFamily: "monospace", fontSize: "0.8rem" }}>
                  [{d.box.join(", ")}]
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
