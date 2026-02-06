<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/db.php';
require_once __DIR__ . '/user_schema.php';

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

$body = $_POST;
if (!$body) {
    $body = api_read_json_body();
}

$id = (int)($body['id'] ?? 0);
$secName = trim((string)($body['sec_name'] ?? ''));
$secEmail = trim((string)($body['sec_email'] ?? ''));
$removePhoto = (string)($body['remove_photo'] ?? '') === '1';

if ($id <= 0) {
    api_send_json(400, [
        'ok' => false,
        'error' => 'id is required',
    ]);
}

$conn = api_db();
api_ensure_secretary_user_schema($conn);

$stmt = $conn->prepare('SELECT sec_name, sec_email, profile_photo FROM sec_user WHERE id = ? LIMIT 1');
if (!$stmt) {
    $conn->close();
    api_send_json(500, [
        'ok' => false,
        'error' => 'Query prepare failed',
    ]);
}

$stmt->bind_param('i', $id);
$stmt->execute();
$result = $stmt->get_result();
$existing = $result ? $result->fetch_assoc() : null;
$stmt->close();

if (!$existing) {
    $conn->close();
    api_send_json(404, [
        'ok' => false,
        'error' => 'User not found',
    ]);
}

$secName = $secName !== '' ? $secName : (string)($existing['sec_name'] ?? '');
$secEmail = $secEmail !== '' ? $secEmail : (string)($existing['sec_email'] ?? '');
$profilePath = $existing['profile_photo'] ?? null;

if ($removePhoto) {
    $profilePath = null;
}

if (isset($_FILES['profile_photo']) && is_array($_FILES['profile_photo'])) {
    $file = $_FILES['profile_photo'];
    $err = (int)($file['error'] ?? UPLOAD_ERR_NO_FILE);

    if ($err !== UPLOAD_ERR_NO_FILE) {
        if ($err !== UPLOAD_ERR_OK) {
            $conn->close();
            api_send_json(400, [
                'ok' => false,
                'error' => 'Failed to upload profile photo',
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
        ];

        if ($mime !== '' && !in_array($mime, $allowed, true)) {
            $conn->close();
            api_send_json(400, [
                'ok' => false,
                'error' => 'Profile photo must be an image (jpg, png, webp, gif)',
            ]);
        }

        $uploadsRoot = realpath(__DIR__ . '/../..');
        if ($uploadsRoot === false) {
            $conn->close();
            api_send_json(500, [
                'ok' => false,
                'error' => 'Server path error',
            ]);
        }

        $uploadsRelDir = 'uploads/profiles/secretary';
        $uploadsAbsDir = $uploadsRoot . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'profiles' . DIRECTORY_SEPARATOR . 'secretary';
        if (!is_dir($uploadsAbsDir)) {
            @mkdir($uploadsAbsDir, 0777, true);
        }

        if (!is_dir($uploadsAbsDir)) {
            $conn->close();
            api_send_json(500, [
                'ok' => false,
                'error' => 'Failed to create uploads directory',
            ]);
        }

        $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
        $ext = $ext !== '' ? $ext : 'jpg';
        $filename = 'profile_' . $id . '_' . bin2hex(random_bytes(6)) . '.' . $ext;
        $abs = $uploadsAbsDir . DIRECTORY_SEPARATOR . $filename;

        if (!move_uploaded_file($tmp, $abs)) {
            $conn->close();
            api_send_json(500, [
                'ok' => false,
                'error' => 'Failed to save profile photo',
            ]);
        }

        $profilePath = $uploadsRelDir . '/' . $filename;
    }
}

$stmt = $conn->prepare('UPDATE sec_user SET sec_name = ?, sec_email = ?, profile_photo = ? WHERE id = ?');
if (!$stmt) {
    $conn->close();
    api_send_json(500, [
        'ok' => false,
        'error' => 'Update prepare failed',
    ]);
}

$stmt->bind_param('sssi', $secName, $secEmail, $profilePath, $id);
$stmt->execute();
$stmt->close();
$conn->close();

api_send_json(200, [
    'ok' => true,
    'user' => [
        'id' => $id,
        'sec_name' => $secName,
        'sec_email' => $secEmail,
        'profile_photo' => $profilePath,
        'role' => 'SECRETARY',
    ],
]);
