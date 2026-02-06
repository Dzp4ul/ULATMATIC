<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/db.php';
require_once __DIR__ . '/schema.php';
require_once __DIR__ . '/../resident/user_schema.php';

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

if (!$all && $residentId <= 0) {
    api_send_json(400, [
        'ok' => false,
        'error' => 'resident_id is required',
    ]);
}

$conn = api_db();
api_ensure_complaint_schema($conn);
api_ensure_resident_user_schema($conn);

$complaints = [];

$appendComplaint = static function (array $row) use (&$complaints): void {
    $fname = trim((string)($row['resident_fname'] ?? ''));
    $midname = trim((string)($row['resident_midname'] ?? ''));
    $lname = trim((string)($row['resident_lname'] ?? ''));
    $residentName = trim(preg_replace('/\s+/', ' ', $fname . ' ' . $midname . ' ' . $lname));
    if ($residentName === '') {
        $residentName = null;
    }
    $complaints[] = [
        'id' => (int)($row['id'] ?? 0),
        'resident_id' => (int)($row['resident_id'] ?? 0),
        'resident_name' => $residentName,
        'tracking_number' => $row['tracking_number'] ?? null,
        'case_number' => $row['case_number'] ?? null,
        'complaint_title' => (string)($row['complaint_title'] ?? ''),
        'complaint_type' => (string)($row['complaint_type'] ?? ''),
        'complaint_category' => (string)($row['complaint_category'] ?? ''),
        'sitio' => (string)($row['sitio'] ?? ''),
        'respondent_name' => $row['respondent_name'] ?? null,
        'respondent_address' => $row['respondent_address'] ?? null,
        'description' => (string)($row['description'] ?? ''),
        'witness' => $row['witness'] ?? null,
        'evidence_path' => $row['evidence_path'] ?? null,
        'evidence_mime' => $row['evidence_mime'] ?? null,
        'status' => (string)($row['status'] ?? ''),
        'created_at' => $row['created_at'] ?? null,
    ];
};
if ($all) {
    if ($status !== '' && $status !== 'ALL') {
        $stmt = $conn->prepare('SELECT c.id, c.resident_id, c.tracking_number, c.case_number, c.complaint_title, c.complaint_type, c.complaint_category, c.sitio, c.respondent_name, c.respondent_address, c.description, c.witness, c.evidence_path, c.evidence_mime, c.status, c.created_at, r.fname AS resident_fname, r.midname AS resident_midname, r.lname AS resident_lname FROM complaints c LEFT JOIN resident_user r ON c.resident_id = r.id WHERE c.status = ? ORDER BY c.created_at DESC');
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
                $appendComplaint($row);
            }
        }

        $stmt->close();
    } else {
        $result = $conn->query('SELECT c.id, c.resident_id, c.tracking_number, c.case_number, c.complaint_title, c.complaint_type, c.complaint_category, c.sitio, c.respondent_name, c.respondent_address, c.description, c.witness, c.evidence_path, c.evidence_mime, c.status, c.created_at, r.fname AS resident_fname, r.midname AS resident_midname, r.lname AS resident_lname FROM complaints c LEFT JOIN resident_user r ON c.resident_id = r.id ORDER BY c.created_at DESC');
        if (!$result) {
            $conn->close();
            api_send_json(500, [
                'ok' => false,
                'error' => 'Query failed',
            ]);
        }

        while ($row = $result->fetch_assoc()) {
            $appendComplaint($row);
        }

        $result->free();
    }
} elseif ($status !== '' && $status !== 'ALL') {
    $stmt = $conn->prepare('SELECT c.id, c.resident_id, c.tracking_number, c.case_number, c.complaint_title, c.complaint_type, c.complaint_category, c.sitio, c.respondent_name, c.respondent_address, c.description, c.witness, c.evidence_path, c.evidence_mime, c.status, c.created_at, r.fname AS resident_fname, r.midname AS resident_midname, r.lname AS resident_lname FROM complaints c LEFT JOIN resident_user r ON c.resident_id = r.id WHERE c.resident_id = ? AND c.status = ? ORDER BY c.created_at DESC');
    if (!$stmt) {
        $conn->close();
        api_send_json(500, [
            'ok' => false,
            'error' => 'Query prepare failed',
        ]);
    }

    $stmt->bind_param('is', $residentId, $status);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $appendComplaint($row);
        }
    }

    $stmt->close();
} else {
    $stmt = $conn->prepare('SELECT c.id, c.resident_id, c.tracking_number, c.case_number, c.complaint_title, c.complaint_type, c.complaint_category, c.sitio, c.respondent_name, c.respondent_address, c.description, c.witness, c.evidence_path, c.evidence_mime, c.status, c.created_at, r.fname AS resident_fname, r.midname AS resident_midname, r.lname AS resident_lname FROM complaints c LEFT JOIN resident_user r ON c.resident_id = r.id WHERE c.resident_id = ? ORDER BY c.created_at DESC');
    if (!$stmt) {
        $conn->close();
        api_send_json(500, [
            'ok' => false,
            'error' => 'Query prepare failed',
        ]);
    }

    $stmt->bind_param('i', $residentId);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $appendComplaint($row);
        }
    }

    $stmt->close();
}

$conn->close();

api_send_json(200, [
    'ok' => true,
    'complaints' => $complaints,
]);
