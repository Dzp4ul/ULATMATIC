<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/db.php';

/**
 * Ensure notifications table exists
 */
function ensure_notifications_schema(mysqli $conn): void
{
    $sql = "CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        user_role ENUM('resident','secretary','captain','chief','pio') NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type ENUM('complaint','incident','hearing','resident','system') NOT NULL DEFAULT 'system',
        reference_id INT DEFAULT NULL,
        is_read TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user (user_id, user_role, is_read),
        INDEX idx_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
    $conn->query($sql);
}

/**
 * Insert a notification for a specific user.
 */
function create_notification(
    mysqli $db,
    int $user_id,
    string $user_role,
    string $title,
    string $message,
    string $type = 'system',
    ?int $reference_id = null
): bool {
    ensure_notifications_schema($db);

    $allowed_roles = ['resident', 'secretary', 'captain', 'chief', 'pio'];
    $allowed_types = ['complaint', 'incident', 'hearing', 'resident', 'system'];

    if (!in_array($user_role, $allowed_roles, true)) return false;
    if (!in_array($type, $allowed_types, true)) return false;

    $stmt = $db->prepare(
        'INSERT INTO notifications (user_id, user_role, title, message, type, reference_id)
         VALUES (?, ?, ?, ?, ?, ?)'
    );
    if (!$stmt) return false;

    $stmt->bind_param('issssi', $user_id, $user_role, $title, $message, $type, $reference_id);
    $ok = $stmt->execute();
    $stmt->close();
    return $ok;
}

/**
 * Send a notification to ALL users of a given role.
 */
function notify_role(
    mysqli $db,
    string $user_role,
    string $title,
    string $message,
    string $type = 'system',
    ?int $reference_id = null,
    string $user_table = ''
): int {
    $table_map = [
        'resident' => 'residents',
        'secretary' => 'secretaries',
        'captain' => 'captains',
        'chief' => 'chiefs',
        'pio' => 'pios',
    ];

    $table = $user_table ?: ($table_map[$user_role] ?? '');
    if (!$table) return 0;

    $result = $db->query("SELECT id FROM `" . $db->real_escape_string($table) . "`");
    if (!$result) return 0;

    $count = 0;
    while ($row = $result->fetch_assoc()) {
        if (create_notification($db, (int) $row['id'], $user_role, $title, $message, $type, $reference_id)) {
            $count++;
        }
    }
    return $count;
}
