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
    mysqli_report(MYSQLI_REPORT_OFF);
    $conn = mysqli_init();
    if ($conn === false) {
        error_log('DB connection failed: mysqli_init returned false');
        api_send_json(500, [
            'ok' => false,
            'error' => 'DB connection failed',
        ]);
    }

    $ssl_ca = getenv('DB_SSL_CA') ?: '';
    $ssl_mode = strtolower((string)(getenv('DB_SSL_MODE') ?: 'required'));
    $flags = 0;

    if ($ssl_ca !== '' && file_exists($ssl_ca)) {
        $conn->ssl_set(null, null, $ssl_ca, null, null);
        $flags |= MYSQLI_CLIENT_SSL;
    } elseif (in_array($ssl_mode, ['required', 'verify_ca', 'verify_identity'], true)) {
        $flags |= MYSQLI_CLIENT_SSL;
    }

    $connected = @$conn->real_connect(
        DB_HOST,
        DB_USER,
        DB_PASSWORD,
        DB_NAME,
        DB_PORT,
        null,
        $flags
    );

    if (!$connected || $conn->connect_error) {
        error_log(sprintf(
            'DB connection failed: %s (%d) host=%s port=%d db=%s user=%s ssl_ca=%s ssl_mode=%s',
            (string)$conn->connect_error,
            (int)$conn->connect_errno,
            DB_HOST,
            DB_PORT,
            DB_NAME,
            DB_USER,
            $ssl_ca !== '' ? 'set' : 'unset',
            $ssl_mode
        ));
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
