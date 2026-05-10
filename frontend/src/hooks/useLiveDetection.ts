import { useRef, useState, useCallback, useEffect } from "react";

export interface LiveDetection {
  label: string;
  confidence: number;
  box: [number, number, number, number];
}

export interface LiveFrame {
  helmet_detected: boolean;
  message: string;
  detections: LiveDetection[];
  output_url: string;
}

type CameraState = "idle" | "starting" | "running" | "error";

const INTERVAL_MS = 300; // send a frame every 300ms (~3 fps inference)

export function useLiveDetection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const runningRef = useRef(false);

  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [latestFrame, setLatestFrame] = useState<LiveFrame | null>(null);
  const [fps, setFps] = useState(0);
  const fpsCountRef = useRef(0);

  // fps counter resets every second
  useEffect(() => {
    const timer = setInterval(() => {
      setFps(fpsCountRef.current);
      fpsCountRef.current = 0;
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const startCamera = useCallback(async (facingMode: "user" | "environment" = "user") => {
    setCameraState("starting");
    setErrorMsg("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraState("running");
      runningRef.current = true;

      // start inference loop
      intervalRef.current = setInterval(async () => {
        if (!runningRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState < 2) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(video, 0, 0);

        canvas.toBlob(async (blob) => {
          if (!blob || !runningRef.current) return;
          const fd = new FormData();
          fd.append("file", blob, "frame.jpg");
          try {
            const res = await fetch("/detect/image", { method: "POST", body: fd });
            if (res.ok) {
              const data: LiveFrame = await res.json();
              setLatestFrame(data);
              fpsCountRef.current += 1;
            }
          } catch {
            // network blip — skip frame silently
          }
        }, "image/jpeg", 0.7);
      }, INTERVAL_MS);

    } catch (e) {
      const msg = (e as Error).message;
      setErrorMsg(
        msg.includes("Permission")
          ? "Camera permission denied. Please allow camera access and try again."
          : `Could not start camera: ${msg}`
      );
      setCameraState("error");
    }
  }, []);

  const stopCamera = useCallback(() => {
    runningRef.current = false;
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setLatestFrame(null);
    setCameraState("idle");
    setFps(0);
  }, []);

  // cleanup on unmount
  useEffect(() => () => stopCamera(), [stopCamera]);

  return { videoRef, canvasRef, cameraState, errorMsg, latestFrame, fps, startCamera, stopCamera };
}
