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
$complaint_id = (int)($body['complaint_id'] ?? 0);
$scheduled_date = trim((string)($body['scheduled_date'] ?? ''));
$scheduled_time = trim((string)($body['scheduled_time'] ?? ''));
$location = trim((string)($body['location'] ?? ''));
$notes = trim((string)($body['notes'] ?? ''));

if ($complaint_id <= 0) {
    api_send_json(400, [
        'ok' => false,
        'error' => 'complaint_id is required',
    ]);
}

if (empty($scheduled_date)) {
    api_send_json(400, [
        'ok' => false,
        'error' => 'scheduled_date is required',
    ]);
}

if (empty($scheduled_time)) {
    api_send_json(400, [
        'ok' => false,
        'error' => 'scheduled_time is required',
    ]);
}

if (empty($location)) {
    api_send_json(400, [
        'ok' => false,
        'error' => 'location is required',
    ]);
}

$conn = api_db();
api_ensure_hearing_schema($conn);

// Verify complaint exists and is in IN_PROGRESS status
$stmt = $conn->prepare("SELECT id, status FROM complaints WHERE id = ?");
if (!$stmt) {
    $conn->close();
    api_send_json(500, [
        'ok' => false,
        'error' => 'Query prepare failed',
    ]);
}

$stmt->bind_param('i', $complaint_id);
$stmt->execute();
$result = $stmt->get_result();
$complaint = $result->fetch_assoc();
$stmt->close();

if (!$complaint) {
    $conn->close();
    api_send_json(404, [
        'ok' => false,
        'error' => 'Complaint not found',
    ]);
}

if (strtoupper($complaint['status']) !== 'IN_PROGRESS') {
    $conn->close();
    api_send_json(400, [
        'ok' => false,
        'error' => 'Complaint must be in IN_PROGRESS status to schedule a hearing',
    ]);
}

// Insert hearing schedule
$stmt = $conn->prepare(
    "INSERT INTO hearing_schedules (complaint_id, scheduled_date, scheduled_time, location, notes, status) 
     VALUES (?, ?, ?, ?, ?, 'PENDING')"
);

if (!$stmt) {
    $conn->close();
    api_send_json(500, [
        'ok' => false,
        'error' => 'Query prepare failed',
    ]);
}

$stmt->bind_param('issss', $complaint_id, $scheduled_date, $scheduled_time, $location, $notes);

if (!$stmt->execute()) {
    $error = $stmt->error;
    $stmt->close();
    $conn->close();
    api_send_json(500, [
        'ok' => false,
        'error' => 'Failed to schedule hearing: ' . $error,
    ]);
}

$hearing_id = $stmt->insert_id;
$stmt->close();
$conn->close();

api_send_json(200, [
    'ok' => true,
    'hearing_id' => $hearing_id,
    'complaint_id' => $complaint_id,
    'scheduled_date' => $scheduled_date,
    'scheduled_time' => $scheduled_time,
    'location' => $location,
    'status' => 'PENDING',
]);
