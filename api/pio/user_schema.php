<?php

declare(strict_types=1);
require_once __DIR__ . '/../shared/db.php';

function api_ensure_pio_user_schema(mysqli $conn): void
{
    $sql = "CREATE TABLE IF NOT EXISTS pio_user (
        id INT AUTO_INCREMENT PRIMARY KEY,
        pio_name VARCHAR(255) NOT NULL,
        pio_email VARCHAR(255) NOT NULL,
        pio_pass VARCHAR(255) NOT NULL,
        profile_photo VARCHAR(255) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_pio_email (pio_email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

    $conn->query($sql);

    $needsProfilePhoto = false;
    $res = $conn->query("SHOW COLUMNS FROM pio_user LIKE 'profile_photo'");
    if ($res) {
        $needsProfilePhoto = $res->num_rows === 0;
        $res->free();
    }

    if ($needsProfilePhoto) {
        $conn->query("ALTER TABLE pio_user ADD COLUMN profile_photo VARCHAR(255) NULL");
    }
}
