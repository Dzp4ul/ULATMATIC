#!/bin/bash
set -e

echo "==> Installing Node.js via nvm..."
export NVM_DIR="$HOME/.nvm"
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

nvm install 20
nvm use 20

echo "==> Node version: $(node -v)"
echo "==> NPM version: $(npm -v)"

echo "==> Installing PHP dependencies..."
cd /workspace
if command -v composer &> /dev/null; then
    composer install --no-dev --optimize-autoloader
else
    curl -sS https://getcomposer.org/installer | php
    php composer.phar install --no-dev --optimize-autoloader
fi

echo "==> Installing frontend dependencies..."
cd /workspace/project
npm install

echo "==> Building frontend..."
npm run build

echo "==> Build complete. Output in /public"
