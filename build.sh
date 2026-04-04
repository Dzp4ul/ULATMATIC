#!/bin/bash
set -e

echo "==> Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

echo "==> Node version: $(node -v)"
echo "==> NPM version: $(npm -v)"

echo "==> Installing frontend dependencies..."
cd project
npm install

echo "==> Building frontend..."
npm run build

echo "==> Build complete. Output in /public"
