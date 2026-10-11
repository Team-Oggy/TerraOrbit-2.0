# TerraOrbit - Precision Agriculture & Multispectral Telemetry Platform

TerraOrbit is an intelligent precision agriculture platform providing hyper-local micro-weather forecasting, multispectral satellite vegetation analysis (NDVI), soil telemetry, 7-day adaptive action plans, and automated agronomy field reports.

## Architecture

- **Frontend**: React 18, Vite, Tailwind CSS, Recharts, Lucide / Material Symbols, Custom CSS motion layer (`src/motion/`).
- **Backend**: FastAPI (Python 3.10+), SQLAlchemy, SQLite (Demo Mode) / PostgreSQL (Production), Open-Meteo API integration.

## Quick Start

### 1. Backend Setup
```bash
cd backend
python -m venv .venv
# Windows:
.\.venv\Scripts\activate
# Mac/Linux:
source .venv/bin/activate

pip install -r requirements.txt
python seed.py
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

## Deployment
- **Frontend**: Deployable on Vercel, Netlify, or Cloudflare Pages.
- **Backend**: Deployable on Render, Railway, AWS, or Vercel Serverless.
