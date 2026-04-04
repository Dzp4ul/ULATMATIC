<?php

declare(strict_types=1);

/**
 * Central configuration for ULATMATIC.
 *
 * For production, set these as actual environment variables on your server
 * (e.g. via Apache SetEnv, .htaccess, or php-fpm pool config) so credentials
 * are never stored in source code.
 *
 * Fallback values below are for local XAMPP development only.
 */

// ── Database ──────────────────────────────────────────────────────────────────
define('DB_HOST',     getenv('DB_HOST')     ?: '127.0.0.1');
define('DB_USER',     getenv('DB_USER')     ?: 'root');
define('DB_PASSWORD', getenv('DB_PASSWORD') ?: '');
define('DB_NAME',     getenv('DB_NAME')     ?: 'ulatmatic');
define('DB_PORT',     (int)(getenv('DB_PORT') ?: 3306));

// ── SMTP / Mailer ─────────────────────────────────────────────────────────────
define('MAIL_HOST',       getenv('MAIL_HOST')       ?: 'smtp.gmail.com');
define('MAIL_USERNAME',   getenv('MAIL_USERNAME')   ?: 'ulatmatic@gmail.com');
define('MAIL_PASSWORD',   getenv('MAIL_PASSWORD')   ?: '');   // set via env var in production
define('MAIL_SECURE',     getenv('MAIL_SECURE')     ?: 'tls');
define('MAIL_PORT',       (int)(getenv('MAIL_PORT') ?: 587));
define('MAIL_FROM_EMAIL', getenv('MAIL_FROM_EMAIL') ?: 'ulatmatic@gmail.com');
define('MAIL_FROM_NAME',  getenv('MAIL_FROM_NAME')  ?: 'ULATMATIC');

// ── Allowed CORS origins ──────────────────────────────────────────────────────
// Comma-separated list of allowed origins, e.g.:
//   ALLOWED_ORIGINS=http://localhost:5173,http://192.168.1.10
define('ALLOWED_ORIGINS', getenv('ALLOWED_ORIGINS') ?: 'http://localhost:5173,http://localhost,http://127.0.0.1');
