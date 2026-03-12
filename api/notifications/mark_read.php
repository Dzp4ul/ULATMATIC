<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/db.php';

api_apply_cors();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    api_send_json(405, ['ok' => false, 'error' => 'Method not allowed']);
}

$body = api_read_json_body();
$notification_id = isset($body['notification_id']) ? (int) $body['notification_id'] : 0;
$user_id = isset($body['user_id']) ? (int) $body['user_id'] : 0;
$user_role = $body['user_role'] ?? '';

$allowed_roles = ['resident', 'secretary', 'captain', 'chief', 'pio'];
if ($notification_id <= 0 || $user_id <= 0 || !in_array($user_role, $allowed_roles, true)) {
    api_send_json(400, ['ok' => false, 'error' => 'Invalid parameters']);
}

$db = api_db();

$stmt = $db->prepare(
    'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ? AND user_role = ?'
);
$stmt->bind_param('iis', $notification_id, $user_id, $user_role);
$stmt->execute();
$stmt->close();
$db->close();

api_send_json(200, ['ok' => true]);
