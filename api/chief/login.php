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
$email = trim((string)($body['email'] ?? ''));
$password = trim((string)($body['password'] ?? ''));

if ($email === '' || $password === '') {
    api_send_json(400, [
        'ok' => false,
        'error' => 'Email and password are required',
    ]);
}

$conn = api_db();
api_ensure_chief_user_schema($conn);

$stmt = $conn->prepare('SELECT id, chief_name, chief_email, chief_pass FROM chief_user WHERE chief_email = ? LIMIT 1');
if (!$stmt) {
    $conn->close();
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

$storedPass = (string)($user['chief_pass'] ?? '');
$ok = false;

if ($storedPass !== '' && (strpos($storedPass, '$2y$') === 0 || strpos($storedPass, '$2a$') === 0 || strpos($storedPass, '$argon2') === 0)) {
    $ok = password_verify($password, $storedPass);
} else {
    $ok = hash_equals($storedPass, $password);
}

if (!$ok) {
    api_send_json(401, [
        'ok' => false,
        'error' => 'Invalid credentials',
    ]);
}

api_send_json(200, [
    'ok' => true,
    'user' => [
        'id' => (int)($user['id'] ?? 0),
        'chief_name' => (string)($user['chief_name'] ?? ''),
        'chief_email' => (string)($user['chief_email'] ?? ''),
        'role' => 'CHIEF',
    ],
]);
