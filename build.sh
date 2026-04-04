#!/bin/bash
set -e

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "==> Repo root: $REPO_DIR"

echo "==> Installing Node.js via nvm..."
export NVM_DIR="$HOME/.nvm"
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

nvm install 20
nvm use 20

echo "==> Node version: $(node -v)"
echo "==> NPM version: $(npm -v)"

echo "==> Installing PHP dependencies..."
cd "$REPO_DIR"
if command -v composer &> /dev/null; then
    composer install --no-dev --optimize-autoloader
else
    curl -sS https://getcomposer.org/installer | php
    php composer.phar install --no-dev --optimize-autoloader
fi

if [ ! -f "$REPO_DIR/vendor/phpmailer/phpmailer/src/PHPMailer.php" ]; then
    echo "ERROR: PHPMailer was not installed. Build cannot continue."
    exit 1
fi
echo "==> PHPMailer dependency is present."

echo "==> Installing frontend dependencies..."
cd "$REPO_DIR/project"
npm install

echo "==> Building frontend..."
npm run build

echo "==> Build complete. Output in /public"
