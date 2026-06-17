"""Pollen classifier API.

Endpoints:
  GET  /api/classes        — list of known species
  POST /api/predict        — upload image, returns top-k predictions + sample id
  POST /api/correct        — submit the true class for a sample (correction or confirmation)
  GET  /api/stats          — counts of confirmed samples per class (retraining dataset health)
  GET  /api/sample/{id}    — fetch a stored sample image (for review)
"""
from __future__ import annotations

import io
import json
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import List

import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image
from pydantic import BaseModel

from db import get_conn, init_db

# ── Paths ────────────────────────────────────────────────────────────────────
BACKEND_DIR  = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_DIR.parent.parent
MODEL_DIR    = PROJECT_ROOT / "model"
DATA_DIR     = PROJECT_ROOT / "app" / "data"
UPLOADS_DIR  = DATA_DIR / "uploads"
DB_PATH      = DATA_DIR / "corrections.db"
FRONTEND_DIR = PROJECT_ROOT / "app" / "frontend"

UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)
init_db(DB_PATH)

# ── Model loading (lazy) ─────────────────────────────────────────────────────
_model = None
_class_names: List[str] = json.loads((MODEL_DIR / "class_names.json").read_text())
_metadata = json.loads((MODEL_DIR / "metadata.json").read_text())
IMAGE_SIZE = tuple(_metadata["image_size"])


def get_model():
    global _model
    if _model is None:
        import tensorflow as tf
        _model = tf.keras.models.load_model(MODEL_DIR / "model.keras")
    return _model


# ── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(title="Pollen Classifier", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Schemas ──────────────────────────────────────────────────────────────────
class TopK(BaseModel):
    label: str
    confidence: float


class PredictResponse(BaseModel):
    sample_id: int
    predicted_class: str
    confidence: float
    top_k: List[TopK]
    image_url: str


class CorrectionRequest(BaseModel):
    sample_id: int
    true_class: str
    confirmed: bool  # True = correction matches prediction, False = user changed it


class StatsRow(BaseModel):
    label: str
    count: int


# ── Helpers ──────────────────────────────────────────────────────────────────
def preprocess(file_bytes: bytes) -> np.ndarray:
    img = Image.open(io.BytesIO(file_bytes)).convert("RGB").resize(IMAGE_SIZE)
    arr = np.asarray(img, dtype=np.float32)
    return np.expand_dims(arr, axis=0)


# ── Routes ───────────────────────────────────────────────────────────────────
@app.get("/api/classes", response_model=List[str])
def list_classes():
    return _class_names


@app.post("/api/predict", response_model=PredictResponse)
async def predict(file: UploadFile = File(...)):
    if file.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(status_code=400, detail="Unsupported image format.")

    raw = await file.read()
    try:
        x = preprocess(raw)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read image: {e}")

    model = get_model()
    probs = model.predict(x, verbose=0)[0]
    order = np.argsort(probs)[::-1]
    top_k = [
        {"label": _class_names[i], "confidence": float(probs[i])}
        for i in order[:5]
    ]
    predicted_class = top_k[0]["label"]
    confidence = top_k[0]["confidence"]

    ext = Path(file.filename or "upload.jpg").suffix.lower() or ".jpg"
    stored_name = f"{datetime.utcnow().strftime('%Y%m%dT%H%M%S')}_{uuid.uuid4().hex[:8]}{ext}"
    stored_path = UPLOADS_DIR / stored_name
    stored_path.write_bytes(raw)

    with get_conn(DB_PATH) as conn:
        cur = conn.execute(
            """INSERT INTO samples
               (filename, predicted_class, predicted_confidence, top_k_json)
               VALUES (?, ?, ?, ?)""",
            (stored_name, predicted_class, confidence, json.dumps(top_k)),
        )
        sample_id = cur.lastrowid

    return PredictResponse(
        sample_id=sample_id,
        predicted_class=predicted_class,
        confidence=confidence,
        top_k=[TopK(**t) for t in top_k],
        image_url=f"/api/sample/{sample_id}",
    )


@app.post("/api/correct")
def correct(req: CorrectionRequest):
    if req.true_class not in _class_names:
        raise HTTPException(status_code=400, detail=f"Unknown class '{req.true_class}'.")

    with get_conn(DB_PATH) as conn:
        row = conn.execute(
            "SELECT id FROM samples WHERE id = ?", (req.sample_id,)
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Sample not found.")

        conn.execute(
            """UPDATE samples
               SET true_class = ?, confirmed = 1, corrected_at = datetime('now')
               WHERE id = ?""",
            (req.true_class, req.sample_id),
        )

    return {"ok": True, "sample_id": req.sample_id, "true_class": req.true_class}


@app.get("/api/stats", response_model=List[StatsRow])
def stats():
    with get_conn(DB_PATH) as conn:
        rows = conn.execute(
            """SELECT true_class AS label, COUNT(*) AS count
               FROM samples
               WHERE confirmed = 1 AND true_class IS NOT NULL
               GROUP BY true_class
               ORDER BY count DESC"""
        ).fetchall()
    return [StatsRow(label=r["label"], count=r["count"]) for r in rows]


@app.get("/api/sample/{sample_id}")
def get_sample_image(sample_id: int):
    with get_conn(DB_PATH) as conn:
        row = conn.execute(
            "SELECT filename FROM samples WHERE id = ?", (sample_id,)
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Sample not found.")
    path = UPLOADS_DIR / row["filename"]
    if not path.exists():
        raise HTTPException(status_code=404, detail="Image file missing on disk.")
    return FileResponse(path)


# ── Static frontend ──────────────────────────────────────────────────────────
if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
