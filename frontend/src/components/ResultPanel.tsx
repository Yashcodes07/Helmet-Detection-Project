import { Download, RefreshCw } from "lucide-react";
import DetectionBadge from "./DetectionBadge";
import DetectionTable from "./DetectionTable";
import type { DetectionResult, VideoResult } from "../utils/types";

interface Props {
  result: DetectionResult;
  outputUrl: string;
  onReset: () => void;
}

function isVideoResult(r: DetectionResult): r is VideoResult {
  return "helmet_frames" in r;
}

export default function ResultPanel({ result, outputUrl, onReset }: Props) {
  const isVideo = isVideoResult(result);
  const fullUrl = outputUrl;   // Vite proxy forwards /outputs → backend

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <DetectionBadge detected={result.helmet_detected} message={result.message} />

      {/* Output media */}
      <div style={{ borderRadius: "var(--radius)", overflow: "hidden", background: "var(--surface2)", border: "1px solid var(--border)" }}>
        {isVideo ? (
          <video
            src={fullUrl}
            controls
            style={{ width: "100%", display: "block", maxHeight: "480px", objectFit: "contain" }}
          />
        ) : (
          <img
            src={fullUrl}
            alt="Detection result"
            style={{ width: "100%", display: "block", maxHeight: "480px", objectFit: "contain" }}
          />
        )}
      </div>

      {/* Stats strip for video */}
      {isVideo && (
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          {[
            { label: "Helmet frames", value: (result as VideoResult).helmet_frames },
            { label: "Total detections", value: (result as VideoResult).total_detections },
          ].map(({ label, value }) => (
            <div key={label} style={{
              flex: 1, minWidth: "120px",
              background: "var(--surface2)", border: "1px solid var(--border)",
              borderRadius: "var(--radius)", padding: "0.875rem 1.125rem",
            }}>
              <div style={{ color: "var(--text-dim)", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: "0.2rem" }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      <DetectionTable detections={result.detections} isVideo={isVideo} />

      {/* Actions */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <a
          href={fullUrl}
          download
          style={{
            display: "inline-flex", alignItems: "center", gap: "0.5rem",
            background: "var(--accent)", color: "#fff",
            borderRadius: "8px", padding: "0.625rem 1.25rem",
            fontWeight: 600, fontSize: "0.9rem", textDecoration: "none",
          }}
        >
          <Download size={16} /> Download result
        </a>
        <button
          onClick={onReset}
          style={{
            display: "inline-flex", alignItems: "center", gap: "0.5rem",
            background: "var(--surface2)", color: "var(--text)",
            border: "1px solid var(--border)",
            borderRadius: "8px", padding: "0.625rem 1.25rem",
            fontWeight: 600, fontSize: "0.9rem", cursor: "pointer",
          }}
        >
          <RefreshCw size={16} /> Try another
        </button>
      </div>
    </div>
  );
}
