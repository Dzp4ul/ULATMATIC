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
        'error' => 'Invalid id',
    ]);
}

$conn = api_db();
api_ensure_resident_user_schema($conn);

$status = 'DECLINED';
$stmt = $conn->prepare("UPDATE resident_user SET status = ?, declined_at = CURRENT_TIMESTAMP, approved_at = NULL WHERE id = ? AND status = 'PENDING'");
if (!$stmt) {
    $conn->close();
    api_send_json(500, [
        'ok' => false,
        'error' => 'Update prepare failed',
    ]);
}

$stmt->bind_param('si', $status, $id);
$stmt->execute();
$affected = $stmt->affected_rows;
$stmt->close();
$conn->close();

if ($affected <= 0) {
    api_send_json(400, [
        'ok' => false,
        'error' => 'Resident is not pending or not found',
    ]);
}

api_send_json(200, [
    'ok' => true,
    'message' => 'Resident declined',
]);
