import type { ImageResult, VideoResult } from "./types";

const BASE = "";   // proxied by Vite dev server; in prod set VITE_API_URL

export async function detectImage(file: File): Promise<ImageResult> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${BASE}/detect/image`, { method: "POST", body: fd });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Detection failed");
  }
  return res.json();
}

export async function detectVideo(file: File): Promise<VideoResult> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${BASE}/detect/video`, { method: "POST", body: fd });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Detection failed");
  }
  return res.json();
}
