<?php

declare(strict_types=1);

require_once __DIR__ . '/../config.php';

function api_send_json(int $statusCode, array $payload): void
{
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload);
    exit;
}

function api_apply_cors(): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin === '') {
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type');
        return;
    }

    $allowed = array_map('trim', explode(',', ALLOWED_ORIGINS));
    if (in_array($origin, $allowed, true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
    }

    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
}

function api_db(): mysqli
{
    $conn = new mysqli();

    $ssl_ca = getenv('DB_SSL_CA') ?: '';
    if ($ssl_ca !== '' && file_exists($ssl_ca)) {
        $conn->ssl_set(null, null, $ssl_ca, null, null);
    }

    $conn->real_connect(
        DB_HOST,
        DB_USER,
        DB_PASSWORD,
        DB_NAME,
        DB_PORT,
        null,
        $ssl_ca !== '' ? MYSQLI_CLIENT_SSL : MYSQLI_CLIENT_SSL
    );

    if ($conn->connect_error) {
        api_send_json(500, [
            'ok' => false,
            'error' => 'DB connection failed',
        ]);
    }

    $conn->set_charset('utf8mb4');
    return $conn;
}

function api_read_json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }

    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}
