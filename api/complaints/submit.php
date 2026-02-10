<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/db.php';
require_once __DIR__ . '/schema.php';

api_apply_cors();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    api_send_json(405, [
        'ok' => false,
        'error' => 'Method not allowed',
    ]);
}


$residentId = (int)($_POST['resident_id'] ?? 0);
$complaintTitle = trim((string)($_POST['complaint_title'] ?? ''));
$complaintType = trim((string)($_POST['complaint_type'] ?? ''));
$complaintCategory = trim((string)($_POST['complaint_category'] ?? ''));
$sitio = trim((string)($_POST['sitio'] ?? ''));
$respondentName = trim((string)($_POST['respondent_name'] ?? ''));
$respondentAddress = trim((string)($_POST['respondent_address'] ?? ''));
$description = trim((string)($_POST['description'] ?? ''));
$witness = trim((string)($_POST['witness'] ?? ''));

if (
    $residentId <= 0
    || $complaintTitle === ''
    || $complaintCategory === ''
    || $description === ''
) {
    api_send_json(400, [
        'ok' => false,
        'error' => 'Missing required fields',
    ]);
}

$evidencePath = null;
$evidenceMime = null;

if (isset($_FILES['evidence']) && is_array($_FILES['evidence'])) {
    $file = $_FILES['evidence'];
    $err = (int)($file['error'] ?? UPLOAD_ERR_NO_FILE);

    if ($err !== UPLOAD_ERR_NO_FILE) {
        if ($err !== UPLOAD_ERR_OK) {
            api_send_json(400, [
                'ok' => false,
                'error' => 'Failed to upload evidence file',
            ]);
        }

        $tmp = (string)($file['tmp_name'] ?? '');
        $origName = (string)($file['name'] ?? '');

        $mime = (string)($file['type'] ?? '');
        if ($mime === '' && $tmp !== '' && function_exists('mime_content_type')) {
            $detected = @mime_content_type($tmp);
            if (is_string($detected)) {
                $mime = $detected;
            }
        }

        $allowed = [
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/gif',
            'video/mp4',
            'video/webm',
            'video/quicktime',
        ];

        if ($mime !== '' && !in_array($mime, $allowed, true)) {
            api_send_json(400, [
                'ok' => false,
                'error' => 'Evidence must be an image or video (jpg, png, webp, gif, mp4, webm, mov)',
            ]);
        }

        $uploadsRoot = realpath(__DIR__ . '/../..');
        if ($uploadsRoot === false) {
            api_send_json(500, [
                'ok' => false,
                'error' => 'Server path error',
            ]);
        }

        $uploadsRelDir = 'uploads/complaints';
        $uploadsAbsDir = $uploadsRoot . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'complaints';
        if (!is_dir($uploadsAbsDir)) {
            @mkdir($uploadsAbsDir, 0777, true);
        }

        if (!is_dir($uploadsAbsDir)) {
            api_send_json(500, [
                'ok' => false,
                'error' => 'Failed to create uploads directory',
            ]);
        }

        $sanitize = static function (string $value): string {
            $value = strtolower(trim($value));
            $value = preg_replace('/[^a-z0-9_\-\.]+/i', '_', $value);
            return $value === '' ? 'file' : $value;
        };

        $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
        $ext = $ext !== '' ? $ext : 'bin';

        $tag = 'rid' . $residentId . '_' . bin2hex(random_bytes(6));
        $filename = $sanitize('evidence_' . $tag) . '.' . $ext;
        $abs = $uploadsAbsDir . DIRECTORY_SEPARATOR . $filename;

        if (!move_uploaded_file($tmp, $abs)) {
            api_send_json(500, [
                'ok' => false,
                'error' => 'Failed to save evidence file',
            ]);
        }

        $evidencePath = $uploadsRelDir . '/' . $filename;
        $evidenceMime = $mime !== '' ? $mime : null;
    }
}

$conn = api_db();
api_ensure_complaint_schema($conn);

$trackingNumber = null;
for ($attempt = 0; $attempt < 5; $attempt++) {
    try {
        $rand = bin2hex(random_bytes(3));
    } catch (Throwable $e) {
        $rand = '';
    }

    if ($rand === '') {
        break;
    }

    $candidate = 'CMP-' . date('Ymd') . '-' . strtoupper($rand);
    $check = $conn->prepare('SELECT id FROM complaints WHERE tracking_number = ? LIMIT 1');
    if (!$check) {
        $conn->close();
        api_send_json(500, [
            'ok' => false,
            'error' => 'Tracking check failed',
        ]);
    }

    $check->bind_param('s', $candidate);
    $check->execute();
    $result = $check->get_result();
    $exists = $result ? $result->fetch_assoc() : null;
    $check->close();

    if (!$exists) {
        $trackingNumber = $candidate;
        break;
    }
}

if ($trackingNumber === null) {
    $conn->close();
    api_send_json(500, [
        'ok' => false,
        'error' => 'Failed to generate tracking number',
    ]);
}

$status = 'PENDING';
$respondentNameVal = $respondentName !== '' ? $respondentName : null;
$respondentAddressVal = $respondentAddress !== '' ? $respondentAddress : null;
$witnessVal = $witness !== '' ? $witness : null;
$complaintTypeVal = $complaintType !== '' ? $complaintType : null;
$sitioVal = $sitio !== '' ? $sitio : null;

$stmt = $conn->prepare('INSERT INTO complaints (resident_id, tracking_number, complaint_title, complaint_type, complaint_category, sitio, respondent_name, respondent_address, description, witness, evidence_path, evidence_mime, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
if (!$stmt) {
    $conn->close();
    api_send_json(500, [
        'ok' => false,
        'error' => 'Insert failed',
    ]);
}

$stmt->bind_param(
    'issssssssssss',
    $residentId,
    $trackingNumber,
    $complaintTitle,
    $complaintTypeVal,
    $complaintCategory,
    $sitioVal,
    $respondentNameVal,
    $respondentAddressVal,
    $description,
    $witnessVal,
    $evidencePath,
    $evidenceMime,
    $status
);

$stmt->execute();
$id = $stmt->insert_id;
$stmt->close();
$conn->close();

api_send_json(200, [
    'ok' => true,
    'id' => (int)$id,
    'tracking_number' => $trackingNumber,
    'status' => $status,
    'evidence_path' => $evidencePath,
]);
