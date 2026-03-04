#!/bin/bash

# Start CLSI
echo "Starting CLSI..."
./start-clsi.sh > clsi.log 2>&1 &
CLSI_PID=$!
echo "CLSI started with PID $CLSI_PID"

# Wait for CLSI to be ready (simple sleep for now, better to check port)
sleep 5

# Start Proxy
echo "Starting Proxy..."
python3 clsi-proxy.py > proxy.log 2>&1 &
PROXY_PID=$!
echo "Proxy started with PID $PROXY_PID"

# Start Web Server
echo "Starting Web Server..."
python3 -m http.server 8000 > server.log 2>&1 &
WEB_PID=$!
echo "Web Server started with PID $WEB_PID"

echo "Application running at http://localhost:8000"
echo "Press Ctrl+C to stop all services"

trap "kill $CLSI_PID $PROXY_PID $WEB_PID; exit" INT

wait
