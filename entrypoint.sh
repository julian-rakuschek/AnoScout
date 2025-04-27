#!/bin/bash
set -e # Exit immediately upon error. Useful if the DB init fails, because in this case, the system is not usable and should not start

echo "Initializing database..."
poetry run python3 ./backend/initialize_database.py || echo "Database initialization failed, continuing anyway..."

echo "Starting server..."
exec poetry run gunicorn --timeout 10000 -w 4 -b 0.0.0.0:5000 backend.main:app
