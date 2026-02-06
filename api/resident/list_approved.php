<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/db.php';
require_once __DIR__ . '/user_schema.php';

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

$conn = api_db();
api_ensure_resident_user_schema($conn);

$status = 'APPROVED';
$stmt = $conn->prepare('SELECT id, fname, midname, lname, email, sitio, front_id, back_id, status, created_at, approved_at FROM resident_user WHERE status = ? ORDER BY approved_at DESC, created_at DESC');
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
$rows = [];
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $rows[] = $row;
    }
}

$stmt->close();
$conn->close();

api_send_json(200, [
    'ok' => true,
    'residents' => $rows,
]);
