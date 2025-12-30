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
│   │   └── routers/      # API route modules
│   ├── requirements.txt
│   ├── run.py           # Development server
│   └── .env             # Environment variables (create from .env.example)
│
└── frontend/            # React frontend
    ├── src/
    │   ├── components/  # React components
    │   ├── pages/       # Page components
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

- `GET /` - Root endpoint (health check)
- `GET /health` - Detailed health check

## Architecture Decisions

### Backend Architecture

- **Modular Structure**: Separated into `app/` with clear modules (config, database, routers)
- **Async MongoDB**: Using Motor (async MongoDB driver) for non-blocking database operations
- **Environment Configuration**: Pydantic Settings for type-safe configuration management
- **CORS Middleware**: Configured for frontend communication

### Frontend Architecture

- **Vite**: Modern build tool for fast development and optimized production builds
- **React Router**: Client-side routing for SPA navigation
- **Component Structure**: Separated Layout, Pages, and future Components
- **API Proxy**: Vite proxy configured for seamless API communication during development

## Next Steps: Phase 2 - Authentication

The next phase will implement:
- User registration and login endpoints
- Secure password hashing (bcrypt)
- JWT token issuance and validation
- Protected routes middleware
- User model in MongoDB

## Development Notes

- Backend uses FastAPI's automatic OpenAPI documentation at `/docs`
- Frontend uses Vite's HMR for fast development
- MongoDB connection is tested on startup
- CORS is configured for local development

