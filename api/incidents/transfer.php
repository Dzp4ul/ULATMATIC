<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/db.php';
require_once __DIR__ . '/schema.php';
require_once __DIR__ . '/../complaints/schema.php';

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
api_ensure_complaint_schema($conn);

$stmt = $conn->prepare('SELECT id, resident_id, incident_type, incident_category, sitio, description, witness, evidence_path, evidence_mime, status FROM incidents WHERE id = ? LIMIT 1');
if (!$stmt) {
    $conn->close();
    api_send_json(500, [
        'ok' => false,
        'error' => 'Query prepare failed',
    ]);
}

$stmt->bind_param('i', $id);
$stmt->execute();
$result = $stmt->get_result();
$incident = $result ? $result->fetch_assoc() : null;
$stmt->close();

if (!$incident) {
    $conn->close();
    api_send_json(404, [
        'ok' => false,
        'error' => 'Incident not found',
    ]);
}

if (($incident['status'] ?? '') === 'TRANSFERRED') {
    $conn->close();
    api_send_json(400, [
        'ok' => false,
        'error' => 'Incident already transferred',
    ]);
}

$residentId = (int)($incident['resident_id'] ?? 0);
if ($residentId <= 0) {
    $conn->close();
    api_send_json(400, [
        'ok' => false,
        'error' => 'Incident missing resident id',
    ]);
}

$incidentType = trim((string)($incident['incident_type'] ?? ''));
$complaintTitle = $incidentType !== '' ? 'Incident: ' . $incidentType : 'Incident Report';
$respondentAddress = trim((string)($incident['sitio'] ?? ''));
if ($respondentAddress === '') {
    $respondentAddress = 'Unknown';
}

$status = 'PENDING';
$respondentNameVal = null;
$witnessVal = $incident['witness'] ?? null;
$evidencePath = $incident['evidence_path'] ?? null;
$evidenceMime = $incident['evidence_mime'] ?? null;

$insert = $conn->prepare('INSERT INTO complaints (resident_id, complaint_title, complaint_type, complaint_category, sitio, respondent_name, respondent_address, description, witness, evidence_path, evidence_mime, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
if (!$insert) {
    $conn->close();
    api_send_json(500, [
        'ok' => false,
        'error' => 'Insert failed',
    ]);
}

$insert->bind_param(
    'isssssssssss',
    $residentId,
    $complaintTitle,
    $incident['incident_type'],
    $incident['incident_category'],
    $incident['sitio'],
    $respondentNameVal,
    $respondentAddress,
    $incident['description'],
    $witnessVal,
    $evidencePath,
    $evidenceMime,
    $status
);
$insert->execute();
$complaintId = $insert->insert_id;
$insert->close();

$update = $conn->prepare("UPDATE incidents SET status = 'TRANSFERRED', transferred_at = NOW() WHERE id = ?");
if (!$update) {
    $conn->close();
    api_send_json(500, [
        'ok' => false,
        'error' => 'Update failed',
    ]);
}

$update->bind_param('i', $id);
$update->execute();
$update->close();
$conn->close();

api_send_json(200, [
    'ok' => true,
    'id' => $id,
    'complaint_id' => (int)$complaintId,
    'status' => 'TRANSFERRED',
]);
