import os
import cv2
import uuid
import shutil
import tempfile
import numpy as np
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from ultralytics import YOLO

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
OUTPUT_DIR = BASE_DIR / "outputs"
OUTPUT_DIR.mkdir(exist_ok=True)

app.mount("/outputs", StaticFiles(directory=str(OUTPUT_DIR)), name="outputs")

# ── load model once ────────────────────────────────────────────────────────────
if not MODEL_PATH.exists():
    raise RuntimeError(
        f"Model weights not found at {MODEL_PATH}. "
        "Place your best.pt file inside backend/weights/"
    )

model = YOLO(str(MODEL_PATH))
CLASS_NAMES = model.names          # {0: 'helmet', 1: 'motorcycle', 2: 'person'} (order may vary)
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
    """Draw bounding boxes on *frame* and return annotated frame + detection list."""
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
    out_name = f"{uuid.uuid4().hex}.jpg"
    out_path = OUTPUT_DIR / out_name
    cv2.imwrite(str(out_path), annotated)
    return out_name, detections


def process_video(src_path: str) -> tuple[str, list[dict]]:
    cap = cv2.VideoCapture(src_path)
    if not cap.isOpened():
        raise ValueError("Cannot open video file")

    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0

    out_name = f"{uuid.uuid4().hex}.mp4"
    out_path = OUTPUT_DIR / out_name
    writer = cv2.VideoWriter(str(out_path),
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

    cap.release()
    writer.release()
    return out_name, all_detections


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
        out_name, detections = process_image(tmp_path)
    except Exception as e:
        raise HTTPException(500, str(e))
    finally:
        os.unlink(tmp_path)

    helmet_detected = any(d["label"] == "helmet" for d in detections)
    return {
        "helmet_detected": helmet_detected,
        "detections": detections,
        "output_url": f"/outputs/{out_name}",
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
        out_name, detections = process_video(tmp_path)
    except Exception as e:
        raise HTTPException(500, str(e))
    finally:
        os.unlink(tmp_path)

    helmet_frames = len([d for d in detections if d["label"] == "helmet"])
    return {
        "helmet_detected": helmet_frames > 0,
        "helmet_frames": helmet_frames,
        "total_detections": len(detections),
        "detections": detections[:500],          # cap payload size
        "output_url": f"/outputs/{out_name}",
        "message": (f"Helmet detected in {helmet_frames} frames"
                    if helmet_frames else "No helmet detected in any frame"),
    }
