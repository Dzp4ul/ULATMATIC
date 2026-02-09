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

$status = isset($_GET['status']) ? strtoupper(trim((string)$_GET['status'])) : null;
$resident_id = isset($_GET['resident_id']) ? (int)$_GET['resident_id'] : null;

$conn = api_db();
api_ensure_hearing_schema($conn);

$sql = "SELECT 
    h.id,
    h.complaint_id,
    h.scheduled_date,
    h.scheduled_time,
    h.location,
    h.notes,
    h.status,
    h.created_at,
    h.updated_at,
    c.tracking_number,
    c.case_number,
    c.complaint_title,
    c.complaint_type,
    c.resident_id
FROM hearing_schedules h
INNER JOIN complaints c ON h.complaint_id = c.id";

$params = [];
$types = '';
$where_clauses = [];

if ($status && in_array($status, ['PENDING', 'APPROVED', 'CANCELLED'], true)) {
    $where_clauses[] = "h.status = ?";
    $params[] = $status;
    $types .= 's';
}

if ($resident_id && $resident_id > 0) {
    $where_clauses[] = "c.resident_id = ?";
    $params[] = $resident_id;
    $types .= 'i';
}

if (!empty($where_clauses)) {
    $sql .= " WHERE " . implode(" AND ", $where_clauses);
}

$sql .= " ORDER BY h.scheduled_date ASC, h.scheduled_time ASC";

if (!empty($params)) {
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        $conn->close();
        api_send_json(500, [
            'ok' => false,
            'error' => 'Query prepare failed',
        ]);
    }
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $result = $stmt->get_result();
} else {
    $result = $conn->query($sql);
}

if (!$result) {
    $conn->close();
    api_send_json(500, [
        'ok' => false,
        'error' => 'Query execution failed',
    ]);
}

$hearings = [];
while ($row = $result->fetch_assoc()) {
    $hearings[] = $row;
}

if (!empty($params)) {
    $stmt->close();
}
$conn->close();

api_send_json(200, [
    'ok' => true,
    'hearings' => $hearings,
]);
