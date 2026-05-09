#  Helmet Detection System

A real-time helmet detection web app powered by a custom-trained **YOLOv8** model. Upload an image or video and the system draws bounding boxes around detected helmets, persons, and motorcycles — instantly telling you whether a helmet is present or not.

![Python](https://img.shields.io/badge/Python-3.10+-blue?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?logo=typescript&logoColor=white)
![YOLOv8](https://img.shields.io/badge/YOLOv8-Ultralytics-FF6F00)

---

## Demo

| Helmet Detected ✅ | No Helmet ❌ |
|---|---|
| Green bounding box drawn around helmet | Red alert — no helmet found in frame |

---

## ✨ Features

- 🖼️ **Image detection** — upload JPG, PNG, or WEBP and get an annotated result instantly
- 🎥 **Video detection** — upload MP4/MOV and every frame is processed; annotated video returned
- 🟢 **Clear verdict** — "Helmet detected" or "No helmet detected" shown prominently
- 📦 **Bounding boxes** — color-coded per class (helmet, person, motorcycle)
- 📊 **Detection table** — confidence scores and box coordinates for every detection
- ⬇️ **Download result** — save the annotated image or video directly from the UI

---

## 🧠 Model

- Architecture: **YOLOv8n** (nano — fast inference)
- Dataset: **Open Images V7** (via FiftyOne)
- Classes: `helmet` · `person` · `motorcycle`
- Training: 35 epochs · 640px · batch 32 · Google Colab GPU
- Weights file: `best.pt` *(not included in repo — see setup below)*

---

## 🗂️ Project Structure

```
helmet-detection/
├── backend/
│   ├── main.py              # FastAPI app — detection endpoints
│   ├── requirements.txt     # Python dependencies
│   └── weights/
│       └── best.pt          # ← place your model weights here
└── frontend/
    ├── src/
    │   ├── App.tsx
    │   ├── components/      # DropZone, ResultPanel, DetectionTable …
    │   ├── hooks/           # useDetection
    │   └── utils/           # API calls, TypeScript types
    ├── package.json
    └── vite.config.ts
```

---

## 🚀 Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- Your trained `best.pt` weights file

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check + loaded classes |
| `POST` | `/detect/image` | Upload image → annotated image + detections |
| `POST` | `/detect/video` | Upload video → annotated video + frame stats |



## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Model | YOLOv8n (Ultralytics) |
| Backend | FastAPI + Uvicorn |
| Image processing | OpenCV |
| Frontend | React 18 + TypeScript |
| Bundler | Vite |
| Icons | Lucide React |

---

## 📓 Training Notebook

The model was trained in Google Colab using:

- **FiftyOne** to download and prepare Open Images V7
- **YOLOv8n** fine-tuned for 35 epochs on helmet/person/motorcycle classes
- Export to YOLO format → trained with `ultralytics` trainer

See `notebook/final.ipynb` for the full training pipeline.

---

## 🤝 Contributing

Pull requests are welcome. For major changes, open an issue first to discuss what you'd like to change.

---

## 📄 License

MIT License — feel free to use, modify, and distribute.
