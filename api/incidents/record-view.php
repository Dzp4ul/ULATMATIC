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
$incidentId = (int)($body['incident_id'] ?? 0);
$userId = (int)($body['user_id'] ?? 0);
$userRole = trim((string)($body['user_role'] ?? ''));

if ($incidentId <= 0 || $userId <= 0 || $userRole === '') {
    api_send_json(400, [
        'ok' => false,
        'error' => 'Missing required fields: incident_id, user_id, user_role',
    ]);
}

$allowedRoles = ['chief', 'pio', 'captain', 'secretary'];
if (!in_array($userRole, $allowedRoles, true)) {
    api_send_json(400, [
        'ok' => false,
        'error' => 'Invalid user_role',
    ]);
}

$conn = api_db();
api_ensure_incident_schema($conn);

// Insert or ignore (in case already viewed)
$stmt = $conn->prepare('INSERT IGNORE INTO incidents_viewed (incident_id, user_id, user_role) VALUES (?, ?, ?)');
if (!$stmt) {
    api_send_json(500, [
        'ok' => false,
        'error' => 'Query prepare failed',
    ]);
}

$stmt->bind_param('iis', $incidentId, $userId, $userRole);
$stmt->execute();
$stmt->close();

$conn->close();

api_send_json(200, [
    'ok' => true,
    'message' => 'View recorded successfully',
]);
