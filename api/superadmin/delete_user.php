<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/db.php';
require_once __DIR__ . '/../secretary/user_schema.php';
require_once __DIR__ . '/../captain/user_schema.php';
require_once __DIR__ . '/../chief/user_schema.php';
require_once __DIR__ . '/../pio/user_schema.php';

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

$roleMap = [
    'secretary' => ['table' => 'sec_user', 'schema' => 'api_ensure_secretary_user_schema'],
    'captain'   => ['table' => 'captain_user', 'schema' => 'api_ensure_captain_user_schema'],
    'chief'     => ['table' => 'chief_user', 'schema' => 'api_ensure_chief_user_schema'],
    'pio'       => ['table' => 'pio_user', 'schema' => 'api_ensure_pio_user_schema'],
];

if (!isset($roleMap[$role])) {
    api_send_json(400, ['ok' => false, 'error' => 'Invalid role']);
}

if ($userId <= 0) {
    api_send_json(400, ['ok' => false, 'error' => 'user_id is required']);
}

$r = $roleMap[$role];
$conn = api_db();
($r['schema'])($conn);

$stmt = $conn->prepare("DELETE FROM {$r['table']} WHERE id = ?");
if (!$stmt) {
    $conn->close();
    api_send_json(500, ['ok' => false, 'error' => 'Delete prepare failed']);
}

$stmt->bind_param('i', $userId);
$stmt->execute();
$affected = $stmt->affected_rows;
$stmt->close();
$conn->close();

if ($affected === 0) {
    api_send_json(404, ['ok' => false, 'error' => 'User not found']);
}

api_send_json(200, ['ok' => true, 'message' => 'User deleted successfully']);
