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
$residentId = (int)($body['resident_id'] ?? 0);
$status = strtoupper(trim((string)($body['status'] ?? '')));
$all = filter_var($body['all'] ?? false, FILTER_VALIDATE_BOOL);

$conn = api_db();
api_ensure_incident_schema($conn);

$incidents = [];

$mapRow = static function (array $row): array {
    return [
        'id' => (int)($row['id'] ?? 0),
        'resident_id' => isset($row['resident_id']) ? (int)$row['resident_id'] : null,
        'tracking_number' => $row['tracking_number'] ?? null,
        'incident_type' => (string)($row['incident_type'] ?? ''),
        'incident_category' => (string)($row['incident_category'] ?? ''),
        'sitio' => (string)($row['sitio'] ?? ''),
        'description' => (string)($row['description'] ?? ''),
        'witness' => $row['witness'] ?? null,
        'evidence_path' => $row['evidence_path'] ?? null,
        'evidence_mime' => $row['evidence_mime'] ?? null,
        'status' => (string)($row['status'] ?? ''),
        'created_at' => $row['created_at'] ?? null,
        'resolved_at' => $row['resolved_at'] ?? null,
        'transferred_at' => $row['transferred_at'] ?? null,
    ];
};

$conditions = [];
$params = [];
$types = '';

if ($residentId > 0 && !$all) {
    $conditions[] = 'resident_id = ?';
    $params[] = $residentId;
    $types .= 'i';
}

if ($status !== '' && $status !== 'ALL') {
    $conditions[] = 'status = ?';
    $params[] = $status;
    $types .= 's';
}

$sql = 'SELECT id, resident_id, tracking_number, incident_type, incident_category, sitio, description, witness, evidence_path, evidence_mime, status, created_at, resolved_at, transferred_at FROM incidents';
if (count($conditions) > 0) {
    $sql .= ' WHERE ' . implode(' AND ', $conditions);
}
$sql .= ' ORDER BY created_at DESC';

if (count($params) > 0) {
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        $conn->close();
        api_send_json(500, ['ok' => false, 'error' => 'Query prepare failed']);
    }
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $incidents[] = $mapRow($row);
        }
    }
    $stmt->close();
} else {
    $result = $conn->query($sql);
    if (!$result) {
        $conn->close();
        api_send_json(500, ['ok' => false, 'error' => 'Query failed']);
    }
    while ($row = $result->fetch_assoc()) {
        $incidents[] = $mapRow($row);
    }
    $result->free();
}

$conn->close();

api_send_json(200, [
    'ok' => true,
    'incidents' => $incidents,
]);
