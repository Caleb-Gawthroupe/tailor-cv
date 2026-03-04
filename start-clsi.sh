#!/bin/bash

# Quick start script for CLSI
# Make sure you've run setup-clsi.sh first

CLSI_DIR="$PWD/clsi-setup/overleaf/services/clsi"

if [ ! -d "$CLSI_DIR" ]; then
    echo "❌ CLSI not set up. Please run ./setup-clsi.sh first"
    exit 1
fi

cd "$CLSI_DIR"

# Check if CLSI image exists
if ! docker images | grep -q "overleaf/clsi"; then
    echo "❌ CLSI image not found. Please run ./setup-clsi.sh first"
    exit 1
fi

# Create directories if they don't exist
mkdir -p compiles cache

echo "🚀 Starting CLSI service on http://localhost:3013"
echo "   Press Ctrl+C to stop"
echo ""

docker run --rm \
  -p 127.0.0.1:3013:3013 \
  -e LISTEN_ADDRESS=0.0.0.0 \
  -e DOCKER_RUNNER=true \
  -e TEXLIVE_IMAGE=texlive/texlive:latest \
  -e TEXLIVE_IMAGE_USER=root \
  -e COMPILES_HOST_DIR="$PWD/compiles" \
  -v "$PWD/compiles:/overleaf/services/clsi/compiles" \
  -v "$PWD/cache:/overleaf/services/clsi/cache" \
  -v /var/run/docker.sock:/var/run/docker.sock \
  --name clsi \
  overleaf/clsi

