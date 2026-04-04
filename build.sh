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

echo "==> Verifying PHPMailer dependency..."
if command -v composer &> /dev/null; then
    if ! composer --working-dir "$REPO_DIR" show phpmailer/phpmailer > /dev/null 2>&1; then
        echo "ERROR: PHPMailer package is not installed according to composer."
        exit 1
    fi
elif [ -f "$REPO_DIR/composer.phar" ]; then
    if ! php "$REPO_DIR/composer.phar" --working-dir "$REPO_DIR" show phpmailer/phpmailer > /dev/null 2>&1; then
        echo "ERROR: PHPMailer package is not installed according to composer.phar."
        exit 1
    fi
else
    echo "ERROR: Composer verification step could not run."
    exit 1
fi
echo "==> PHPMailer dependency verified."

echo "==> Installing frontend dependencies..."
cd "$REPO_DIR/project"
npm install

echo "==> Building frontend..."
npm run build

echo "==> Build complete. Output in /public"
