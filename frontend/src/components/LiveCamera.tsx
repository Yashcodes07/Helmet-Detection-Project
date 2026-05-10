import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, CameraOff, FlipHorizontal, Wifi, WifiOff, Volume2, VolumeX } from "lucide-react";
import { useLiveDetection, LiveDetection } from "../hooks/useLiveDetection";

const CLASS_COLORS: Record<string, string> = {
  helmet:     "#16a34a",
  person:     "#3b7ef8",
  motorcycle: "#ea580c",
};

function color(label: string) {
  return CLASS_COLORS[label.toLowerCase()] ?? "#dc2626";
}

// ── Beep generator using Web Audio API ────────────────────────────────────────
function playAlertBeep(audioCtx: AudioContext) {
  // Two-tone urgent beep
  const times = [0, 0.18];
  times.forEach((startOffset) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.type = "square";
    osc.frequency.setValueAtTime(880, audioCtx.currentTime + startOffset);
    osc.frequency.setValueAtTime(660, audioCtx.currentTime + startOffset + 0.08);

    gain.gain.setValueAtTime(0, audioCtx.currentTime + startOffset);
    gain.gain.linearRampToValueAtTime(0.35, audioCtx.currentTime + startOffset + 0.01);
    gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + startOffset + 0.15);

    osc.start(audioCtx.currentTime + startOffset);
    osc.stop(audioCtx.currentTime + startOffset + 0.18);
  });
}

