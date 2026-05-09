# Helmet Detection App

Full-stack app using your YOLOv8 model to detect helmets (and persons / motorcycles) in images and videos.

```
helmet-detection/
├── backend/
│   ├── main.py              ← FastAPI app
│   ├── requirements.txt
│   ├── weights/
│   │   └── best.pt          ← ⚠️ place your weights here
│   └── outputs/             ← auto-created; annotated results saved here
└── frontend/
    ├── src/
    │   ├── App.tsx
    │   ├── components/
    │   ├── hooks/
    │   └── utils/
    ├── package.json
    └── vite.config.ts
```

---

## 1 — Add your model weights

Copy your trained `best.pt` into:

```
backend/weights/best.pt
```

---

## 2 — Start the backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

API will be live at **http://localhost:8000**  
Interactive docs: **http://localhost:8000/docs**

---

## 3 — Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**

---

## API reference

### `POST /detect/image`

Upload an image (JPG / PNG / WEBP). Returns:

```json
{
  "helmet_detected": true,
  "message": "Helmet detected",
  "output_url": "/outputs/<filename>.jpg",
  "detections": [
    { "label": "helmet", "confidence": 0.87, "box": [x1, y1, x2, y2] }
  ]
}
```

### `POST /detect/video`

Upload a video (MP4 / WEBM / MOV). Returns:

```json
{
  "helmet_detected": true,
  "helmet_frames": 42,
  "total_detections": 150,
  "message": "Helmet detected in 42 frames",
  "output_url": "/outputs/<filename>.mp4",
  "detections": [ ... ]
}
```

---

## Production deployment

**Backend** — swap `uvicorn main:app` with gunicorn:

```bash
pip install gunicorn
gunicorn main:app -w 2 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000
```

**Frontend** — build and serve static files:

```bash
npm run build          # outputs to frontend/dist/
```

Point your reverse proxy (nginx / caddy) to serve `dist/` and proxy `/detect`, `/outputs`, `/health` to port 8000.
