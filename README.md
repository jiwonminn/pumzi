# Pumzi

Pumzi is an offline-first pediatric clinic intake tool. The Next.js frontend
communicates with a local FastAPI backend for Swahili-to-English translation and
clinical-factor extraction.

## Requirements

- Node.js 20 or newer
- Python 3.13 or newer
- Several gigabytes of disk space for the local AI models

## Setup

Clone the repository and enter the project directory:

```bash
cd /Users/ammarfaisal/Desktop/pumzi
```

### 1. Install frontend dependencies

```bash
npm install
```

### 2. Create the Python environment

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

On later runs, activate the existing environment:

```bash
source .venv/bin/activate
```

### 3. Download the local models

Run this once:

```bash
python backend/setup_models.py
```

The setup script downloads:

- `facebook/nllb-200-distilled-600M` to
  `backend/models/huggingface/nllb-200-distilled-600M`
- `qwen2.5-1.5b-instruct-q4_k_m.gguf` to
  `backend/models/qwen`

The model files are ignored by Git and are not downloaded during normal
application runtime.

## Run the application

Start the backend in one terminal:

```bash
source .venv/bin/activate
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Verify the backend:

```bash
curl http://127.0.0.1:8000/health
```

Expected response:

```json
{"status":"ok"}
```

Start the frontend in a second terminal:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Test the workflow

For English, select **English** and enter:

```text
My child is two years old, has a fever, and cannot drink.
```

For Swahili, select **Swahili** and enter:

```text
Mtoto wangu ana miaka miwili. Ana homa na hawezi kunywa tangu jana.
```

The Swahili workflow runs locally as:

```text
Swahili → NLLB translation → English → clinical-factor extraction
```

The first request can take longer while the models load into memory. Later
requests reuse the loaded models.

## Offline behavior

After model setup completes, inference runs through the local FastAPI process.
The application does not use OpenAI, Ollama, or cloud inference APIs.

See [backend/README.md](backend/README.md) for backend-specific details.