export default function LiveCamera() {
  const {
    videoRef, canvasRef, cameraState, errorMsg,
    latestFrame, fps, startCamera, stopCamera,
  } = useLiveDetection();

  const overlayRef       = useRef<HTMLCanvasElement>(null);
  const audioCtxRef      = useRef<AudioContext | null>(null);
  const lastBeepRef      = useRef<number>(0);
  const noHelmetCountRef = useRef<number>(0);  // consecutive no-helmet frames

  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [dimensions, setDimensions] = useState({ w: 640, h: 480 });
  const [muted, setMuted]           = useState(false);
  const [alerting, setAlerting]     = useState(false);  // flashing red border state

  // ── ensure AudioContext exists (created on user gesture) ──────────────────
  const ensureAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
  }, []);

  // ── draw bounding boxes ───────────────────────────────────────────────────
  useEffect(() => {
    const overlay = overlayRef.current;
    const video   = videoRef.current;
    if (!overlay || !video) return;

    const w = video.videoWidth  || dimensions.w;
    const h = video.videoHeight || dimensions.h;
    overlay.width  = w;
    overlay.height = h;
    setDimensions({ w, h });

    const ctx = overlay.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);

    if (!latestFrame?.detections?.length) return;

    latestFrame.detections.forEach((det: LiveDetection) => {
      const [x1, y1, x2, y2] = det.box;
      const c     = color(det.label);
      const label = `${det.label} ${(det.confidence * 100).toFixed(0)}%`;

      // rounded-rect box
      const r = 4;
      ctx.strokeStyle = c;
      ctx.lineWidth   = 2.5;
      ctx.beginPath();
      ctx.moveTo(x1 + r, y1);
      ctx.lineTo(x2 - r, y1);
      ctx.quadraticCurveTo(x2, y1, x2, y1 + r);
      ctx.lineTo(x2, y2 - r);
      ctx.quadraticCurveTo(x2, y2, x2 - r, y2);
      ctx.lineTo(x1 + r, y2);
      ctx.quadraticCurveTo(x1, y2, x1, y2 - r);
      ctx.lineTo(x1, y1 + r);
      ctx.quadraticCurveTo(x1, y1, x1 + r, y1);
      ctx.closePath();
      ctx.stroke();

      // label pill
      ctx.font = "bold 12px Inter, system-ui, sans-serif";
      const tw = ctx.measureText(label).width;
      const ph = 20, pw = tw + 12, pr = 5;
      const lx = x1, ly = y1 - ph - 4;

      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.moveTo(lx + pr, ly);
      ctx.lineTo(lx + pw - pr, ly);
      ctx.quadraticCurveTo(lx + pw, ly, lx + pw, ly + pr);
      ctx.lineTo(lx + pw, ly + ph - pr);
      ctx.quadraticCurveTo(lx + pw, ly + ph, lx + pw - pr, ly + ph);
      ctx.lineTo(lx + pr, ly + ph);
      ctx.quadraticCurveTo(lx, ly + ph, lx, ly + ph - pr);
      ctx.lineTo(lx, ly + pr);
      ctx.quadraticCurveTo(lx, ly, lx + pr, ly);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#fff";
      ctx.fillText(label, lx + 6, ly + 13);
    });
  }, [latestFrame, dimensions, videoRef]);

  // ── beep logic: person detected but NO helmet ─────────────────────────────
  useEffect(() => {
    if (!latestFrame) return;

    const personFound  = latestFrame.detections?.some(d => d.label === "person");
    const helmetFound  = latestFrame.helmet_detected;
    const noHelmetAlert = personFound && !helmetFound;

    if (noHelmetAlert) {
      noHelmetCountRef.current += 1;
    } else {
      noHelmetCountRef.current = 0;
      setAlerting(false);
      return;
    }

    // only alert after 3 consecutive frames (avoid false positives)
    if (noHelmetCountRef.current < 3) return;

    setAlerting(true);

    if (!muted) {
      const now = Date.now();
      if (now - lastBeepRef.current > 2000) {   // max 1 beep per 2s
        lastBeepRef.current = now;
        if (audioCtxRef.current) {
          playAlertBeep(audioCtxRef.current);
        }
      }
    }
  }, [latestFrame, muted]);

  // ── camera controls ───────────────────────────────────────────────────────
  async function handleToggle() {
    ensureAudio();
    if (cameraState === "running") {
      stopCamera();
      setAlerting(false);
      noHelmetCountRef.current = 0;
    } else {
      await startCamera(facingMode);
    }
  }

  async function handleFlip() {
    const next = facingMode === "user" ? "environment" : "user";
    setFacingMode(next);
    if (cameraState === "running") {
      stopCamera();
      setTimeout(() => startCamera(next), 300);
    }
  }

  const isRunning   = cameraState === "running";
  const helmetFound = latestFrame?.helmet_detected ?? false;
  const personFound = latestFrame?.detections?.some(d => d.label === "person") ?? false;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

      {/* ── Status bar ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: "0.5rem",
      }}>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          {isRunning ? (
            <span style={{
              display: "flex", alignItems: "center", gap: "0.4rem",
              background: "rgba(22,163,74,0.1)", border: "1px solid rgba(22,163,74,0.35)",
              borderRadius: 20, padding: "3px 12px", fontSize: "0.78rem", color: "#16a34a", fontWeight: 700,
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: "50%", background: "#16a34a",
                animation: "livePulse 1.2s ease-in-out infinite",
              }} />
              LIVE
            </span>
          ) : (
            <span style={{
              display: "flex", alignItems: "center", gap: "0.4rem",
              background: "var(--surface2)", border: "1px solid var(--border)",
              borderRadius: 20, padding: "3px 12px", fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600,
            }}>
              OFFLINE
            </span>
          )}
          {isRunning && (
            <span style={{
              fontSize: "0.78rem", color: "var(--text-dim)",
              background: "var(--surface2)", border: "1px solid var(--border)",
              borderRadius: 20, padding: "3px 10px",
            }}>
              {fps} fps
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          {/* Mute toggle */}
          <button
            onClick={() => { ensureAudio(); setMuted(m => !m); }}
            title={muted ? "Unmute alerts" : "Mute alerts"}
            style={{
              background: muted ? "rgba(220,38,38,0.08)" : "var(--surface)",
              border: `1px solid ${muted ? "rgba(220,38,38,0.3)" : "var(--border)"}`,
              borderRadius: "var(--radius-sm)", padding: "0.45rem 0.75rem",
              color: muted ? "var(--red)" : "var(--text-dim)",
              cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem",
              fontSize: "0.82rem", fontWeight: 500, boxShadow: "var(--shadow-sm)",
            }}
          >
            {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            {muted ? "Muted" : "Sound on"}
          </button>

          {/* Flip */}
          <button onClick={handleFlip} title="Flip camera" style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)", padding: "0.45rem 0.75rem",
            color: "var(--text-dim)", cursor: "pointer",
            display: "flex", alignItems: "center", gap: "0.4rem",
            fontSize: "0.82rem", fontWeight: 500, boxShadow: "var(--shadow-sm)",
          }}>
            <FlipHorizontal size={14} /> Flip
          </button>

          {/* Start / Stop */}
          <button onClick={handleToggle} style={{
            background: isRunning ? "var(--red-dim)" : "var(--accent)",
            border: `1px solid ${isRunning ? "var(--red-border)" : "transparent"}`,
            borderRadius: "var(--radius-sm)", padding: "0.45rem 1rem",
            color: isRunning ? "var(--red)" : "#fff",
            cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem",
            fontWeight: 700, fontSize: "0.85rem", boxShadow: "var(--shadow-sm)",
          }}>
            {isRunning
              ? <><CameraOff size={14} /> Stop</>
              : <><Camera size={14} /> Start Camera</>}
          </button>
        </div>
      </div>

      {/* ── No-helmet alert banner ── */}
      {isRunning && alerting && (
        <div style={{
          display: "flex", alignItems: "center", gap: "0.75rem",
          background: "rgba(220,38,38,0.07)",
          border: "1.5px solid rgba(220,38,38,0.4)",
          borderRadius: "var(--radius-sm)", padding: "0.7rem 1rem",
          animation: "alertPulse 1s ease-in-out infinite",
        }}>
          <span style={{ fontSize: "1.3rem" }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 700, color: "var(--red)", fontSize: "0.9rem" }}>
              No Helmet Detected!
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-dim)" }}>
              Person found but not wearing a helmet
            </div>
          </div>
          {muted && (
            <span style={{
              marginLeft: "auto", fontSize: "0.75rem",
              color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.3rem",
            }}>
              <VolumeX size={13} /> Sound muted
            </span>
          )}
        </div>
      )}

      {/* ── Video + overlay ── */}
      <div style={{
        position: "relative", borderRadius: "var(--radius)", overflow: "hidden",
        background: "#111",
        border: alerting && isRunning
          ? "2px solid rgba(220,38,38,0.6)"
          : "1px solid var(--border)",
        aspectRatio: "4/3", maxHeight: 500,
        boxShadow: alerting && isRunning
          ? "0 0 0 3px rgba(220,38,38,0.15), var(--shadow-md)"
          : "var(--shadow-md)",
        transition: "border-color 0.3s, box-shadow 0.3s",
      }}>
        <video
          ref={videoRef}
          muted
          playsInline
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
        <canvas ref={canvasRef} style={{ display: "none" }} />
        <canvas
          ref={overlayRef}
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%",
            pointerEvents: "none",
          }}
        />

        {/* offline placeholder */}
        {!isRunning && cameraState !== "starting" && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: "0.75rem", color: "#888",
            background: "#f8f9fb",
          }}>
            <div style={{
              background: "#eef0f5", borderRadius: "50%", padding: "1.25rem",
            }}>
              <Camera size={40} strokeWidth={1.2} color="#aab" />
            </div>
            <p style={{ fontWeight: 600, color: "#666" }}>Camera is off</p>
            <p style={{ fontSize: "0.82rem", color: "#999" }}>Click "Start Camera" to begin live detection</p>
          </div>
        )}

        {cameraState === "starting" && (
          <div style={{
            position: "absolute", inset: 0, display: "flex",
            alignItems: "center", justifyContent: "center",
            background: "rgba(255,255,255,0.85)", gap: "0.75rem", color: "var(--text)",
          }}>
            <div style={{
              width: 26, height: 26, border: "3px solid var(--border)",
              borderTopColor: "var(--accent)", borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }} />
            <span style={{ fontWeight: 600 }}>Starting camera…</span>
          </div>
        )}
      </div>

      {/* ── Detection verdict cards ── */}
      {isRunning && (
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>

          {/* Person */}
          <div style={{
            flex: 1, minWidth: 140,
            display: "flex", alignItems: "center", gap: "0.7rem",
            background: personFound ? "rgba(59,126,248,0.06)" : "var(--surface)",
            border: `1px solid ${personFound ? "rgba(59,126,248,0.3)" : "var(--border)"}`,
            borderRadius: "var(--radius)", padding: "0.875rem 1rem",
            boxShadow: "var(--shadow-sm)",
            transition: "all 0.25s ease",
          }}>
            <div style={{
              fontSize: "1.3rem", background: personFound ? "rgba(59,126,248,0.1)" : "var(--surface2)",
              borderRadius: 8, padding: "6px 7px",
            }}>🧍</div>
            <div>
              <div style={{ fontWeight: 700, color: personFound ? "#3b7ef8" : "var(--text-muted)", fontSize: "0.88rem" }}>
                {personFound ? "Person Detected" : "No Person"}
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "1px" }}>Step 1</div>
            </div>
          </div>

          {/* Helmet */}
          <div style={{
            flex: 1, minWidth: 140,
            display: "flex", alignItems: "center", gap: "0.7rem",
            background: !personFound
              ? "var(--surface)"
              : helmetFound ? "rgba(22,163,74,0.06)" : "rgba(220,38,38,0.05)",
            border: `1px solid ${!personFound ? "var(--border)" : helmetFound ? "rgba(22,163,74,0.3)" : "rgba(220,38,38,0.3)"}`,
            borderRadius: "var(--radius)", padding: "0.875rem 1rem",
            boxShadow: "var(--shadow-sm)",
            transition: "all 0.25s ease",
          }}>
            <div style={{
              fontSize: "1.3rem",
              background: !personFound ? "var(--surface2)" : helmetFound ? "rgba(22,163,74,0.1)" : "rgba(220,38,38,0.08)",
              borderRadius: 8, padding: "6px 7px",
            }}>🪖</div>
            <div>
              <div style={{
                fontWeight: 700, fontSize: "0.88rem",
                color: !personFound ? "var(--text-muted)" : helmetFound ? "var(--green)" : "var(--red)",
              }}>
                {!personFound ? "Waiting…" : helmetFound ? "Helmet On ✓" : "No Helmet ✗"}
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "1px" }}>Step 2</div>
            </div>
          </div>

          {/* Model connection */}
          <div style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: "var(--radius)", padding: "0.875rem 1rem",
            fontSize: "0.8rem", fontWeight: 600, boxShadow: "var(--shadow-sm)",
            color: fps > 0 ? "var(--green)" : "var(--text-muted)",
          }}>
            {fps > 0 ? <Wifi size={15} /> : <WifiOff size={15} />}
            {fps > 0 ? "Model active" : "Connecting…"}
          </div>
        </div>
      )}

      {/* ── Current detections chips ── */}
      {isRunning && latestFrame?.detections && latestFrame.detections.length > 0 && (
        <div style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: "var(--radius)", padding: "0.875rem 1rem",
          boxShadow: "var(--shadow-sm)",
        }}>
          <p style={{
            fontSize: "0.72rem", color: "var(--text-muted)",
            textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.6rem", fontWeight: 600,
          }}>
            Current detections
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {latestFrame.detections.map((d, i) => (
              <span key={i} style={{
                display: "inline-flex", alignItems: "center", gap: "0.35rem",
                background: "var(--surface2)", border: "1px solid var(--border)",
                borderRadius: 20, padding: "4px 12px", fontSize: "0.8rem", fontWeight: 600,
                color: color(d.label),
              }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: color(d.label) }} />
                {d.label} {(d.confidence * 100).toFixed(0)}%
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {cameraState === "error" && (
        <div style={{
          background: "var(--red-dim)", border: "1px solid var(--red-border)",
          borderRadius: "var(--radius)", padding: "1rem 1.25rem",
          color: "var(--red)", fontSize: "0.9rem", fontWeight: 600,
          boxShadow: "var(--shadow-sm)",
        }}>
          ⚠ {errorMsg}
        </div>
      )}

      <style>{`
        @keyframes livePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes alertPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.75; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
