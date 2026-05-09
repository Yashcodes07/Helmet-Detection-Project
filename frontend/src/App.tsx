import { useState } from "react";
import { ShieldCheck, AlertTriangle } from "lucide-react";
import DropZone from "./components/DropZone";
import Loader from "./components/Loader";
import ResultPanel from "./components/ResultPanel";
import { useDetection } from "./hooks/useDetection";

export default function App() {
  const { state, run, reset } = useDetection();
  const [fileType, setFileType] = useState<"image" | "video">("image");

  function handleFile(file: File) {
    setFileType(file.type.startsWith("video/") ? "video" : "image");
    run(file);
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <header style={{
        borderBottom: "1px solid var(--border)",
        background: "var(--surface)",
        padding: "1rem 2rem",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
      }}>
        <ShieldCheck size={28} color="var(--accent)" />
        <div>
          <h1 style={{ fontSize: "1.2rem", fontWeight: 700 }}>Helmet Detection</h1>
          <p style={{ color: "var(--text-dim)", fontSize: "0.8rem" }}>YOLOv8 · helmet · person · motorcycle</p>
        </div>
      </header>

      {/* Main */}
      <main style={{ flex: 1, maxWidth: 860, width: "100%", margin: "0 auto", padding: "2rem 1.25rem" }}>
        {state.status === "idle" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div>
              <h2 style={{ fontSize: "1.6rem", fontWeight: 700, marginBottom: "0.4rem" }}>
                Upload an image or video
              </h2>
              <p style={{ color: "var(--text-dim)" }}>
                The model will detect helmets and draw bounding boxes. If no helmet is found, you'll be notified.
              </p>
            </div>
            <DropZone onFile={handleFile} />

            {/* How it works */}
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem",
              marginTop: "0.5rem"
            }}>
              {[
                { icon: "🪖", title: "Helmet", desc: "Detects wearing a helmet", color: "#22c55e" },
                { icon: "🧍", title: "Person", desc: "Detects people in frame", color: "#4f8ef7" },
                { icon: "🏍️", title: "Motorcycle", desc: "Detects motorcycles", color: "#f97316" },
              ].map(item => (
                <div key={item.title} style={{
                  background: "var(--surface)", border: "1px solid var(--border)",
                  borderRadius: "var(--radius)", padding: "1rem",
                }}>
                  <div style={{ fontSize: "1.8rem", marginBottom: "0.4rem" }}>{item.icon}</div>
                  <div style={{ fontWeight: 600, color: item.color }}>{item.title}</div>
                  <div style={{ color: "var(--text-dim)", fontSize: "0.82rem" }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {state.status === "loading" && <Loader isVideo={fileType === "video"} />}

        {state.status === "error" && (
          <div style={{
            background: "var(--red-dim)", border: "1px solid var(--red)",
            borderRadius: "var(--radius)", padding: "1.25rem 1.5rem",
            display: "flex", flexDirection: "column", gap: "0.75rem",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", color: "var(--red)", fontWeight: 600 }}>
              <AlertTriangle size={20} /> Detection failed
            </div>
            <p style={{ color: "var(--text-dim)", fontSize: "0.9rem" }}>{state.message}</p>
            <button
              onClick={reset}
              style={{
                alignSelf: "flex-start",
                background: "var(--surface2)", border: "1px solid var(--border)",
                borderRadius: "8px", padding: "0.5rem 1rem",
                color: "var(--text)", cursor: "pointer", fontWeight: 500,
              }}
            >
              Try again
            </button>
          </div>
        )}

        {state.status === "success" && (
          <ResultPanel
            result={state.result}
            outputUrl={state.outputUrl}
            onReset={reset}
          />
        )}
      </main>

      <footer style={{ textAlign: "center", padding: "1.25rem", color: "var(--text-dim)", fontSize: "0.8rem", borderTop: "1px solid var(--border)" }}>
        Helmet Detection · YOLOv8 trained on Open Images V7
      </footer>
    </div>
  );
}
