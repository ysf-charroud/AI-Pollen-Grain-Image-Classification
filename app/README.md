# Pollen Classifier — Web App

Image upload → prediction + confidence → user correction → samples stored in SQLite for the next retraining round.

## Stack
- **Backend**: FastAPI + TensorFlow 2.21 (serves the `model.keras` trained in `main-pollen.ipynb`)
- **Frontend**: vanilla HTML/CSS/JS, served as static files by FastAPI
- **Storage**: SQLite (`app/data/corrections.db`) + uploaded images in `app/data/uploads/`

## Run

```powershell
cd app\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python main.py
```

Then open <http://localhost:8000>.

The backend expects `model/model.keras`, `model/class_names.json`, and `model/metadata.json` at the repo root — they are already there.

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
