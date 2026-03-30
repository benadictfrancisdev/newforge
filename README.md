# Data Alchemy Studio — NewForge

Full-stack data analytics platform with a custom AI engine (Llama 3.1 70B).
Built on React + FastAPI. No Gemini, no GPT, no vendor lock-in.

## Architecture

```
newforge/
├── src/                  # React frontend (Vite + TypeScript)
│   └── services/api.ts   # ← Single connection point to backend
├── backend/              # Custom FastAPI + AI backend
│   ├── main.py           # 11 API routes
│   ├── core/ai_engine.py # Llama 3.1 70B via Groq
│   └── services/         # EDA, ML, AI, Forecasting
└── README.md
```

## Quick Start

### 1. Backend
```bash
cd backend
cp .env.example .env
# Add GROQ_API_KEY from https://console.groq.com (free)

pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Frontend
```bash
cp .env.example .env
# Set VITE_API_URL=http://localhost:8000

npm install
npm run dev
# → http://localhost:8080
```

## API Endpoints

| Endpoint | Description |
|---|---|
| GET  `/api/health` | System health |
| POST `/api/analyze/eda` | Exploratory Data Analysis |
| POST `/api/analyze/correlations` | Correlation matrix |
| POST `/api/ml/predict` | Random Forest prediction |
| POST `/api/ml/cluster` | K-means / DBSCAN clustering |
| POST `/api/ml/anomaly` | Isolation Forest anomaly detection |
| POST `/api/ai/insights` | AI-powered dataset insights |
| POST `/api/ai/query` | Natural language Q&A |
| POST `/api/ai/explain` | Explain ML results in plain English |
| POST `/api/ai/recommendations` | Analysis recommendations |
| POST `/api/forecast/single` | Single column forecasting |
| POST `/api/forecast/multi` | Multi-column forecasting |

## Deploy to Railway

```bash
# Backend
cd backend
railway up

# Set environment variable:
# GROQ_API_KEY = your_groq_key

# Frontend (Vercel)
# Set VITE_API_URL = https://your-backend.railway.app
```

## AI Engine

Uses **Llama 3.1 70B** via Groq API (free, 6000 req/min).
Swap to any provider by editing `backend/core/ai_engine.py`.
