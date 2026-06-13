import os
import gc
import cv2
import uuid
import base64
import shutil
import tempfile
import numpy as np
import torch
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from ultralytics import YOLO

# ── memory optimizations ───────────────────────────────────────────────────────
torch.set_num_threads(1)
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["OPENBLAS_NUM_THREADS"] = "1"

app = FastAPI(title="Helmet Detection API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── paths ──────────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).parent
MODEL_PATH = BASE_DIR / "weights" / "best.pt"

# ── load model once ────────────────────────────────────────────────────────────
if not MODEL_PATH.exists():
    raise RuntimeError(
        f"Model weights not found at {MODEL_PATH}. "
        "Place your best.pt file inside backend/weights/"
    )

model = YOLO(str(MODEL_PATH))
model.overrides['verbose'] = False
CLASS_NAMES = model.names
CONF_THRESHOLD = 0.35

# colour palette: helmet=green  person=blue  motorcycle=orange  default=red
CLASS_COLORS = {
    "helmet":     (0, 220, 80),
    "person":     (60, 120, 255),
    "motorcycle": (0, 165, 255),
}


def _color(label: str):
    return CLASS_COLORS.get(label.lower(), (0, 0, 255))


def draw_boxes(frame: np.ndarray, results) -> tuple[np.ndarray, list[dict]]:
    """Draw bounding boxes on frame and return annotated frame + detection list."""
    detections = []
    annotated = frame.copy()

    if results and results[0].boxes is not None:
        boxes = results[0].boxes
        for box in boxes:
            cls_id = int(box.cls[0])
            label = CLASS_NAMES[cls_id].lower()
            conf = float(box.conf[0])
            x1, y1, x2, y2 = map(int, box.xyxy[0])

            color = _color(label)
            cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)

            text = f"{label} {conf:.2f}"
            (tw, th), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
            cv2.rectangle(annotated, (x1, y1 - th - 8), (x1 + tw + 4, y1), color, -1)
            cv2.putText(annotated, text, (x1 + 2, y1 - 4),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

            detections.append({"label": label, "confidence": round(conf, 3),
                                "box": [x1, y1, x2, y2]})

    return annotated, detections


# ── helpers ────────────────────────────────────────────────────────────────────

def process_image(src_path: str) -> tuple[str, list[dict]]:
    frame = cv2.imread(src_path)
    if frame is None:
        raise ValueError("Cannot read image file")
    results = model(frame, conf=CONF_THRESHOLD)
    annotated, detections = draw_boxes(frame, results)

    # encode directly to base64 — no disk write needed
    _, buffer = cv2.imencode(".jpg", annotated)
    b64 = base64.b64encode(buffer).decode("utf-8")

    del results, frame, annotated, buffer
    gc.collect()
    return b64, detections


def process_video(src_path: str) -> tuple[str, list[dict]]:
    cap = cv2.VideoCapture(src_path)
    if not cap.isOpened():
        raise ValueError("Cannot open video file")

    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0

    # write to temp file
    tmp_out = tempfile.NamedTemporaryFile(suffix=".mp4", delete=False)
    tmp_out_path = tmp_out.name
    tmp_out.close()

    writer = cv2.VideoWriter(tmp_out_path,
                             cv2.VideoWriter_fourcc(*"mp4v"),
                             fps, (w, h))

    all_detections: list[dict] = []
    frame_idx = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        results = model(frame, conf=CONF_THRESHOLD)
        annotated, dets = draw_boxes(frame, results)
        writer.write(annotated)
        for d in dets:
            d["frame"] = frame_idx
            all_detections.append(d)
        frame_idx += 1
        del results, frame, annotated
        if frame_idx % 10 == 0:
            gc.collect()

    cap.release()
    writer.release()

    # encode video to base64
    with open(tmp_out_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode("utf-8")

    os.unlink(tmp_out_path)
    gc.collect()
    return b64, all_detections


# ── routes ─────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "model": str(MODEL_PATH), "classes": list(CLASS_NAMES.values())}


@app.post("/detect/image")
async def detect_image(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, "File must be an image")

    suffix = Path(file.filename).suffix or ".jpg"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        b64, detections = process_image(tmp_path)
    except Exception as e:
        raise HTTPException(500, str(e))
    finally:
        os.unlink(tmp_path)

    helmet_detected = any(d["label"] == "helmet" for d in detections)
    return {
        "helmet_detected": helmet_detected,
        "detections": detections,
        "output_image": f"data:image/jpeg;base64,{b64}",
        "message": "Helmet detected" if helmet_detected else "No helmet detected",
    }


@app.post("/detect/video")
async def detect_video(file: UploadFile = File(...)):
    if not file.content_type.startswith("video/"):
        raise HTTPException(400, "File must be a video")

    suffix = Path(file.filename).suffix or ".mp4"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        b64, detections = process_video(tmp_path)
    except Exception as e:
        raise HTTPException(500, str(e))
    finally:
        os.unlink(tmp_path)

    helmet_frames = len([d for d in detections if d["label"] == "helmet"])
    return {
        "helmet_detected": helmet_frames > 0,
        "helmet_frames": helmet_frames,
        "total_detections": len(detections),
        "detections": detections[:500],
        "output_image": f"data:video/mp4;base64,{b64}",
        "message": (f"Helmet detected in {helmet_frames} frames"
                    if helmet_frames else "No helmet detected in any frame"),
    }