# B_Inquery — Backend

A **Django REST Framework** API that serves an ML-powered **MAO activity prediction** pipeline. It accepts a CSV file of chemical compounds (as SMILES strings), computes molecular descriptors using RDKit, and runs inference via an ONNX-exported Random Forest model to classify each molecule as **Active** or **Not Active**.

---

## 🚀 Tech Stack

| Technology | Purpose |
|---|---|
| [Django 6](https://www.djangoproject.com/) | Web framework |
| [Django REST Framework](https://www.django-rest-framework.org/) | API layer |
| [ONNX Runtime](https://onnxruntime.ai/) | ML model inference |
| [RDKit](https://www.rdkit.org/) | Molecular descriptor calculation |
| [pandas / numpy](https://pandas.pydata.org/) | Data processing |
| [django-cors-headers](https://github.com/adamchainz/django-cors-headers) | Cross-origin request handling |
| [python-dotenv](https://pypi.org/project/python-dotenv/) | Environment variable management |

---

## ✨ Features

- 🧪 **SMILES Auto-Detection** — Automatically detects the SMILES column in uploaded CSVs using name heuristics and RDKit validation
- 🤖 **ONNX Inference** — Loads and caches the ML model at startup for fast, low-latency predictions (no repeated disk I/O)
- 🛡️ **File Validation** — Strict input validation: `.csv` only, max **1 MB**, max **3 columns**, max **300 molecules**
- 📊 **Confidence Scores** — Returns prediction labels (`Active` / `Not Active`) and a confidence score per molecule
- 🔒 **Secret Management** — Django secret key and debug flag loaded from `.env` file, never hardcoded

---

## 📁 Project Structure

```
Backend/
├── core/
│   ├── settings.py       # Django settings (reads from .env)
│   ├── urls.py           # Root URL configuration
│   └── wsgi.py
├── prediction_api/
│   ├── views.py          # API endpoint logic (POST /predict/)
│   ├── service.py        # PredictionJob — ML pipeline & SMILES parsing
│   ├── serialize.py      # FileBouncer — file validation & sanitization
│   └── urls.py           # App-level URL routing
├── onxx_models/
│   ├── mao_prediction_pipeline.onnx   # Trained ONNX model (gitignored)
│   └── significant_desc_names.json    # Descriptor feature list
├── manage.py
├── requirements.txt
└── .env                  # Secret config (gitignored — never commit!)
```

**Request**
- Content-Type: `multipart/form-data`
- Body: `file` — a `.csv` file

**CSV Format Rules**
| Rule | Limit |
|---|---|
| File type | `.csv` only |
| Max file size | 1 MB |
| Max columns | 3 (e.g. `ID`, `SMILES`) |
| Max molecules | 300 rows |
| Encoding | UTF-8 |

**Example CSV**
```csv
mol_id,SMILES
ZINC001,CCO
ZINC002,c1ccccc1
```

**Response `200 OK`**
```json
[
  {
    "SMILES": "CCO",
    "ID": "ZINC001",
    "Predicted_Activity": "Active",
    "Confidence": 0.84
  },
  {
    "SMILES": "c1ccccc1",
    "ID": "ZINC002",
    "Predicted_Activity": "Not Active",
    "Confidence": 0.31
  }
]
```

**Error Responses**
| Status | Reason |
|---|---|
| `400` | Invalid file type, too large, too many columns/rows, no valid SMILES found |
| `500` | Unexpected server error during inference |

---

## 🔐 Environment Variables

| Variable | Description | Default |
|---|---|---|
| `Django_key` | Django secret key | Fallback insecure key (dev only) |
| `Dbug` | Enable debug mode (`True`/`False`) | `True` |

---

## 📝 Notes

- The ONNX model (`mao_prediction_pipeline.onnx`) is **gitignored** due to its size. You will need to place it manually in the `onxx_models/` folder.
- CORS is currently open (`CORS_ALLOW_ALL_ORIGINS = True`) for local development. Restrict this before deploying to production.
- The ML model uses a **Random Forest Classifier** converted to ONNX format via `skl2onnx`.

---

## 🔗 Frontend

This backend will serve the B_Inquery Frontend — a 3D React Three Fiber web experience.
