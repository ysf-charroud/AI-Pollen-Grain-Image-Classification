# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

A pollen grain image classifier with a human-in-the-loop correction loop. Users upload microscope images, the model returns top-5 species predictions, and users can confirm or correct the label. Every confirmed sample is stored in SQLite for use in the next retraining round.

The model (`model/model.keras`) is a MobileNetV2-based TensorFlow 2.21 classifier trained in `main-pollen.ipynb` on 21 species. It is **not** retrained by the web app — the app only collects corrections.

## Development commands

### Backend (FastAPI)

```powershell
cd app\backend
.\.venv\Scripts\Activate.ps1          # activate the existing venv
python -m uvicorn main:app --reload   # dev server on :8000
python main.py                         # production-style (no reload)
```

Installing deps into the existing venv:
```powershell
pip install -r requirements.txt
```

### Frontend (React + Vite)

```powershell
cd app\frontend
npm install        # first time only
npm run dev        # dev server on :5173 with HMR (proxies /api → :8000)
npm run build      # build to app/frontend/dist/ (served by FastAPI at /)
npm run preview    # preview the production build locally
```

**For frontend dev work**, keep both servers running: the Vite dev server (`:5173`) proxies `/api` requests to the FastAPI backend (`:8000`). After editing `vite.config.js`, restart the Vite server.

## Architecture

```
repo root
├── model/                  # ML artifacts (committed)
│   ├── model.keras         # TF 2.21 SavedModel (MobileNetV2-based, 21 classes)
│   ├── class_names.json    # ordered list of 21 species names
│   └── metadata.json       # image_size [224,224], preprocessing note
├── main-pollen.ipynb       # training notebook (Google Colab)
└── app/
    ├── backend/
    │   ├── main.py         # FastAPI app — all routes, model loading, image preprocessing
    │   ├── db.py           # SQLite schema + get_conn context manager
    │   ├── requirements.txt
    │   └── .venv/          # Python virtualenv (do not commit)
    ├── frontend/
    │   ├── src/
    │   │   ├── api.js              # all fetch calls (getClasses, predict, submitCorrection, getStats)
    │   │   ├── App.jsx             # root — owns classes[] and stats state, wires onSaved refresh
    │   │   └── components/
    │   │       ├── Predictor.jsx   # upload → predict → confirm/correct flow
    │   │       ├── Dataset.jsx     # stats table (confirmed samples per class)
    │   │       ├── Dropzone.jsx    # drag-and-drop file input
    │   │       └── ConfidenceBars.jsx  # top-5 probability bars
    │   ├── vite.config.js  # proxy /api → :8000
    │   └── dist/           # build output (gitignored); FastAPI serves this in production
    └── data/               # runtime data (gitignored)
        ├── corrections.db  # SQLite
        └── uploads/        # stored uploaded images, named <timestamp>_<uuid>.<ext>
```

## Key behaviours to know

**Model loading is lazy**: `get_model()` in `main.py` imports TensorFlow and loads the `.keras` file only on the first `/api/predict` call. Cold start takes several seconds.

**Prediction flow**: image → PIL resize to 224×224 → numpy array → model inference → top-5 sorted by probability → stored image file + SQLite row → returns `sample_id` + `image_url`.

**Correction flow**: `POST /api/correct` sets `true_class` and `confirmed=1` on the `samples` row. The `confirmed` flag distinguishes "user agreed with prediction" from "user changed it" — both are stored.

**Production vs dev serving**: In production FastAPI serves the built `dist/` at `/`. In dev, Vite's proxy handles `/api` and serves its own HMR bundle. The `api.js` base URL is always `""` (same-origin) so it works in both modes without config changes.

**Retraining query**:
```sql
SELECT filename, true_class FROM samples WHERE confirmed = 1;
```
Copy matching files from `app/data/uploads/` into per-class folders, merge with the original dataset, and re-run `main-pollen.ipynb`.
