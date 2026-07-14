#!/bin/bash
# Stop local dev server running on port 8080 (Linux/macOS)
echo "Stopping server on port 8080..."
fuser -k 8080/tcp 2>/dev/null || pkill -f "http.server 8080" 2>/dev/null
echo "Server stopped."
