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
$id = (int)($body['id'] ?? 0);

if ($id <= 0) {
    api_send_json(400, [
        'ok' => false,
        'error' => 'id is required',
    ]);
}

$conn = api_db();
api_ensure_resident_user_schema($conn);

$stmt = $conn->prepare('SELECT id, fname, midname, lname, email, phone, gender, sitio, front_id, back_id, profile_photo FROM resident_user WHERE id = ? LIMIT 1');
if (!$stmt) {
    $conn->close();
    api_send_json(500, [
        'ok' => false,
        'error' => 'Query prepare failed',
    ]);
}

$stmt->bind_param('i', $id);
$stmt->execute();
$result = $stmt->get_result();
$user = $result ? $result->fetch_assoc() : null;
$stmt->close();
$conn->close();

if (!$user) {
    api_send_json(404, [
        'ok' => false,
        'error' => 'User not found',
    ]);
}

api_send_json(200, [
    'ok' => true,
    'user' => [
        'id' => (int)($user['id'] ?? 0),
        'fname' => (string)($user['fname'] ?? ''),
        'midname' => $user['midname'] ?? null,
        'lname' => (string)($user['lname'] ?? ''),
        'email' => (string)($user['email'] ?? ''),
        'phone' => (string)($user['phone'] ?? ''),
        'gender' => (string)($user['gender'] ?? ''),
        'sitio' => (string)($user['sitio'] ?? ''),
        'front_id' => (string)($user['front_id'] ?? ''),
        'back_id' => (string)($user['back_id'] ?? ''),
        'profile_photo' => $user['profile_photo'] ?? null,
        'role' => 'RESIDENT',
    ],
]);
