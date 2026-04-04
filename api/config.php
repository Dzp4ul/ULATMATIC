<?php

declare(strict_types=1);

/**
 * Central configuration for ULATMATIC.
 * Loads from project-root .env file first, then falls back to process env vars.
 * For production on DigitalOcean, set these in the App Platform Environment Variables UI.
 */

// Load .env file if it exists (local dev only; production should use real env vars)
$projectRoot = realpath(__DIR__ . '/..');
$envFile = $projectRoot !== false ? $projectRoot . DIRECTORY_SEPARATOR . '.env' : false;
if (is_string($envFile) && is_file($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if (is_array($lines)) {
        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#')) continue;
            if (!str_contains($line, '=')) continue;

            [$key, $value] = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);

            if (strlen($value) >= 2) {
                $first = $value[0];
                $last = $value[strlen($value) - 1];
                if (($first === '"' && $last === '"') || ($first === "'" && $last === "'")) {
                    $value = substr($value, 1, -1);
                }
            }

            if ($key !== '' && preg_match('/^[A-Z][A-Z0-9_]+$/', $key) && getenv($key) === false) {
                putenv("$key=$value");
                $_ENV[$key] = $value;
            }
        }
    }
}

// Database
$databaseUrl = getenv('DATABASE_URL') ?: '';
$dbFromUrl = [
    'host' => null,
    'user' => null,
    'pass' => null,
    'name' => null,
    'port' => null,
];

if ($databaseUrl !== '') {
    $parts = parse_url($databaseUrl);
    if (is_array($parts)) {
        $dbFromUrl['host'] = isset($parts['host']) ? (string)$parts['host'] : null;
        $dbFromUrl['user'] = isset($parts['user']) ? (string)$parts['user'] : null;
        $dbFromUrl['pass'] = isset($parts['pass']) ? (string)$parts['pass'] : null;
        $dbFromUrl['name'] = isset($parts['path']) ? ltrim((string)$parts['path'], '/') : null;
        $dbFromUrl['port'] = isset($parts['port']) ? (int)$parts['port'] : null;
    }
}

$dbHostEnv = getenv('DB_HOST');
$dbUserEnv = getenv('DB_USER');
$dbPassEnv = getenv('DB_PASSWORD');
$dbNameEnv = getenv('DB_NAME');
$dbPortEnv = getenv('DB_PORT');

define('DB_HOST', ($dbHostEnv !== false && $dbHostEnv !== '') ? $dbHostEnv : (string)($dbFromUrl['host'] ?? '127.0.0.1'));
define('DB_USER', ($dbUserEnv !== false && $dbUserEnv !== '') ? $dbUserEnv : (string)($dbFromUrl['user'] ?? 'root'));
define('DB_PASSWORD', $dbPassEnv !== false ? $dbPassEnv : (string)($dbFromUrl['pass'] ?? ''));
define('DB_NAME', ($dbNameEnv !== false && $dbNameEnv !== '') ? $dbNameEnv : (string)($dbFromUrl['name'] ?? 'ulatmatic'));
define('DB_PORT', ($dbPortEnv !== false && $dbPortEnv !== '') ? (int)$dbPortEnv : (int)($dbFromUrl['port'] ?? 3306));

// SMTP / Mailer
define('MAIL_HOST',       getenv('MAIL_HOST')       ?: 'smtp.gmail.com');
define('MAIL_USERNAME',   getenv('MAIL_USERNAME')   ?: 'ulatmatic@gmail.com');
define('MAIL_PASSWORD',   getenv('MAIL_PASSWORD')   ?: '');
define('MAIL_SECURE',     getenv('MAIL_SECURE')     ?: 'tls');
define('MAIL_PORT',       (int)(getenv('MAIL_PORT') ?: 587));
define('MAIL_FROM_EMAIL', getenv('MAIL_FROM_EMAIL') ?: 'ulatmatic@gmail.com');
define('MAIL_FROM_NAME',  getenv('MAIL_FROM_NAME')  ?: 'ULATMATIC');

// Allowed CORS origins
define('ALLOWED_ORIGINS', getenv('ALLOWED_ORIGINS') ?: 'http://localhost:5173,http://localhost,http://127.0.0.1,https://ulatmatic-s2zqx.ondigitalocean.app');
