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
api_ensure_resident_user_schema($conn);

$status = 'APPROVED';
$stmt = $conn->prepare('SELECT id, fname, midname, lname, email, sitio, user_pass, status FROM resident_user WHERE email = ? AND status = ? LIMIT 1');
if (!$stmt) {
    $conn->close();
    api_send_json(500, [
        'ok' => false,
        'error' => 'Query prepare failed',
    ]);
}

$stmt->bind_param('ss', $email, $status);
$stmt->execute();
$result = $stmt->get_result();
$user = $result ? $result->fetch_assoc() : null;
$stmt->close();
$conn->close();

if (!$user) {
    api_send_json(401, [
        'ok' => false,
        'error' => 'Account not found or not approved',
    ]);
}

$stored = (string)($user['user_pass'] ?? '');
$ok = password_verify($password, $stored);

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
        'fname' => (string)($user['fname'] ?? ''),
        'midname' => $user['midname'] ?? null,
        'lname' => $user['lname'] ?? null,
        'email' => (string)($user['email'] ?? ''),
        'sitio' => (string)($user['sitio'] ?? ''),
        'role' => 'RESIDENT',
    ],
]);
