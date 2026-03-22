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
$trackingNumber = trim((string)($body['tracking_number'] ?? ''));

if ($trackingNumber === '') {
    api_send_json(400, [
        'ok' => false,
        'error' => 'Tracking number is required',
    ]);
}

$conn = api_db();
api_ensure_incident_schema($conn);

$stmt = $conn->prepare('SELECT id, resident_id, tracking_number, incident_type, incident_category, sitio, description, witness, evidence_path, evidence_mime, status, created_at, resolved_at, transferred_at FROM incidents WHERE tracking_number = ? LIMIT 1');
if (!$stmt) {
    api_send_json(500, [
        'ok' => false,
        'error' => 'Query prepare failed',
    ]);
}

$stmt->bind_param('s', $trackingNumber);
$stmt->execute();
$result = $stmt->get_result();
$incident = $result->fetch_assoc();
$stmt->close();

if (!$incident) {
    api_send_json(404, [
        'ok' => false,
        'error' => 'Incident not found',
    ]);
}

// Check if this incident has been viewed by Chief or PIO
$viewedByChief = false;
$viewedByPio = false;

$checkViewStmt = $conn->prepare('SELECT user_id, user_role FROM incidents_viewed WHERE incident_id = ?');
if ($checkViewStmt) {
    $checkViewStmt->bind_param('i', $incident['id']);
    $checkViewStmt->execute();
    $viewResult = $checkViewStmt->get_result();
    while ($view = $viewResult->fetch_assoc()) {
        if ($view['user_role'] === 'chief') {
            $viewedByChief = true;
        } elseif ($view['user_role'] === 'pio') {
            $viewedByPio = true;
        }
    }
    $checkViewStmt->close();
}

$conn->close();

api_send_json(200, [
    'ok' => true,
    'incident' => [
        'id' => (int)$incident['id'],
        'resident_id' => isset($incident['resident_id']) ? (int)$incident['resident_id'] : null,
        'tracking_number' => $incident['tracking_number'] ?? null,
        'incident_type' => (string)($incident['incident_type'] ?? ''),
        'incident_category' => (string)($incident['incident_category'] ?? ''),
        'sitio' => (string)($incident['sitio'] ?? ''),
        'description' => (string)($incident['description'] ?? ''),
        'witness' => $incident['witness'] ?? null,
        'evidence_path' => $incident['evidence_path'] ?? null,
        'evidence_mime' => $incident['evidence_mime'] ?? null,
        'status' => (string)($incident['status'] ?? ''),
        'created_at' => $incident['created_at'] ?? null,
        'resolved_at' => $incident['resolved_at'] ?? null,
        'transferred_at' => $incident['transferred_at'] ?? null,
        'viewed_by_chief' => $viewedByChief,
        'viewed_by_pio' => $viewedByPio,
    ],
]);
