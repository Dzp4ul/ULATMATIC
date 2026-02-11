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
    api_send_json(405, ['ok' => false, 'error' => 'Method not allowed']);
}

$body = json_decode(file_get_contents('php://input'), true);

$hearing_id = isset($body['hearing_id']) ? (int)$body['hearing_id'] : 0;
$resolution_type = isset($body['resolution_type']) ? strtoupper(trim((string)$body['resolution_type'])) : '';
$resolution_method = isset($body['resolution_method']) ? strtoupper(trim((string)$body['resolution_method'])) : null;
$resolution_notes = isset($body['resolution_notes']) ? trim((string)$body['resolution_notes']) : null;

if ($hearing_id <= 0) {
    api_send_json(400, ['ok' => false, 'error' => 'hearing_id is required']);
}

$allowed_types = ['SETTLED', 'REPUDIATED', 'WITHDRAWN', 'PENDING', 'DISMISSED', 'CERTIFIED', 'REFERRED'];
if (!in_array($resolution_type, $allowed_types, true)) {
    api_send_json(400, ['ok' => false, 'error' => 'Invalid resolution_type. Allowed: ' . implode(', ', $allowed_types)]);
}

$allowed_methods = ['MEDIATION', 'CONCILIATION', 'ARBITRATION', null];
if ($resolution_method !== null && !in_array($resolution_method, ['MEDIATION', 'CONCILIATION', 'ARBITRATION'], true)) {
    api_send_json(400, ['ok' => false, 'error' => 'Invalid resolution_method. Allowed: MEDIATION, CONCILIATION, ARBITRATION']);
}

// For settled cases, resolution_method is required
if ($resolution_type === 'SETTLED' && !$resolution_method) {
    api_send_json(400, ['ok' => false, 'error' => 'resolution_method is required for settled cases']);
}

$conn = api_db();
api_ensure_hearing_schema($conn);

// Verify hearing exists
$stmt = $conn->prepare("SELECT id, complaint_id FROM hearing_schedules WHERE id = ?");
$stmt->bind_param('i', $hearing_id);
$stmt->execute();
$result = $stmt->get_result();
if ($result->num_rows === 0) {
    $stmt->close();
    $conn->close();
    api_send_json(404, ['ok' => false, 'error' => 'Hearing not found']);
}
$hearing = $result->fetch_assoc();
$complaint_id = (int)$hearing['complaint_id'];
$stmt->close();

$now = date('Y-m-d H:i:s');

// Determine new hearing status based on resolution
$hearing_status = 'RESOLVED';
$complaint_status = 'RESOLVED';

if (in_array($resolution_type, ['PENDING'], true)) {
    $hearing_status = 'PENDING';
    $complaint_status = 'IN_PROGRESS';
    $now_val = null;
} else {
    $now_val = $now;
}

// Update hearing with resolution
$sql = "UPDATE hearing_schedules SET resolution_type = ?, resolution_method = ?, resolution_notes = ?, resolved_at = ?, status = ? WHERE id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param('sssssi', $resolution_type, $resolution_method, $resolution_notes, $now_val, $hearing_status, $hearing_id);
if (!$stmt->execute()) {
    $stmt->close();
    $conn->close();
    api_send_json(500, ['ok' => false, 'error' => 'Failed to update hearing']);
}
$stmt->close();

// Update complaint status accordingly
$stmt = $conn->prepare("UPDATE complaints SET status = ? WHERE id = ?");
$stmt->bind_param('si', $complaint_status, $complaint_id);
$stmt->execute();
$stmt->close();

$conn->close();

api_send_json(200, [
    'ok' => true,
    'message' => 'Case resolution saved successfully',
    'resolution_type' => $resolution_type,
    'resolution_method' => $resolution_method,
]);
