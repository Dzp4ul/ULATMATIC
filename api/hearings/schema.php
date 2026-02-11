<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/db.php';

function api_ensure_hearing_schema(mysqli $conn): void
{
    $sql = "CREATE TABLE IF NOT EXISTS hearing_schedules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        complaint_id INT NOT NULL,
        scheduled_date DATE NOT NULL,
        scheduled_time TIME NOT NULL,
        location VARCHAR(255) NOT NULL,
        notes TEXT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
        resolution_type VARCHAR(30) NULL,
        resolution_method VARCHAR(30) NULL,
        resolution_notes TEXT NULL,
        resolved_at TIMESTAMP NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

    if (!$conn->query($sql)) {
        error_log("Failed to create hearing_schedules table: " . $conn->error);
    }

    // Add resolution columns if table already exists
    $cols = ['resolution_type' => 'VARCHAR(30) NULL', 'resolution_method' => 'VARCHAR(30) NULL', 'resolution_notes' => 'TEXT NULL', 'resolved_at' => 'TIMESTAMP NULL'];
    foreach ($cols as $col => $def) {
        $res = $conn->query("SHOW COLUMNS FROM hearing_schedules LIKE '$col'");
        if ($res && $res->num_rows === 0) {
            $conn->query("ALTER TABLE hearing_schedules ADD COLUMN $col $def");
        }
        if ($res) $res->free();
    }
}
