## Radiology Speech-to-Text Backend

This backend consists of two services sharing a MongoDB database:

- **Django API service (port 8000)**: authentication, RBAC, reports, complaints, CSV export.
- **FastAPI AI service (port 8001)**: audio transcription, WebSocket, mobile upload, QR code sessions.

### Project structure

- `backend/django/` – Django REST API
- `backend/fastapi/` – FastAPI AI and real-time service
- `backend/requirements.txt` – Python dependencies for both services

### Prerequisites

- Python 3.10+
- MongoDB running locally on `mongodb://localhost:27017`

### Install dependencies

```bash
cd backend
pip install -r requirements.txt
```

### Run Django service (port 8000)

```bash
cd backend/django
python manage.py migrate  # no-op for Mongo-backed models, but keeps Django happy
python manage.py runserver 0.0.0.0:8000
```

### Run FastAPI service (port 8001)

```bash
cd backend/fastapi
uvicorn main:app --reload --host 0.0.0.0 --port 8001
```

### Environment configuration

Both services rely on these environment variables (with safe defaults in code):

- `MONGODB_URI` (default: `mongodb://localhost:27017`)
- `MONGODB_DB_NAME` (default: `radiology_platform`)
- `JWT_SECRET_KEY` (default: development-only fallback)
- `JWT_ACCESS_TOKEN_LIFETIME_MIN` (default: `15`)
- `JWT_REFRESH_TOKEN_LIFETIME_DAYS` (default: `7`)
  cd backend
  python -m venv venv
  source venv/bin/activate # Linux / Mac
  venv\Scripts\activate # Windows
