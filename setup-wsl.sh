#!/bin/bash
# Setup runtimes and dependencies for Hello World app in WSL

set -e
cd "$(dirname "$0")"

echo "=== Installing Node.js and npm ==="
sudo apt-get install -y nodejs npm

echo ""
echo "=== Installing Python backend dependencies ==="
cd backend
python3 -m pip install --user -r requirements.txt
cd ..

echo ""
echo "=== Installing frontend dependencies ==="
cd frontend
npm install
cd ..

echo ""
echo "Setup complete."
echo ""
echo "To run the app:"
echo "  Terminal 1:  cd backend && python3 -m uvicorn main:app --reload --port 8000"
echo "  Terminal 2:  cd frontend && npm run dev"
echo "  Then open http://localhost:5173 in your browser"
