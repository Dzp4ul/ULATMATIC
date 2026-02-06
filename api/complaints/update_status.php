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
$id = (int)($body['id'] ?? 0);
$action = strtoupper(trim((string)($body['action'] ?? '')));

if ($id <= 0) {
    api_send_json(400, [
        'ok' => false,
        'error' => 'id is required',
    ]);
}

if (!in_array($action, ['ACCEPT', 'DECLINE'], true)) {
    api_send_json(400, [
        'ok' => false,
        'error' => 'action must be ACCEPT or DECLINE',
    ]);
}

$conn = api_db();
api_ensure_complaint_schema($conn);

if ($action === 'DECLINE') {
    $stmt = $conn->prepare("UPDATE complaints SET status = 'CANCELLED' WHERE id = ? AND status = 'PENDING'");
    if (!$stmt) {
        $conn->close();
        api_send_json(500, [
            'ok' => false,
            'error' => 'Query prepare failed',
        ]);
    }

    $stmt->bind_param('i', $id);
    $stmt->execute();
    $affected = $stmt->affected_rows;
    $stmt->close();
    $conn->close();

    if ($affected <= 0) {
        api_send_json(404, [
            'ok' => false,
            'error' => 'Complaint not found or not pending',
        ]);
    }

    api_send_json(200, [
        'ok' => true,
        'id' => $id,
        'status' => 'CANCELLED',
    ]);
}

$conn->begin_transaction();

try {
    $status = null;
    $stmt = $conn->prepare('SELECT status FROM complaints WHERE id = ? FOR UPDATE');
    if (!$stmt) {
        throw new RuntimeException('Query prepare failed');
    }

    $stmt->bind_param('i', $id);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result) {
        $row = $result->fetch_assoc();
        $status = $row['status'] ?? null;
        $result->free();
    }
    $stmt->close();

    if ($status === null) {
        throw new RuntimeException('Complaint not found');
    }

    if (strtoupper((string)$status) !== 'PENDING') {
        throw new RuntimeException('Complaint not pending');
    }

    $year = date('Y');
    $prefix = $year . '-';
    $like = $prefix . '%';
    $lastNumber = 0;

    $stmt = $conn->prepare('SELECT case_number FROM complaints WHERE case_number LIKE ? ORDER BY case_number DESC LIMIT 1 FOR UPDATE');
    if (!$stmt) {
        throw new RuntimeException('Query prepare failed');
    }

    $stmt->bind_param('s', $like);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result) {
        $row = $result->fetch_assoc();
        if ($row && isset($row['case_number'])) {
            $raw = (string)$row['case_number'];
            if (strpos($raw, $prefix) === 0) {
                $lastNumber = (int)substr($raw, strlen($prefix));
            }
        }
        $result->free();
    }
    $stmt->close();

    $nextNumber = $lastNumber + 1;
    $caseNumber = sprintf('%s%04d', $prefix, $nextNumber);

    $stmt = $conn->prepare("UPDATE complaints SET status = 'IN_PROGRESS', case_number = ? WHERE id = ? AND status = 'PENDING'");
    if (!$stmt) {
        throw new RuntimeException('Query prepare failed');
    }

    $stmt->bind_param('si', $caseNumber, $id);
    $stmt->execute();
    $affected = $stmt->affected_rows;
    $stmt->close();

    if ($affected <= 0) {
        throw new RuntimeException('Complaint not found or not pending');
    }

    $conn->commit();
    $conn->close();

    api_send_json(200, [
        'ok' => true,
        'id' => $id,
        'status' => 'IN_PROGRESS',
        'case_number' => $caseNumber,
    ]);
} catch (Throwable $e) {
    $conn->rollback();
    $conn->close();
    api_send_json(500, [
        'ok' => false,
        'error' => $e->getMessage(),
    ]);
}
