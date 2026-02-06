<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/db.php';

function api_ensure_secretary_user_schema(mysqli $conn): void
{
    $sql = "CREATE TABLE IF NOT EXISTS sec_user (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sec_name VARCHAR(255) NOT NULL,
        sec_email VARCHAR(255) NOT NULL,
        sec_pass VARCHAR(255) NOT NULL,
        profile_photo VARCHAR(255) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_sec_email (sec_email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

    $conn->query($sql);

    $needsProfilePhoto = false;
    $res = $conn->query("SHOW COLUMNS FROM sec_user LIKE 'profile_photo'");
    if ($res) {
        $needsProfilePhoto = $res->num_rows === 0;
        $res->free();
    }

    if ($needsProfilePhoto) {
        $conn->query("ALTER TABLE sec_user ADD COLUMN profile_photo VARCHAR(255) NULL");
    }
}
