<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/db.php';

function api_ensure_superadmin_user_schema(mysqli $conn): void
{
    $sql = "CREATE TABLE IF NOT EXISTS superadmin_user (
        id INT AUTO_INCREMENT PRIMARY KEY,
        superadmin_name VARCHAR(255) NOT NULL,
        superadmin_email VARCHAR(255) NOT NULL,
        superadmin_pass VARCHAR(255) NOT NULL,
        profile_photo VARCHAR(512) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_superadmin_email (superadmin_email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

    $conn->query($sql);

    $needsProfilePhoto = false;
    $res = $conn->query("SHOW COLUMNS FROM superadmin_user LIKE 'profile_photo'");
    if ($res) {
        $needsProfilePhoto = $res->num_rows === 0;
        $res->free();
    }

    if ($needsProfilePhoto) {
        $conn->query("ALTER TABLE superadmin_user ADD COLUMN profile_photo VARCHAR(512) NULL");
    } else {
        $res = $conn->query("SHOW COLUMNS FROM superadmin_user LIKE 'profile_photo'");
        if ($res) {
            $col = $res->fetch_assoc();
            if ($col && stripos((string)($col['Type'] ?? ''), 'varchar(512)') === false) {
                $conn->query("ALTER TABLE superadmin_user MODIFY COLUMN profile_photo VARCHAR(512) NULL");
            }
            $res->free();
        }
    }

    $res2 = $conn->query("SHOW COLUMNS FROM superadmin_user LIKE 'status'");
    if ($res2 && $res2->num_rows === 0) {
        $conn->query("ALTER TABLE superadmin_user ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active'");
    }
    if ($res2) $res2->free();
}
