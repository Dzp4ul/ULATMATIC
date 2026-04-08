<?php
declare(strict_types=1);

require_once __DIR__ . '/../shared/db.php';

header('Content-Type: text/event-stream');
header('Cache-Control: no-cache');
header('Connection: keep-alive');
header('X-Accel-Buffering: no');
api_apply_cors();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$userType = trim((string)($_GET['user_type'] ?? ''));
$userId = (int)($_GET['user_id'] ?? 0);

if ($userType === '' || $userId <= 0) {
    echo "event: error\n";
    echo "data: {\"error\":\"Invalid parameters\"}\n\n";
    flush();
    exit;
}

$conn = api_db();
$lastCheck = time();

while (true) {
    if (connection_aborted()) break;
    
    $updates = [];
    
    // Check for new incidents (for chief & pio)
    if ($userType === 'chief' || $userType === 'pio') {
        $stmt = $conn->prepare("SELECT id, tracking_number, incident_type, sitio, created_at FROM incidents WHERE created_at > DATE_SUB(NOW(), INTERVAL 10 SECOND) ORDER BY created_at DESC LIMIT 5");
        if ($stmt) {
            $stmt->execute();
            $result = $stmt->get_result();
            while ($row = $result->fetch_assoc()) {
                $updates[] = [
                    'type' => 'incident',
                    'data' => $row
                ];
            }
            $stmt->close();
        }
    }
    
    // Check for new complaints (for secretary & captain)
    if ($userType === 'secretary' || $userType === 'captain') {
        $stmt = $conn->prepare("SELECT id, tracking_number, complaint_title, complaint_category, created_at FROM complaints WHERE created_at > DATE_SUB(NOW(), INTERVAL 10 SECOND) ORDER BY created_at DESC LIMIT 5");
        if ($stmt) {
            $stmt->execute();
            $result = $stmt->get_result();
            while ($row = $result->fetch_assoc()) {
                $updates[] = [
                    'type' => 'complaint',
                    'data' => $row
                ];
            }
            $stmt->close();
        }
    }
    
    if (!empty($updates)) {
        echo "event: update\n";
        echo "data: " . json_encode($updates) . "\n\n";
        flush();
    }
    
    // Send heartbeat every 15 seconds
    if (time() - $lastCheck >= 15) {
        echo "event: heartbeat\n";
        echo "data: {\"time\":" . time() . "}\n\n";
        flush();
        $lastCheck = time();
    }
    
    sleep(2);
}

$conn->close();
