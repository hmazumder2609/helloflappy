# Hello World Full-Stack App

A simple Hello World application with a Python FastAPI backend and React frontend, demonstrating a full-stack connection.

## Architecture

- **Backend**: FastAPI (Python) running on `http://localhost:8000`
- **Frontend**: Vite + React running on `http://localhost:5173`
- **Connection**: REST API with CORS enabled, proxied through Vite in development

## Prerequisites

Before running this application, ensure you have the following runtimes installed:

### Node.js
- **Required**: Node.js 18+ (LTS recommended)
- **Check installation**: `node --version`
- **Download**: [nodejs.org](https://nodejs.org/) if not installed

### Python
- **Required**: Python 3.9 or higher
- **Check installation**: `python --version` or `python3 --version`
- **Download**: [python.org](https://www.python.org/downloads/) if not installed

## Setup

### 1. Install Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Install Frontend Dependencies

```bash
cd frontend
npm install
```

## Running the Application

You'll need two terminal windows:

### Terminal 1: Start the Backend

```bash
cd backend
uvicorn main:app --reload --port 8000
```

The backend will be available at `http://localhost:8000`
- API endpoint: `http://localhost:8000/api/hello`
- API docs: `http://localhost:8000/docs` (FastAPI automatic documentation)

### Terminal 2: Start the Frontend

```bash
cd frontend
npm run dev
```

The frontend will be available at `http://localhost:5173` (or the port shown in the terminal)

Open your browser and navigate to the frontend URL to see the Hello World message fetched from the Python backend.

## Project Structure

```
helloworld/
├── backend/
│   ├── main.py              # FastAPI application
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Main React component
│   │   ├── App.css          # Elegant styling
│   │   ├── main.jsx         # React entry point
│   │   └── index.css        # Global styles
│   ├── public/              # Static assets
│   ├── vite.config.js       # Vite configuration with proxy
│   ├── package.json         # Node.js dependencies
│   └── index.html           # HTML template
└── README.md                # This file
```

## Configuration

### Changing Backend Port

If you need to run the backend on a different port:

1. Update the backend command: `uvicorn main:app --reload --port <NEW_PORT>`
2. Update `frontend/vite.config.js` proxy target to match: `target: 'http://localhost:<NEW_PORT>'`

### Environment Variables (Optional)

For production deployments, you can configure the API base URL using environment variables:
- Create a `.env` file in the `frontend/` directory
- Add: `VITE_API_BASE_URL=http://your-backend-url`

## Development

- Backend auto-reloads on file changes (via `--reload` flag)
- Frontend has Hot Module Replacement (HMR) for instant updates
- CORS is configured to allow requests from the frontend origin

## License

MIT
