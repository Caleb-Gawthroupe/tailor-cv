#!/bin/bash

echo "Stopping all WorkNest services..."

# Stop CLSI (running on port 3013)
echo "Stopping CLSI..."
CLSI_PID=$(lsof -ti:3013)
if [ -n "$CLSI_PID" ]; then
    kill $CLSI_PID 2>/dev/null
    echo "CLSI stopped (PID: $CLSI_PID)"
else
    echo "CLSI not running"
fi

# Stop Proxy (running on port 3014)
echo "Stopping Proxy..."
PROXY_PID=$(lsof -ti:3014)
if [ -n "$PROXY_PID" ]; then
    kill $PROXY_PID 2>/dev/null
    echo "Proxy stopped (PID: $PROXY_PID)"
else
    echo "Proxy not running"
fi

# Stop Web Server (running on port 8000)
echo "Stopping Web Server..."
WEB_PID=$(lsof -ti:8000)
if [ -n "$WEB_PID" ]; then
    kill $WEB_PID 2>/dev/null
    echo "Web Server stopped (PID: $WEB_PID)"
else
    echo "Web Server not running"
fi

# Also kill any python processes running clsi-proxy.py
echo "Cleaning up any remaining processes..."
pkill -f "clsi-proxy.py" 2>/dev/null
pkill -f "start-clsi.sh" 2>/dev/null

echo "All services stopped!"
