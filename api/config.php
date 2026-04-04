<?php

declare(strict_types=1);

/**
 * Central configuration for ULATMATIC.
 * Loads from root .env file first, then falls back to actual environment variables.
 * For production on DigitalOcean, set these in the App Platform Environment Variables UI.
 */

// Load .env file if it exists (local dev or server-side .env)
$envFile = __DIR__ . '/../../.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) continue;
        if (!str_contains($line, '=')) continue;
        [$key, $value] = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value);
        if ($key !== '' && getenv($key) === false) {
            putenv("$key=$value");
            $_ENV[$key] = $value;
        }
    }
}

// ── Database ──────────────────────────────────────────────────────────────────
define('DB_HOST',     getenv('DB_HOST')     ?: '127.0.0.1');
define('DB_USER',     getenv('DB_USER')     ?: 'root');
define('DB_PASSWORD', getenv('DB_PASSWORD') ?: '');
define('DB_NAME',     getenv('DB_NAME')     ?: 'ulatmatic');
define('DB_PORT',     (int)(getenv('DB_PORT') ?: 3306));

// ── SMTP / Mailer ─────────────────────────────────────────────────────────────
define('MAIL_HOST',       getenv('MAIL_HOST')       ?: 'smtp.gmail.com');
define('MAIL_USERNAME',   getenv('MAIL_USERNAME')   ?: 'ulatmatic@gmail.com');
define('MAIL_PASSWORD',   getenv('MAIL_PASSWORD')   ?: '');
define('MAIL_SECURE',     getenv('MAIL_SECURE')     ?: 'tls');
define('MAIL_PORT',       (int)(getenv('MAIL_PORT') ?: 587));
define('MAIL_FROM_EMAIL', getenv('MAIL_FROM_EMAIL') ?: 'ulatmatic@gmail.com');
define('MAIL_FROM_NAME',  getenv('MAIL_FROM_NAME')  ?: 'ULATMATIC');

// ── Allowed CORS origins ──────────────────────────────────────────────────────
define('ALLOWED_ORIGINS', getenv('ALLOWED_ORIGINS') ?: 'http://localhost:5173,http://localhost,http://127.0.0.1');
