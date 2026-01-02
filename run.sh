#!/bin/bash

# Curio Agent SDK Observability - Start Script
# This script starts both the Flask backend and React frontend

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Curio Agent SDK Observability${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Load environment variables if .env exists
if [ -f "$SCRIPT_DIR/.env" ]; then
    echo -e "${YELLOW}Loading environment from .env${NC}"
    export $(cat "$SCRIPT_DIR/.env" | grep -v '^#' | xargs)
fi

# Default ports
BACKEND_PORT=${OBSERVABILITY_PORT:-5050}
FRONTEND_PORT=${OBSERVABILITY_FRONTEND_PORT:-3001}

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down...${NC}"
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    exit 0
}

trap cleanup SIGINT SIGTERM

# Check if ports are available
if check_port $BACKEND_PORT; then
    echo -e "${RED}Error: Port $BACKEND_PORT is already in use${NC}"
    exit 1
fi

# Check if curio_agent_sdk is installed
echo -e "${YELLOW}Checking for Curio Agent SDK...${NC}"
if ! python -c "import curio_agent_sdk" 2>/dev/null; then
    echo -e "${RED}Error: Curio Agent SDK is not installed${NC}"
    echo -e "${YELLOW}Please install it first:${NC}"
    echo -e "  ${GREEN}pip install curio-agent-sdk${NC}"
    echo -e "  ${GREEN}or${NC}"
    echo -e "  ${GREEN}cd ../curio_agent_sdk && pip install -e .${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Curio Agent SDK found${NC}"

# Install backend dependencies
echo -e "${YELLOW}Installing backend dependencies...${NC}"
cd "$SCRIPT_DIR/backend"
pip install -r requirements.txt -q

# Install frontend dependencies
echo -e "${YELLOW}Installing frontend dependencies...${NC}"
cd "$SCRIPT_DIR/frontend"
if [ ! -d "node_modules" ]; then
    npm install --silent
fi

# Start backend
echo -e "${YELLOW}Starting backend on port $BACKEND_PORT...${NC}"
cd "$SCRIPT_DIR/backend"
python app.py &
BACKEND_PID=$!

# Wait for backend to start
sleep 2

# Check if backend started successfully
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${RED}Error: Backend failed to start${NC}"
    exit 1
fi

# Start frontend
echo -e "${YELLOW}Starting frontend on port $FRONTEND_PORT...${NC}"
cd "$SCRIPT_DIR/frontend"
PORT=$FRONTEND_PORT npm start &
FRONTEND_PID=$!

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Observability Dashboard Running!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "  Frontend: ${GREEN}http://localhost:$FRONTEND_PORT${NC}"
echo -e "  Backend:  ${GREEN}http://localhost:$BACKEND_PORT${NC}"
echo ""
echo -e "  Press Ctrl+C to stop"
echo ""

# Wait for both processes
wait
