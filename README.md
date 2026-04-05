# NeuroInsight — Real-Time EEG Cognitive Analytics Platform

[![Vite](https://img.shields.io/badge/Frontend-React%2018-cyan)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/ML%20Service-FastAPI-green)](https://fastapi.tiangolo.com/)
[![Express](https://img.shields.io/badge/Backend-Node.js-white)](https://expressjs.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**NeuroInsight** is a production-grade Brain-Computer Interface (BCI) platform designed for real-time cognitive state monitoring and explainable AI (XAI) research. By transforming raw EEG microvolts into structured cognitive insights, it bridges the gap between neural data and actionable intelligence.

---

## 🚀 Live Demo

- **Frontend**: [neuroinsight-v2.vercel.app](https://neuroinsight-v2.vercel.app)
- **API Backend**: [neuroinsight-backend.onrender.com](https://neuroinsight-backend.onrender.com/health)
- **ML Service**: [neuroinsight-ml.onrender.com](https://neuroinsight-ml.onrender.com/health)

---

## ✨ Key Features

- **Real-Time Streaming Pipeline (SSE)**: Zero-buffer, non-blocking telemetry from ML inference to the browser.
- **Cognitive Metrics Engine**: Proprietary DSP (Digital Signal Processing) layer calculating Attention, Stress, Relaxation, and Engagement at 400ms frequencies.
- **Explainable AI (SHAP)**: Real-time visualization of feature importance, showing *why* a specific brain state was predicted.
- **Session History & Analytics**: Deep-dive historical archive with local persistence and high-resolution trending.
- **Automated Research Reports**: 1-click generation of professional 3-page PDF brain reports with clinical observations.
- **Research Showcase**: Integrated project landing page for academic and symposium presentations.

---

## 🏗️ Architecture

NeuroInsight utilizes a three-tier microservices architecture:

1.  **Frontend (React + Vite)**: High-performance SPA with Framer Motion animations and Recharts visualizations.
2.  **API Gateway (Express.js)**: Acts as a security layer and low-latency SSE proxy to the ML cluster.
3.  **ML Service (FastAPI)**: Python-based inference engine utilizing Scikit-learn for predictions and SHAP for explainability.

---

## 🛠️ Tech Stack

### Frontend
- React 18, Vite, TailwindCSS
- Framer Motion (Animations)
- Recharts (Visualizations)
- jsPDF & html2canvas (Reporting)

### Backend
- Node.js, Express.js
- MongoDB Atlas (Authentication & Users)
- JWT Security
- SSE (Server-Sent Events)

### ML Service
- Python 3.10, FastAPI
- Scikit-learn (RandomForest Classifier)
- SHAP (Explainability)
- NumPy, Pandas (DSP)

---

## 💻 Local Setup

### 1. Clone the Repository
```bash
git clone https://github.com/neeraj-gupta-dev/NeuroInsight.git
cd NeuroInsight
```

### 2. Configure Environment Variables
Each service requires a `.env` file. Refer to the `.env.example` in each directory:
- `backend/.env.example`
- `frontend/.env.example`
- `ml_service/.env.example`

### 3. Run Services

**ML Service (Python)**
```bash
cd ml_service
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Backend (Node.js)**
```bash
cd backend
npm install
npm run dev
```

**Frontend (React)**
```bash
cd frontend
npm install
npm run dev
```

---

## 📜 Future Scope

- **Hardware Integration**: Support for OpenBCI and Emotiv direct socket streaming.
- **Advanced XAI**: Integrated LIME and Integrated Gradients for deeper neural transparency.
- **Multi-User Sessions**: Real-time collaborative brain monitoring for educational environments.

---

## ⚖️ License

Distributed under the MIT License. See `LICENSE` for more information.

Built for **Academic Research & Symposium Presentation** • 2026
