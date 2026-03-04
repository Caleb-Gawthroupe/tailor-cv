#!/bin/bash

# Quick setup script for CLSI
# This script helps set up Overleaf CLSI for LaTeX compilation

echo "Setting up Overleaf CLSI for LaTeX PDF compilation..."
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "   Visit: https://www.docker.com/get-started"
    exit 1
fi

echo "✅ Docker is installed"

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Docker is not running. Please start Docker Desktop."
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Create a directory for CLSI setup
CLSI_DIR="$PWD/clsi-setup"
mkdir -p "$CLSI_DIR"
cd "$CLSI_DIR"

echo "📦 Cloning Overleaf repository..."
if [ ! -d "overleaf" ]; then
    git clone https://github.com/overleaf/overleaf.git
else
    echo "   Repository already exists, skipping clone..."
fi

cd overleaf

echo ""
echo "🔨 Building CLSI Docker image (this may take 10-15 minutes)..."
echo "   Building from overleaf root directory..."
docker build -f services/clsi/Dockerfile -t overleaf/clsi .

if [ $? -ne 0 ]; then
    echo "❌ Failed to build CLSI image"
    exit 1
fi

echo ""
echo "📥 Pulling TeX Live image..."
docker pull texlive/texlive:latest

echo ""
echo "📁 Creating directories..."
cd services/clsi
mkdir -p compiles cache

echo ""
echo "✅ CLSI setup complete!"
echo ""
echo "To start CLSI, run:"
echo "  ./start-clsi.sh"
echo ""
echo "Or manually:"
echo "  cd $CLSI_DIR/overleaf/services/clsi"
echo "  docker run --rm \\"
echo "    -p 127.0.0.1:3013:3013 \\"
echo "    -e LISTEN_ADDRESS=0.0.0.0 \\"
echo "    -e DOCKER_RUNNER=true \\"
echo "    -e TEXLIVE_IMAGE=texlive/texlive:latest \\"
echo "    -e TEXLIVE_IMAGE_USER=root \\"
echo "    -e COMPILES_HOST_DIR=\"\$PWD/compiles\" \\"
echo "    -v \"\$PWD/compiles:/app/compiles\" \\"
echo "    -v \"\$PWD/cache:/app/cache\" \\"
echo "    -v /var/run/docker.sock:/var/run/docker.sock \\"
echo "    --name clsi \\"
echo "    overleaf/clsi"

