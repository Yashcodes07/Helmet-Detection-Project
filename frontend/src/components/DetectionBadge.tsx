import { CheckCircle, XCircle } from "lucide-react";

interface Props {
  detected: boolean;
  message: string;
}

export default function DetectionBadge({ detected, message }: Props) {
  const color = detected ? "var(--green)" : "var(--red)";
  const bg = detected ? "var(--green-dim)" : "var(--red-dim)";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        background: bg,
        border: `1px solid ${color}`,
        borderRadius: "var(--radius)",
        padding: "0.875rem 1.25rem",
      }}
    >
      {detected
        ? <CheckCircle size={24} color={color} />
        : <XCircle size={24} color={color} />}
      <span style={{ color, fontWeight: 600, fontSize: "1rem" }}>{message}</span>
    </div>
  );
}
