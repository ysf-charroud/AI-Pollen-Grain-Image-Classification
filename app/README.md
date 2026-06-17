# Pollen Classifier — Web App

Image upload → prediction + confidence → user correction → samples stored in SQLite for the next retraining round.

## Stack
- **Backend**: FastAPI + TensorFlow 2.21 (serves the `model.keras` trained in `main-pollen.ipynb`)
- **Frontend**: React (Vite). Built to `app/frontend/dist/` and served as static files by FastAPI
- **Storage**: SQLite (`app/data/corrections.db`) + uploaded images in `app/data/uploads/`

## Run

### 1. Build the frontend

```powershell
cd app\frontend
npm install
npm run build
```

This produces `app/frontend/dist/`, which FastAPI serves at `/`.

### 2. Start the backend

```powershell
cd app\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python main.py
```

Then open <http://localhost:8000>.

The backend expects `model/model.keras`, `model/class_names.json`, and `model/metadata.json` at the repo root — they are already there.

### Frontend development

For live-reloading UI work, run the Vite dev server (proxies `/api` to the
backend on port 8000, so keep the backend running too):

```powershell
cd app\frontend
npm run dev
```

Then open <http://localhost:5173>. Run `npm run build` again before relying on
the FastAPI-served version at port 8000.

## API

| Method | Path                | Body / Params                          | Returns                       |
|--------|---------------------|----------------------------------------|-------------------------------|
| GET    | `/api/classes`      | —                                      | `string[]` — 21 species names |
| POST   | `/api/predict`      | `multipart/form-data` with `file=<img>` | top-5 + `sample_id` + image URL |
| POST   | `/api/correct`      | `{ sample_id, true_class, confirmed }` | `{ ok: true }`                |
| GET    | `/api/stats`        | —                                      | `[{ label, count }]`          |
| GET    | `/api/sample/{id}`  | —                                      | the original uploaded image   |

## Retraining

Every confirmed sample is stored with its true label. To rebuild a training set:

```sql
SELECT filename, true_class FROM samples WHERE confirmed = 1;
```

Copy the matching files from `app/data/uploads/` into per-class folders, merge with the original dataset, and rerun `main-pollen.ipynb`.
