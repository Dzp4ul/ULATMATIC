<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/db.php';
require_once __DIR__ . '/user_schema.php';

api_apply_cors();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    api_send_json(405, [
        'ok' => false,
        'error' => 'Method not allowed',
    ]);
}

$body = api_read_json_body();
$email = (string)($body['email'] ?? '');
$password = (string)($body['password'] ?? '');

$email = trim($email);
$password = trim($password);

if ($email === '' || $password === '') {
    api_send_json(400, [
        'ok' => false,
        'error' => 'Email and password are required',
    ]);
}

$conn = api_db();
api_ensure_secretary_user_schema($conn);

$stmt = $conn->prepare('SELECT id, sec_name, sec_email, sec_pass FROM sec_user WHERE sec_email = ? LIMIT 1');
if (!$stmt) {
    api_send_json(500, [
        'ok' => false,
        'error' => 'Query prepare failed',
    ]);
}

$stmt->bind_param('s', $email);
$stmt->execute();
$result = $stmt->get_result();
$user = $result ? $result->fetch_assoc() : null;
$stmt->close();
$conn->close();

if (!$user) {
    api_send_json(401, [
        'ok' => false,
        'error' => 'Invalid credentials',
    ]);
}

$storedPass = (string)($user['sec_pass'] ?? '');

if ($storedPass !== $password) {
    api_send_json(401, [
        'ok' => false,
        'error' => 'Invalid credentials',
    ]);
}

api_send_json(200, [
    'ok' => true,
    'user' => [
        'id' => (int)$user['id'],
        'sec_name' => (string)$user['sec_name'],
        'sec_email' => (string)$user['sec_email'],
        'role' => 'SECRETARY',
    ],
]);
