<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/db.php';
require_once __DIR__ . '/schema.php';

api_apply_cors();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    api_send_json(405, [
        'ok' => false,
        'error' => 'Method not allowed',
    ]);
}

$trackingNumber = trim((string)($_GET['tracking_number'] ?? ''));

if ($trackingNumber === '') {
    api_send_json(400, [
        'ok' => false,
        'error' => 'Tracking number is required',
    ]);
}

$conn = api_db();
api_ensure_complaint_schema($conn);

$stmt = $conn->prepare(
    'SELECT id, tracking_number, case_number, complaint_title, complaint_category, status, created_at FROM complaints WHERE tracking_number = ? LIMIT 1'
);

if (!$stmt) {
    $conn->close();
    api_send_json(500, [
        'ok' => false,
        'error' => 'Query prepare failed',
    ]);
}

$stmt->bind_param('s', $trackingNumber);
$stmt->execute();
$result = $stmt->get_result();
$complaint = $result ? $result->fetch_assoc() : null;
$stmt->close();

if (!$complaint) {
    $conn->close();
    api_send_json(404, [
        'ok' => false,
        'error' => 'No complaint found with that tracking number',
    ]);
}

// Get hearing info if any
$hearings = [];
$hStmt = $conn->prepare(
    'SELECT id, scheduled_date, scheduled_time, location, status, created_at FROM hearing_schedules WHERE complaint_id = ? ORDER BY created_at DESC'
);
if ($hStmt) {
    $cid = (int)$complaint['id'];
    $hStmt->bind_param('i', $cid);
    $hStmt->execute();
    $hResult = $hStmt->get_result();
    if ($hResult) {
        while ($row = $hResult->fetch_assoc()) {
            $hearings[] = $row;
        }
    }
    $hStmt->close();
}

$conn->close();

api_send_json(200, [
    'ok' => true,
    'complaint' => [
        'tracking_number' => $complaint['tracking_number'],
        'case_number' => $complaint['case_number'] ?? null,
        'complaint_title' => (string)($complaint['complaint_title'] ?? ''),
        'complaint_category' => (string)($complaint['complaint_category'] ?? ''),
        'status' => (string)($complaint['status'] ?? ''),
        'created_at' => $complaint['created_at'] ?? null,
    ],
    'hearings' => $hearings,
]);
