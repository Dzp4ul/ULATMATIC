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

$roleMap = [
    'secretary'   => ['table' => 'sec_user', 'name' => 'sec_name', 'email' => 'sec_email', 'schema' => 'api_ensure_secretary_user_schema'],
    'captain'     => ['table' => 'captain_user', 'name' => 'captain_name', 'email' => 'captain_email', 'schema' => 'api_ensure_captain_user_schema'],
    'chief'       => ['table' => 'chief_user', 'name' => 'chief_name', 'email' => 'chief_email', 'schema' => 'api_ensure_chief_user_schema'],
    'pio'         => ['table' => 'pio_user', 'name' => 'pio_name', 'email' => 'pio_email', 'schema' => 'api_ensure_pio_user_schema'],
    'superadmin'  => ['table' => 'superadmin_user', 'name' => 'superadmin_name', 'email' => 'superadmin_email', 'schema' => 'api_ensure_superadmin_user_schema'],
];

if (!isset($roleMap[$role])) {
    api_send_json(400, ['ok' => false, 'error' => 'Invalid role. Must be secretary, captain, chief, pio, or superadmin']);
}

$r = $roleMap[$role];
$conn = api_db();
($r['schema'])($conn);

// Check if created_at column exists
$hasCreatedAt = false;
$colCheck = $conn->query("SHOW COLUMNS FROM {$r['table']} LIKE 'created_at'");
if ($colCheck && $colCheck->num_rows > 0) {
    $hasCreatedAt = true;
}

// Check if status column exists
$hasStatus = false;
$colCheck2 = $conn->query("SHOW COLUMNS FROM {$r['table']} LIKE 'status'");
if ($colCheck2 && $colCheck2->num_rows > 0) {
    $hasStatus = true;
}

$cols = "id, {$r['name']} AS name, {$r['email']} AS email, profile_photo";
if ($hasCreatedAt) {
    $cols .= ", created_at";
}
if ($hasStatus) {
    $cols .= ", status";
}
$sql = "SELECT {$cols} FROM {$r['table']} ORDER BY id DESC";
$result = $conn->query($sql);

$users = [];
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $users[] = [
            'id' => (int)$row['id'],
            'name' => (string)$row['name'],
            'email' => (string)$row['email'],
            'profile_photo' => $row['profile_photo'],
            'created_at' => (string)($row['created_at'] ?? ''),
            'status' => (string)($row['status'] ?? 'active'),
        ];
    }
    $result->free();
}

$conn->close();

api_send_json(200, ['ok' => true, 'users' => $users]);
