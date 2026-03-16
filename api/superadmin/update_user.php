<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/db.php';
require_once __DIR__ . '/../secretary/user_schema.php';
require_once __DIR__ . '/../captain/user_schema.php';
require_once __DIR__ . '/../chief/user_schema.php';
require_once __DIR__ . '/../pio/user_schema.php';
require_once __DIR__ . '/user_schema.php';

api_apply_cors();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    api_send_json(405, ['ok' => false, 'error' => 'Method not allowed']);
}

$body = api_read_json_body();
$role = strtolower(trim((string)($body['role'] ?? '')));
$userId = (int)($body['user_id'] ?? 0);
$name = trim((string)($body['name'] ?? ''));
$email = trim((string)($body['email'] ?? ''));
$password = trim((string)($body['password'] ?? ''));

$roleMap = [
    'secretary'   => ['table' => 'sec_user', 'name' => 'sec_name', 'email' => 'sec_email', 'pass' => 'sec_pass', 'schema' => 'api_ensure_secretary_user_schema'],
    'captain'     => ['table' => 'captain_user', 'name' => 'captain_name', 'email' => 'captain_email', 'pass' => 'captain_pass', 'schema' => 'api_ensure_captain_user_schema'],
    'chief'       => ['table' => 'chief_user', 'name' => 'chief_name', 'email' => 'chief_email', 'pass' => 'chief_pass', 'schema' => 'api_ensure_chief_user_schema'],
    'pio'         => ['table' => 'pio_user', 'name' => 'pio_name', 'email' => 'pio_email', 'pass' => 'pio_pass', 'schema' => 'api_ensure_pio_user_schema'],
    'superadmin'  => ['table' => 'superadmin_user', 'name' => 'superadmin_name', 'email' => 'superadmin_email', 'pass' => 'superadmin_pass', 'schema' => 'api_ensure_superadmin_user_schema'],
];

if (!isset($roleMap[$role])) {
    api_send_json(400, ['ok' => false, 'error' => 'Invalid role']);
}

if ($userId <= 0) {
    api_send_json(400, ['ok' => false, 'error' => 'user_id is required']);
}

if ($name === '' && $email === '' && $password === '') {
    api_send_json(400, ['ok' => false, 'error' => 'At least one field (name, email, password) must be provided']);
}

$r = $roleMap[$role];
$conn = api_db();
($r['schema'])($conn);

// Fetch existing
$stmt = $conn->prepare("SELECT {$r['name']} AS name, {$r['email']} AS email FROM {$r['table']} WHERE id = ? LIMIT 1");
if (!$stmt) {
    $conn->close();
    api_send_json(500, ['ok' => false, 'error' => 'Query prepare failed']);
}
$stmt->bind_param('i', $userId);
$stmt->execute();
$existing = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$existing) {
    $conn->close();
    api_send_json(404, ['ok' => false, 'error' => 'User not found']);
}

$name = $name !== '' ? $name : (string)$existing['name'];
$email = $email !== '' ? $email : (string)$existing['email'];

// Check email uniqueness if changed
if ($email !== (string)$existing['email']) {
    $stmt = $conn->prepare("SELECT id FROM {$r['table']} WHERE {$r['email']} = ? AND id != ? LIMIT 1");
    if ($stmt) {
        $stmt->bind_param('si', $email, $userId);
        $stmt->execute();
        $dup = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        if ($dup) {
            $conn->close();
            api_send_json(409, ['ok' => false, 'error' => 'A user with that email already exists']);
        }
    }
}

if ($password !== '') {
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $conn->prepare("UPDATE {$r['table']} SET {$r['name']} = ?, {$r['email']} = ?, {$r['pass']} = ? WHERE id = ?");
    if (!$stmt) {
        $conn->close();
        api_send_json(500, ['ok' => false, 'error' => 'Update prepare failed']);
    }
    $stmt->bind_param('sssi', $name, $email, $hashedPassword, $userId);
} else {
    $stmt = $conn->prepare("UPDATE {$r['table']} SET {$r['name']} = ?, {$r['email']} = ? WHERE id = ?");
    if (!$stmt) {
        $conn->close();
        api_send_json(500, ['ok' => false, 'error' => 'Update prepare failed']);
    }
    $stmt->bind_param('ssi', $name, $email, $userId);
}

$stmt->execute();
$stmt->close();
$conn->close();

api_send_json(200, [
    'ok' => true,
    'user' => [
        'id' => $userId,
        'name' => $name,
        'email' => $email,
        'role' => strtoupper($role),
    ],
]);
