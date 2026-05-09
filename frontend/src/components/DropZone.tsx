import { useRef, useState, DragEvent, ChangeEvent } from "react";
import { Upload, ImageIcon, VideoIcon } from "lucide-react";

interface Props {
  onFile: (f: File) => void;
  disabled?: boolean;
}

const ACCEPTED = "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime";

export default function DropZone({ onFile, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    onFile(files[0]);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (!disabled) handleFiles(e.dataTransfer.files);
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault();
    if (!disabled) setDragging(true);
  }

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    handleFiles(e.target.files);
    e.target.value = "";
  }

  return (
    <div
      onClick={() => !disabled && inputRef.current?.click()}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={() => setDragging(false)}
      style={{
        border: `2px dashed ${dragging ? "var(--accent)" : "var(--border)"}`,
        borderRadius: "var(--radius)",
        background: dragging ? "var(--accent-dim)" : "var(--surface)",
        padding: "3rem 2rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "1rem",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.2s ease",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <input ref={inputRef} type="file" accept={ACCEPTED} onChange={onChange} hidden />
      <Upload size={40} color={dragging ? "var(--accent)" : "var(--text-dim)"} />
      <div style={{ textAlign: "center" }}>
        <p style={{ fontWeight: 600, fontSize: "1.05rem" }}>
          Drop your file here, or <span style={{ color: "var(--accent)" }}>browse</span>
        </p>
        <p style={{ color: "var(--text-dim)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
          Supports images & videos
        </p>
      </div>
      <div style={{ display: "flex", gap: "1rem", color: "var(--text-dim)", fontSize: "0.8rem" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
          <ImageIcon size={14} /> JPG · PNG · WEBP
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
          <VideoIcon size={14} /> MP4 · WEBM · MOV
        </span>
      </div>
    </div>
  );
}
