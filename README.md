# 🏏 IPL Analytics

A full-stack IPL match analytics and win-prediction app built for the 2025 season.

[![Frontend](https://img.shields.io/badge/Frontend-Live-brightgreen?style=flat-square&logo=vercel)](https://ipl-analytics-mocha.vercel.app)
[![Backend](https://img.shields.io/badge/Backend-Live-brightgreen?style=flat-square&logo=fastapi)](https://ipl-analytics-nhhl.onrender.com/health)
[![Uptime](https://img.shields.io/badge/Uptime-Status-blue?style=flat-square)](https://stats.uptimerobot.com/PNoRVj7bPi)

**Live App →** https://ipl-analytics-mocha.vercel.app

---

## Features

- **Win Probability Predictor** — XGBoost model trained on IPL data from 2008–2024, predicts match winner given teams, venue and toss
- **Team & Season Stats** — head-to-head records, venue win rates, season-by-season breakdowns
- **Nightly Data Refresh** — GitHub Actions workflow syncs latest match results every night at 1:00 AM IST
- **Real-time Uptime** — monitored 24/7 via UptimeRobot

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Angular 17, TypeScript, Chart.js |
| Backend | FastAPI (Python 3.11), XGBoost, scikit-learn |
| Database | Supabase (PostgreSQL) |
| Hosting | Vercel (frontend) + Render (backend) |
| CI/CD | GitHub Actions |

---

## Architecture

```
Browser
  │
  ▼
Vercel (Angular SPA)
  │  HTTPS API calls
  ▼
Render (FastAPI + XGBoost model)
  │  Supabase client
  ▼
Supabase (PostgreSQL)
  ▲
  │  Nightly refresh
GitHub Actions (cron 7:30 PM UTC)
```

---

## Local Development

### Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env   # fill in SUPABASE_URL and SUPABASE_SERVICE_KEY
uvicorn app.main:app --reload
# API running at http://localhost:8000
```

### Frontend
```bash
cd frontend
npm install --legacy-peer-deps
ng serve
# App running at http://localhost:4200
```

---

## ML Model

- **Algorithm**: XGBoost classifier with probability calibration (Platt scaling)
- **Features**: 28 engineered features including team win rates, H2H records, venue stats, toss advantage, player strike rates and bowling economy
- **Validation**: GroupKFold cross-validation (grouped by season to prevent data leakage)
- **Retraining**: Run `python scripts/train_model.py` after new season data is ingested

---

## Status

| Service | URL |
|---------|-----|
| Frontend | https://ipl-analytics-mocha.vercel.app |
| Backend API | https://ipl-analytics-nhhl.onrender.com |
| Health Check | https://ipl-analytics-nhhl.onrender.com/health |
| Uptime Monitor | https://stats.uptimerobot.com/PNoRVj7bPi |
