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
if [ ! -f "$REPO_DIR/vendor/autoload.php" ]; then
    if command -v composer &> /dev/null; then
        composer install --no-dev --optimize-autoloader
    else
        curl -sS https://getcomposer.org/installer | php
        php composer.phar install --no-dev --optimize-autoloader
    fi
else
    echo "==> vendor/ already present, skipping composer install."
fi

echo "==> Verifying PHPMailer dependency..."
if [ ! -f "$REPO_DIR/vendor/phpmailer/phpmailer/src/PHPMailer.php" ]; then
    echo "ERROR: PHPMailer not found in vendor/."
    exit 1
fi
echo "==> PHPMailer dependency verified."

echo "==> Installing frontend dependencies..."
cd "$REPO_DIR/project"
npm install

echo "==> Building frontend..."
npm run build

echo "==> Build complete. Output in /public"
