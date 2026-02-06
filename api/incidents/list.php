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
$status = strtoupper(trim((string)($body['status'] ?? '')));

$conn = api_db();
api_ensure_incident_schema($conn);

$incidents = [];

if ($status !== '' && $status !== 'ALL') {
    $stmt = $conn->prepare('SELECT id, resident_id, incident_type, incident_category, sitio, description, witness, evidence_path, evidence_mime, status, created_at, resolved_at, transferred_at FROM incidents WHERE status = ? ORDER BY created_at DESC');
    if (!$stmt) {
        $conn->close();
        api_send_json(500, [
            'ok' => false,
            'error' => 'Query prepare failed',
        ]);
    }

    $stmt->bind_param('s', $status);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $incidents[] = [
                'id' => (int)($row['id'] ?? 0),
                'resident_id' => isset($row['resident_id']) ? (int)$row['resident_id'] : null,
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
        }
    }

    $stmt->close();
} else {
    $result = $conn->query('SELECT id, resident_id, incident_type, incident_category, sitio, description, witness, evidence_path, evidence_mime, status, created_at, resolved_at, transferred_at FROM incidents ORDER BY created_at DESC');
    if (!$result) {
        $conn->close();
        api_send_json(500, [
            'ok' => false,
            'error' => 'Query failed',
        ]);
    }

    while ($row = $result->fetch_assoc()) {
        $incidents[] = [
            'id' => (int)($row['id'] ?? 0),
            'resident_id' => isset($row['resident_id']) ? (int)$row['resident_id'] : null,
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
    }

    $result->free();
}

$conn->close();

api_send_json(200, [
    'ok' => true,
    'incidents' => $incidents,
]);
