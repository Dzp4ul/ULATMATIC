<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/db.php';

function api_ensure_complaint_schema(mysqli $conn): void
{
    $sql = "CREATE TABLE IF NOT EXISTS complaints (
        id INT AUTO_INCREMENT PRIMARY KEY,
        resident_id INT NOT NULL,
        tracking_number VARCHAR(40) NULL,
        case_number VARCHAR(20) NULL,
        complaint_title VARCHAR(255) NOT NULL,
        complaint_type VARCHAR(120) NULL,
        complaint_category VARCHAR(120) NOT NULL,
        sitio VARCHAR(120) NULL,
        respondent_name VARCHAR(255) NULL,
        respondent_address VARCHAR(255) NULL,
        description TEXT NOT NULL,
        witness VARCHAR(500) NULL,
        evidence_path VARCHAR(255) NULL,
        evidence_mime VARCHAR(120) NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_tracking_number (tracking_number),
        UNIQUE KEY uniq_case_number (case_number)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

    $conn->query($sql);

    $needsTrackingNumber = false;
    $res = $conn->query("SHOW COLUMNS FROM complaints LIKE 'tracking_number'");
    if ($res) {
        $needsTrackingNumber = $res->num_rows === 0;
        $res->free();
    }

    if ($needsTrackingNumber) {
        $conn->query("ALTER TABLE complaints ADD COLUMN tracking_number VARCHAR(40) NULL AFTER resident_id");
    }

    $needsCaseNumber = false;
    $res = $conn->query("SHOW COLUMNS FROM complaints LIKE 'case_number'");
    if ($res) {
        $needsCaseNumber = $res->num_rows === 0;
        $res->free();
    }

    if ($needsCaseNumber) {
        $conn->query("ALTER TABLE complaints ADD COLUMN case_number VARCHAR(20) NULL AFTER tracking_number");
    }

    $needsTitle = false;
    $res = $conn->query("SHOW COLUMNS FROM complaints LIKE 'complaint_title'");
    if ($res) {
        $needsTitle = $res->num_rows === 0;
        $res->free();
    }

    if ($needsTitle) {
        $conn->query("ALTER TABLE complaints ADD COLUMN complaint_title VARCHAR(255) NOT NULL DEFAULT '' AFTER resident_id");
    }

    $needsRespondentName = false;
    $res = $conn->query("SHOW COLUMNS FROM complaints LIKE 'respondent_name'");
    if ($res) {
        $needsRespondentName = $res->num_rows === 0;
        $res->free();
    }

    if ($needsRespondentName) {
        $conn->query("ALTER TABLE complaints ADD COLUMN respondent_name VARCHAR(255) NULL AFTER sitio");
    }

    $needsRespondentAddress = false;
    $respondentAddressNullable = false;
    $res = $conn->query("SHOW COLUMNS FROM complaints LIKE 'respondent_address'");
    if ($res) {
        if ($res->num_rows === 0) {
            $needsRespondentAddress = true;
        } else {
            $column = $res->fetch_assoc();
            $respondentAddressNullable = (($column['Null'] ?? '') === 'YES');
        }
        $res->free();
    }

    if ($needsRespondentAddress) {
        $conn->query("ALTER TABLE complaints ADD COLUMN respondent_address VARCHAR(255) NULL AFTER respondent_name");
    } elseif (!$respondentAddressNullable) {
        $conn->query("ALTER TABLE complaints MODIFY COLUMN respondent_address VARCHAR(255) NULL");
    }

    $needsTrackingIndex = false;
    $res = $conn->query("SHOW INDEX FROM complaints WHERE Key_name = 'uniq_tracking_number'");
    if ($res) {
        $needsTrackingIndex = $res->num_rows === 0;
        $res->free();
    }

    if ($needsTrackingIndex) {
        $conn->query("ALTER TABLE complaints ADD UNIQUE KEY uniq_tracking_number (tracking_number)");
    }

    $needsCaseIndex = false;
    $res = $conn->query("SHOW INDEX FROM complaints WHERE Key_name = 'uniq_case_number'");
    if ($res) {
        $needsCaseIndex = $res->num_rows === 0;
        $res->free();
    }

    if ($needsCaseIndex) {
        $conn->query("ALTER TABLE complaints ADD UNIQUE KEY uniq_case_number (case_number)");
    }

    // Make complaint_type nullable (no longer required)
    $res = $conn->query("SHOW COLUMNS FROM complaints LIKE 'complaint_type'");
    if ($res && $res->num_rows > 0) {
        $col = $res->fetch_assoc();
        if (($col['Null'] ?? '') !== 'YES') {
            $conn->query("ALTER TABLE complaints MODIFY COLUMN complaint_type VARCHAR(120) NULL");
        }
        $res->free();
    }

    // Make sitio nullable (no longer required)
    $res = $conn->query("SHOW COLUMNS FROM complaints LIKE 'sitio'");
    if ($res && $res->num_rows > 0) {
        $col = $res->fetch_assoc();
        if (($col['Null'] ?? '') !== 'YES') {
            $conn->query("ALTER TABLE complaints MODIFY COLUMN sitio VARCHAR(120) NULL");
        }
        $res->free();
    }

    // Increase witness column size for multiple witnesses
    $res = $conn->query("SHOW COLUMNS FROM complaints LIKE 'witness'");
    if ($res && $res->num_rows > 0) {
        $col = $res->fetch_assoc();
        if (strpos(strtolower($col['Type'] ?? ''), '500') === false) {
            $conn->query("ALTER TABLE complaints MODIFY COLUMN witness VARCHAR(500) NULL");
        }
        $res->free();
    }
}
