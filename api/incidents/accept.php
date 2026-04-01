<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/db.php';
require_once __DIR__ . '/schema.php';
require_once __DIR__ . '/../notifications/helpers.php';
require_once __DIR__ . '/../shared/email_notify.php';

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

$stmt = $conn->prepare("UPDATE incidents SET status = 'IN_PROGRESS' WHERE id = ? AND UPPER(status) = 'PENDING'");
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

if ($affected > 0) {
    $incRow = $conn->query("SELECT resident_id, incident_type, tracking_number FROM incidents WHERE id = $id")->fetch_assoc();
    if ($incRow && (int)$incRow['resident_id'] > 0) {
        $residentId = (int)$incRow['resident_id'];
        $incidentType = (string)($incRow['incident_type'] ?? '');
        $trackingNumber = (string)($incRow['tracking_number'] ?? '');
        $incidentLabel = $incidentType !== '' ? $incidentType : ($trackingNumber !== '' ? $trackingNumber : ('Incident #' . $id));

        create_notification(
            $conn,
            $residentId,
            'resident',
            'Incident Accepted',
            'Your incident report "' . $incidentLabel . '" is now on going.',
            'incident',
            $id
        );

        notify_incident_status($conn, $residentId, 'IN_PROGRESS', $incidentType, $trackingNumber);
    }
}

$conn->close();

if ($affected <= 0) {
    api_send_json(404, [
        'ok' => false,
        'error' => 'Incident not found or not pending',
    ]);
}

api_send_json(200, [
    'ok' => true,
    'id' => $id,
    'status' => 'IN_PROGRESS',
]);

