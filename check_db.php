<?php
// CLI-only debug script. Block web access.
if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    exit('Forbidden');
}

require_once __DIR__ . '/api/shared/db.php';

$conn = api_db();

echo "=== Recent Incidents ===" . PHP_EOL;
$incidents = $conn->query('SELECT id, tracking_number, incident_type, incident_category, sitio, witness, status, created_at FROM incidents ORDER BY id DESC LIMIT 5');
while ($row = $incidents->fetch_assoc()) {
  echo 'ID: ' . $row['id'] . ' | Tracking: ' . $row['tracking_number'] . ' | Type: ' . $row['incident_type'] . ' | Sitio: ' . $row['sitio'] . ' | Status: ' . $row['status'] . PHP_EOL;
}

echo PHP_EOL . "=== Check Notifications Table ===" . PHP_EOL;
$table_check = $conn->query('SHOW TABLES LIKE "notifications"');
if ($table_check && $table_check->num_rows > 0) {
  $notif_count = $conn->query('SELECT COUNT(*) as count FROM notifications');
  $row = $notif_count->fetch_assoc();
  echo 'Notifications table exists with ' . $row['count'] . ' records' . PHP_EOL;

  echo PHP_EOL . "=== Recent Notifications ===" . PHP_EOL;
  $notifs = $conn->query('SELECT id, user_id, user_role, title, message, type, is_read, created_at FROM notifications ORDER BY id DESC LIMIT 10');
  while ($n = $notifs->fetch_assoc()) {
    echo 'ID: ' . $n['id'] . ' | User(' . $n['user_role'] . '): ' . $n['user_id'] . ' | Title: ' . $n['title'] . ' | Read: ' . $n['is_read'] . PHP_EOL;
  }
} else {
  echo 'Notifications table does NOT exist yet' . PHP_EOL;
}

$conn->close();
