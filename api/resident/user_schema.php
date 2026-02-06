<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/db.php';

function api_ensure_resident_user_schema(mysqli $conn): void
{
    $conn->query(
        "CREATE TABLE IF NOT EXISTS resident_user (\n"
            . "  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,\n"
            . "  fname VARCHAR(255) NOT NULL,\n"
            . "  midname VARCHAR(255) NULL,\n"
            . "  lname VARCHAR(255) NULL,\n"
            . "  email VARCHAR(255) NOT NULL,\n"
            . "  phone VARCHAR(20) NOT NULL,\n"
            . "  gender VARCHAR(20) NOT NULL,\n"
            . "  sitio VARCHAR(255) NOT NULL,\n"
            . "  user_pass VARCHAR(255) NOT NULL,\n"
            . "  front_id VARCHAR(255) NOT NULL,\n"
            . "  back_id VARCHAR(255) NOT NULL,\n"
            . "  profile_photo VARCHAR(255) NULL\n"
            . ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );

    $needsPhone = false;
    $res = $conn->query("SHOW COLUMNS FROM resident_user LIKE 'phone'");
    if ($res) {
        $needsPhone = $res->num_rows === 0;
        $res->free();
    }

    if ($needsPhone) {
        $conn->query("ALTER TABLE resident_user ADD COLUMN phone VARCHAR(20) NOT NULL DEFAULT '' AFTER email");
    }

    $needsGender = false;
    $res = $conn->query("SHOW COLUMNS FROM resident_user LIKE 'gender'");
    if ($res) {
        $needsGender = $res->num_rows === 0;
        $res->free();
    }

    if ($needsGender) {
        $conn->query("ALTER TABLE resident_user ADD COLUMN gender VARCHAR(20) NOT NULL DEFAULT '' AFTER phone");
    }

    $needsStatus = false;
    $res = $conn->query("SHOW COLUMNS FROM resident_user LIKE 'status'");
    if ($res) {
        $needsStatus = $res->num_rows === 0;
        $res->free();
    }

    if ($needsStatus) {
        $conn->query("ALTER TABLE resident_user ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'PENDING'");
    }

    $needsCreatedAt = false;
    $res = $conn->query("SHOW COLUMNS FROM resident_user LIKE 'created_at'");
    if ($res) {
        $needsCreatedAt = $res->num_rows === 0;
        $res->free();
    }

    if ($needsCreatedAt) {
        $conn->query("ALTER TABLE resident_user ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP");
    }

    $needsApprovedAt = false;
    $res = $conn->query("SHOW COLUMNS FROM resident_user LIKE 'approved_at'");
    if ($res) {
        $needsApprovedAt = $res->num_rows === 0;
        $res->free();
    }

    if ($needsApprovedAt) {
        $conn->query("ALTER TABLE resident_user ADD COLUMN approved_at DATETIME NULL");
    }

    $needsDeclinedAt = false;
    $res = $conn->query("SHOW COLUMNS FROM resident_user LIKE 'declined_at'");
    if ($res) {
        $needsDeclinedAt = $res->num_rows === 0;
        $res->free();
    }

    if ($needsDeclinedAt) {
        $conn->query("ALTER TABLE resident_user ADD COLUMN declined_at DATETIME NULL");
    }

    $needsProfilePhoto = false;
    $res = $conn->query("SHOW COLUMNS FROM resident_user LIKE 'profile_photo'");
    if ($res) {
        $needsProfilePhoto = $res->num_rows === 0;
        $res->free();
    }

    if ($needsProfilePhoto) {
        $conn->query("ALTER TABLE resident_user ADD COLUMN profile_photo VARCHAR(255) NULL");
    }
}
