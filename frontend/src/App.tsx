import React, { useState } from "react";
import { ShieldCheck, AlertTriangle, Upload, Camera } from "lucide-react";
import DropZone from "./components/DropZone";
import Loader from "./components/Loader";
import ResultPanel from "./components/ResultPanel";
import LiveCamera from "./components/LiveCamera";
import { useDetection } from "./hooks/useDetection";

type Tab = "upload" | "live";

export default function App() {
  const { state, run, reset } = useDetection();
  const [fileType, setFileType] = useState<"image" | "video">("image");
  const [tab, setTab] = useState<Tab>("upload");

  function handleFile(file: File) {
    setFileType(file.type.startsWith("video/") ? "video" : "image");
    run(file);
  }

  function handleTabChange(t: Tab) {
    setTab(t);
    if (t === "upload") reset();
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)" }}>

      {/* Header */}
      <header style={{
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        padding: "0.875rem 2rem",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        boxShadow: "var(--shadow-sm)",
      }}>
        <div style={{
          background: "var(--accent-dim)",
          borderRadius: 10,
          padding: "6px 8px",
          display: "flex",
          alignItems: "center",
        }}>
          <ShieldCheck size={24} color="var(--accent)" />
        </div>
        <div>
          <h1 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text)" }}>Helmet Detection</h1>
          <p style={{ color: "var(--text-dim)", fontSize: "0.75rem" }}>YOLOv8 · helmet · person · motorcycle</p>
        </div>

        {/* header right badge */}
        <div style={{ marginLeft: "auto" }}>
          <span style={{
            background: "var(--accent-dim)", color: "var(--accent)",
            borderRadius: 20, padding: "3px 12px", fontSize: "0.75rem", fontWeight: 600,
            border: "1px solid rgba(59,126,248,0.2)",
          }}>
            AI Powered
          </span>
        </div>
      </header>

      {/* Tab bar */}
      <div style={{
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        padding: "0 2rem",
      }}>
        {([
          { id: "upload", label: "Upload File", icon: <Upload size={14} /> },
          { id: "live",   label: "Live Camera", icon: <Camera size={14} /> },
        ] as { id: Tab; label: string; icon: React.ReactNode }[]).map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => handleTabChange(id)}
            style={{
              display: "flex", alignItems: "center", gap: "0.4rem",
              padding: "0.8rem 1.25rem",
              background: "none", border: "none", cursor: "pointer",
              fontSize: "0.875rem", fontWeight: tab === id ? 700 : 500,
              color: tab === id ? "var(--accent)" : "var(--text-dim)",
              borderBottom: tab === id ? "2px solid var(--accent)" : "2px solid transparent",
              marginBottom: "-1px",
              transition: "all 0.15s ease",
            }}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {/* Main */}
      <main style={{ flex: 1, maxWidth: 880, width: "100%", margin: "0 auto", padding: "2rem 1.5rem" }}>

        {/* ── UPLOAD TAB ── */}
        {tab === "upload" && (
          <>
            {state.status === "idle" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                <div>
                  <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.35rem", color: "var(--text)" }}>
                    Upload an image or video
                  </h2>
                  <p style={{ color: "var(--text-dim)", fontSize: "0.95rem" }}>
                    The model detects helmets and draws bounding boxes. You'll be notified if no helmet is found.
                  </p>
                </div>

                <DropZone onFile={handleFile} />

                <div style={{
                  display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))", gap: "1rem",
                }}>
                  {[
                    { icon: "🪖", title: "Helmet",     desc: "Detects safety helmets",    color: "#16a34a", bg: "rgba(22,163,74,0.07)"  },
                    { icon: "🧍", title: "Person",     desc: "Detects people in frame",   color: "#3b7ef8", bg: "rgba(59,126,248,0.07)" },
                    { icon: "🏍️", title: "Motorcycle", desc: "Detects motorcycles",       color: "#ea580c", bg: "rgba(234,88,12,0.07)"  },
                  ].map(item => (
                    <div key={item.title} style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius)",
                      padding: "1.1rem 1rem",
                      boxShadow: "var(--shadow-sm)",
                      display: "flex", alignItems: "center", gap: "0.875rem",
                    }}>
                      <div style={{ fontSize: "1.6rem", background: item.bg, borderRadius: 8, padding: "6px 8px" }}>
                        {item.icon}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: item.color, fontSize: "0.9rem" }}>{item.title}</div>
                        <div style={{ color: "var(--text-dim)", fontSize: "0.78rem" }}>{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {state.status === "loading" && <Loader isVideo={fileType === "video"} />}

            {state.status === "error" && (
              <div style={{
                background: "var(--red-dim)", border: "1px solid var(--red-border)",
                borderRadius: "var(--radius)", padding: "1.25rem 1.5rem",
                display: "flex", flexDirection: "column", gap: "0.75rem",
                boxShadow: "var(--shadow-sm)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", color: "var(--red)", fontWeight: 700 }}>
                  <AlertTriangle size={18} /> Detection failed
                </div>
                <p style={{ color: "var(--text-dim)", fontSize: "0.9rem" }}>{state.message}</p>
                <button onClick={reset} style={{
                  alignSelf: "flex-start",
                  background: "var(--surface)", border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)", padding: "0.5rem 1.1rem",
                  color: "var(--text)", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem",
                  boxShadow: "var(--shadow-sm)",
                }}>
                  Try again
                </button>
              </div>
            )}

            {state.status === "success" && (
              <ResultPanel result={state.result} outputUrl={state.outputUrl} onReset={reset} />
            )}
          </>
        )}

        {/* ── LIVE CAMERA TAB ── */}
        {tab === "live" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.35rem", color: "var(--text)" }}>
                Live Camera Detection
              </h2>
              <p style={{ color: "var(--text-dim)", fontSize: "0.95rem" }}>
                Your camera feed is processed in real-time. First the model looks for a <strong>person</strong>, then checks whether they're wearing a <strong>helmet</strong>.
              </p>
            </div>
            <LiveCamera />
          </div>
        )}

      </main>

      <footer style={{
        textAlign: "center", padding: "1.1rem",
        color: "var(--text-muted)", fontSize: "0.78rem",
        borderTop: "1px solid var(--border)", background: "var(--surface)",
      }}>
        Helmet Detection · YOLOv8 trained on Open Images V7
      </footer>
    </div>
  );
}
