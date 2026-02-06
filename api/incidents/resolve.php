<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/db.php';
require_once __DIR__ . '/schema.php';

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
api_ensure_incident_schema($conn);

$stmt = $conn->prepare("UPDATE incidents SET status = 'RESOLVED', resolved_at = NOW() WHERE id = ? AND status = 'PENDING'");
if (!$stmt) {
    $conn->close();
    api_send_json(500, [
        'ok' => false,
        'error' => 'Query prepare failed',
    ]);
}

$stmt->bind_param('i', $id);
$stmt->execute();
$affected = $stmt->affected_rows;
$stmt->close();
$conn->close();

if ($affected <= 0) {
    api_send_json(404, [
        'ok' => false,
        'error' => 'Incident not found or not pending',
    ]);
}

api_send_json(200, [
    'ok' => true,
    'id' => $id,
    'status' => 'RESOLVED',
]);
