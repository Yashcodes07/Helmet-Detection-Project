# Helmet Detection – Backend

## Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Add your model weights

Place your trained `best.pt` file here:

```
backend/
└── weights/
    └── best.pt        ← your YOLOv8 weights
```

## Run

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

API docs: http://localhost:8000/docs

## Endpoints

| Method | Path             | Description                     |
|--------|------------------|---------------------------------|
| GET    | /health          | Health check + loaded classes   |
| POST   | /detect/image    | Upload image → annotated image  |
| POST   | /detect/video    | Upload video → annotated video  |

Output files are served at `/outputs/<filename>`.
