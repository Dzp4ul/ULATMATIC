<?php

declare(strict_types=1);

function api_ensure_incident_schema(mysqli $conn): void
{
    $sql = "CREATE TABLE IF NOT EXISTS incidents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        resident_id INT NULL,
        incident_type VARCHAR(120) NOT NULL,
        incident_category VARCHAR(120) NOT NULL,
        sitio VARCHAR(120) NOT NULL,
        description TEXT NOT NULL,
        witness VARCHAR(200) NULL,
        evidence_path VARCHAR(255) NULL,
        evidence_mime VARCHAR(120) NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP NULL DEFAULT NULL,
        transferred_at TIMESTAMP NULL DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

    $conn->query($sql);
}
