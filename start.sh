#!/bin/sh
set -e

echo "Starting Smart Pharmacy Management System (SPMS)..."
python3 backend/seed_data.py

PORT="${PORT:-8000}"
echo "Launching FastAPI server on port $PORT..."
exec uvicorn backend.app.main:app --host 0.0.0.0 --port "$PORT"
