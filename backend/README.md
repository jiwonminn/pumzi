# Local AI backend

This FastAPI service runs translation and clinical-factor extraction on the clinic
computer. Models are loaded once and reused; no inference request is sent to a
cloud service.

## Setup

### macOS/Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

### Windows PowerShell

```powershell
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r backend\requirements.txt
```

If PowerShell blocks activation scripts:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Download both models once before running offline:

```bash
python backend/setup_models.py
```

On Windows PowerShell, use:

```powershell
python backend\setup_models.py
```

The script creates the model directories, skips files that already exist, and
downloads:

- `facebook/nllb-200-distilled-600M` to
  `backend/models/huggingface/nllb-200-distilled-600M`
- `qwen2.5-1.5b-instruct-q4_k_m.gguf` to `backend/models/qwen`

Models are ignored by Git and are never downloaded during normal application
runtime. Runtime loading uses local files only.

## Run

### macOS/Linux

```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

### Windows PowerShell

```powershell
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Check the service:

```bash
curl http://127.0.0.1:8000/health
```

The frontend runs separately with:

```bash
npm install
npm run dev
```
