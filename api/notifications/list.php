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
$user_id = isset($body['user_id']) ? (int) $body['user_id'] : 0;
$user_role = $body['user_role'] ?? '';

$allowed_roles = ['resident', 'secretary', 'captain', 'chief', 'pio'];
if ($user_id <= 0 || !in_array($user_role, $allowed_roles, true)) {
    api_send_json(400, ['ok' => false, 'error' => 'Invalid user_id or user_role']);
}

$db = api_db();

$stmt = $db->prepare(
    'SELECT id, title, message, type, reference_id, is_read, created_at
     FROM notifications
     WHERE user_id = ? AND user_role = ?
     ORDER BY created_at DESC
     LIMIT 50'
);
$stmt->bind_param('is', $user_id, $user_role);
$stmt->execute();
$result = $stmt->get_result();

$notifications = [];
while ($row = $result->fetch_assoc()) {
    $notifications[] = [
        'id' => (int) $row['id'],
        'title' => $row['title'],
        'message' => $row['message'],
        'type' => $row['type'],
        'reference_id' => $row['reference_id'] ? (int) $row['reference_id'] : null,
        'is_read' => (bool) $row['is_read'],
        'created_at' => $row['created_at'],
    ];
}

$stmt->close();

// Count unread
$stmt2 = $db->prepare(
    'SELECT COUNT(*) AS cnt FROM notifications WHERE user_id = ? AND user_role = ? AND is_read = 0'
);
$stmt2->bind_param('is', $user_id, $user_role);
$stmt2->execute();
$cnt_row = $stmt2->get_result()->fetch_assoc();
$unread_count = (int) $cnt_row['cnt'];
$stmt2->close();

$db->close();

api_send_json(200, [
    'ok' => true,
    'notifications' => $notifications,
    'unread_count' => $unread_count,
]);
