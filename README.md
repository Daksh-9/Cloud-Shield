# Cloud Shield

A comprehensive cybersecurity monitoring and intrusion detection system with real-time monitoring, ML-based threat detection, and Suricata integration.

## Tech Stack

- **Frontend**: React + Vite
- **Backend**: Python + FastAPI
- **Database**: MongoDB
- **Security**: JWT authentication, secure password hashing
- **ML**: Python ML model (joblib)
- **IDS**: Suricata integration for deep packet inspection

## Project Structure

```
Cloud Shield/
├── backend/              # FastAPI backend
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py      # FastAPI application entry point
│   │   ├── config.py    # Configuration management
│   │   ├── database.py  # MongoDB connection
│   │   ├── models/      # Data models (User, Log, Alert, etc.)
│   │   ├── routers/     # API route modules (auth, logs, alerts)
│   │   ├── services/    # Business logic (user_service, log_service, alert_service)
│   │   ├── utils/       # Utilities (password, jwt, etc.)
│   │   └── middleware/  # Middleware (auth, etc.)
│   ├── requirements.txt
│   ├── run.py           # Development server
│   └── .env             # Environment variables (create from .env.example)
│
└── frontend/            # React frontend
    ├── src/
    │   ├── components/  # React components (Layout, etc.)
    │   ├── pages/       # Page components (Dashboard, Login, Register, Logs, Alerts)
    │   ├── services/    # API services (auth.js, logs.js, alerts.js)
    │   ├── App.jsx      # Main app component
    │   └── main.jsx     # Entry point
    ├── package.json
    └── vite.config.js
```

## Phase 1: Project Foundation ✅

This phase establishes the foundational structure:
- ✅ Backend and frontend folder structures
- ✅ FastAPI app with modular architecture
- ✅ React app with basic routing
- ✅ Environment-based configuration
- ✅ MongoDB connection layer
- ✅ Minimal setup for running the project

## Phase 2: Authentication ✅

This phase implements secure user authentication:
- ✅ User registration and login endpoints
- ✅ Secure password hashing with bcrypt
- ✅ JWT token issuance and validation
- ✅ Protected routes middleware
- ✅ User model in MongoDB
- ✅ Frontend authentication pages (Login, Register)
- ✅ Token-based authentication flow
- ✅ Protected dashboard route

## Phase 3: Logs & Alerts ✅

This phase implements log ingestion and alert management:
- ✅ Log ingestion endpoints with filtering
- ✅ MongoDB log storage with metadata support
- ✅ Alert model and alert creation
- ✅ Alert querying APIs with status updates
- ✅ Log and alert statistics endpoints
- ✅ Frontend logs page with filtering
- ✅ Frontend alerts page with status management
- ✅ Dashboard statistics overview

## Setup Instructions

### Prerequisites

- Python 3.9+
- Node.js 18+
- MongoDB (running locally or connection string)

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   ```

3. Activate the virtual environment:
   - Windows: `venv\Scripts\activate`
   - Linux/Mac: `source venv/bin/activate`

4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

5. Create `.env` file (copy from `.env.example` and update):
   ```bash
   # Copy .env.example to .env and update values
   MONGODB_URL=mongodb://localhost:27017
   MONGODB_DB_NAME=cloud_shield
   ```

6. Run the development server:
   ```bash
   python run.py
   ```

   The API will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file (optional, defaults are set):
   ```bash
   VITE_API_BASE_URL=http://localhost:8000
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

   The frontend will be available at `http://localhost:3000`

## API Endpoints

### Public Endpoints
- `GET /` - Root endpoint (health check)
- `GET /health` - Detailed health check
- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login and receive JWT token

### Protected Endpoints (require authentication)

#### Authentication
- `GET /auth/me` - Get current authenticated user information

#### Logs
- `POST /logs` - Ingest a new log entry
- `GET /logs` - Get list of logs (with optional filters: source, severity, log_type)
- `GET /logs/{log_id}` - Get a specific log by ID
- `GET /logs/stats/count` - Get log count statistics

#### Alerts
- `POST /alerts` - Create a new alert
- `GET /alerts` - Get list of alerts (with optional filters: status, severity, alert_type)
- `GET /alerts/{alert_id}` - Get a specific alert by ID
- `PATCH /alerts/{alert_id}` - Update alert status, notes, or assignment
- `GET /alerts/stats/count` - Get alert count statistics

## Architecture Decisions

### Backend Architecture

- **Modular Structure**: Separated into `app/` with clear modules (config, database, routers, models, services, utils, middleware)
- **Async MongoDB**: Using Motor (async MongoDB driver) for non-blocking database operations
- **Environment Configuration**: Pydantic Settings for type-safe configuration management
- **CORS Middleware**: Configured for frontend communication
- **Password Security**: Bcrypt for secure password hashing
- **JWT Authentication**: Token-based authentication with configurable expiration
- **Protected Routes**: Dependency injection for route protection

### Frontend Architecture

- **Vite**: Modern build tool for fast development and optimized production builds
- **React Router**: Client-side routing for SPA navigation
- **Component Structure**: Separated Layout, Pages, and Services
- **API Proxy**: Vite proxy configured for seamless API communication during development
- **Authentication Service**: Centralized auth logic with token management
- **Protected Routes**: Client-side route protection based on authentication state
- **Token Storage**: LocalStorage for JWT token persistence

## Next Steps: Phase 4 - Live Monitoring

The next phase will implement:
- Real-time or near-real-time data delivery
- Backend endpoints for live metrics
- Frontend dashboard consuming live data

## Development Notes

- Backend uses FastAPI's automatic OpenAPI documentation at `/docs`
- Frontend uses Vite's HMR for fast development
- MongoDB connection is tested on startup
- CORS is configured for local development

