#!/usr/bin/env bash
set -e

echo "================================"
echo "  FlappyDash - Starting Up..."
echo "================================"
echo ""

# Install backend dependencies
echo "[1/4] Installing backend dependencies..."
cd backend
pip install -r requirements.txt -q
cd ..

# Install frontend dependencies
echo "[2/4] Installing frontend dependencies..."
cd frontend
npm install --silent
cd ..

# Start backend
echo "[3/4] Starting backend on http://localhost:8000..."
cd backend
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
cd ..

# Start frontend
echo "[4/4] Starting frontend on http://localhost:5173..."
cd frontend
npm run dev -- --host 0.0.0.0 &
FRONTEND_PID=$!
cd ..

echo ""
echo "================================"
echo "  FlappyDash is running!"
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:8000"
echo "  API docs: http://localhost:8000/docs"
echo "================================"
echo ""
echo "Press Ctrl+C to stop both servers."

# Trap Ctrl+C to kill both processes
trap "echo ''; echo 'Shutting down...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM

# Wait for both processes
wait
