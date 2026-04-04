<?php

declare(strict_types=1);

/**
 * Central configuration for ULATMATIC.
 * Loads from root .env file first, then falls back to actual environment variables.
 * For production on DigitalOcean, set these in the App Platform Environment Variables UI.
 */

// Load .env file if it exists (local dev only — on production set env vars in DO UI)
$envFile = realpath(__DIR__ . '/../../.env');
if ($envFile !== false && is_file($envFile) && strpos($envFile, realpath(__DIR__ . '/../../')) === 0) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if (is_array($lines)) {
        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#')) continue;
            if (!str_contains($line, '=')) continue;
            [$key, $value] = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);
            if ($key !== '' && preg_match('/^[A-Z][A-Z0-9_]+$/', $key) && getenv($key) === false) {
                putenv("$key=$value");
                $_ENV[$key] = $value;
            }
        }
    }
}

// ── Database ──────────────────────────────────────────────────────────────────
define('DB_HOST',     getenv('DB_HOST')     ?: 'db-mysql-sgp1-00254-do-user-35469295-0.i.db.ondigitalocean.com');
define('DB_USER',     getenv('DB_USER')     ?: 'doadmin');
define('DB_PASSWORD', getenv('DB_PASSWORD') ?: 'AVNS_gbOkubobunBlanSMQao');
define('DB_NAME',     getenv('DB_NAME')     ?: 'ulatmatic');
define('DB_PORT',     (int)(getenv('DB_PORT') ?: 25060));

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
