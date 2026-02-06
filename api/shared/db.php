<?php

declare(strict_types=1);

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
    $allowed = [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
    ];

    if (in_array($origin, $allowed, true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
    }

    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
}

function api_db(): mysqli
{
    $db_host = '127.0.0.1';
    $db_user = 'root';
    $db_password = '';
    $db_name = 'ulatmatic';
    $db_port = 3306;

    $conn = new mysqli($db_host, $db_user, $db_password, $db_name, $db_port);

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
