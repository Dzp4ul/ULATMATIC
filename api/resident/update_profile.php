<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/db.php';
require_once __DIR__ . '/../shared/storage.php';
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
$fname = trim((string)($body['fname'] ?? ''));
$midname = trim((string)($body['midname'] ?? ''));
$lname = trim((string)($body['lname'] ?? ''));
$email = trim((string)($body['email'] ?? ''));
$phone = trim((string)($body['phone'] ?? ''));
$gender = trim((string)($body['gender'] ?? ''));
$sitio = trim((string)($body['sitio'] ?? ''));
$currentPassword = trim((string)($body['current_password'] ?? ''));
$userPass = trim((string)($body['user_pass'] ?? ''));
$removePhoto = (string)($body['remove_photo'] ?? '') === '1';

if ($id <= 0) {
    api_send_json(400, [
        'ok' => false,
        'error' => 'id is required',
    ]);
}

$conn = api_db();
api_ensure_resident_user_schema($conn);

$stmt = $conn->prepare('SELECT fname, midname, lname, email, phone, gender, sitio, front_id, back_id, user_pass, profile_photo, selfie_photo FROM resident_user WHERE id = ? LIMIT 1');
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

$fname = $fname !== '' ? $fname : (string)($existing['fname'] ?? '');
$midname = $midname !== '' ? $midname : (string)($existing['midname'] ?? '');
$lname = $lname !== '' ? $lname : (string)($existing['lname'] ?? '');
$email = $email !== '' ? $email : (string)($existing['email'] ?? '');
$phone = $phone !== '' ? $phone : (string)($existing['phone'] ?? '');
$gender = $gender !== '' ? $gender : (string)($existing['gender'] ?? '');
$sitio = $sitio !== '' ? $sitio : (string)($existing['sitio'] ?? '');
$frontIdPath = (string)($existing['front_id'] ?? '');
$backIdPath = (string)($existing['back_id'] ?? '');
$profilePath = $existing['profile_photo'] ?? null;
$storedPass = (string)($existing['user_pass'] ?? '');
$hashedPass = $storedPass;

if ($userPass !== '') {
    if ($currentPassword === '') {
        $conn->close();
        api_send_json(400, [
            'ok' => false,
            'error' => 'Current password is required to change password.',
        ]);
    }

    if (!password_verify($currentPassword, $storedPass)) {
        $conn->close();
        api_send_json(401, [
            'ok' => false,
            'error' => 'Current password is incorrect.',
        ]);
    }

    if (!preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/', $userPass)) {
        $conn->close();
        api_send_json(400, [
            'ok' => false,
            'error' => 'Password must include uppercase, lowercase, number, and symbol.',
        ]);
    }

    $hashedPass = password_hash($userPass, PASSWORD_DEFAULT);
}

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

        $uploadsRelDir = 'uploads/profiles/resident';
        $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
        $ext = $ext !== '' ? $ext : 'jpg';
        $filename = 'profile_' . $id . '_' . bin2hex(random_bytes(6)) . '.' . $ext;

        $savedPath = api_storage_save_uploaded_file($tmp, $uploadsRelDir . '/' . $filename, $mime !== '' ? $mime : 'image/jpeg');
        if ($savedPath === null) {
            $conn->close();
            api_send_json(500, [
                'ok' => false,
                'error' => 'Failed to save profile photo',
            ]);
        }

        $profilePath = $savedPath;
    }
}

$uploadsRelDir = 'uploads/resident_ids';

$allowedIdTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
];

if (isset($_FILES['front_id']) && is_array($_FILES['front_id'])) {
    $file = $_FILES['front_id'];
    $err = (int)($file['error'] ?? UPLOAD_ERR_NO_FILE);
    if ($err !== UPLOAD_ERR_NO_FILE) {
        if ($err !== UPLOAD_ERR_OK) {
            $conn->close();
            api_send_json(400, [
                'ok' => false,
                'error' => 'Failed to upload front ID',
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

        if ($mime !== '' && !in_array($mime, $allowedIdTypes, true)) {
            $conn->close();
            api_send_json(400, [
                'ok' => false,
                'error' => 'Front ID must be an image (jpg, png, webp, gif)',
            ]);
        }

        $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
        $ext = $ext !== '' ? $ext : 'jpg';
        $filename = 'front_id_' . $id . '_' . bin2hex(random_bytes(6)) . '.' . $ext;

        $savedPath = api_storage_save_uploaded_file($tmp, $uploadsRelDir . '/' . $filename, $mime !== '' ? $mime : 'image/jpeg');
        if ($savedPath === null) {
            $conn->close();
            api_send_json(500, [
                'ok' => false,
                'error' => 'Failed to save front ID',
            ]);
        }

        $frontIdPath = $savedPath;
    }
}

if (isset($_FILES['back_id']) && is_array($_FILES['back_id'])) {
    $file = $_FILES['back_id'];
    $err = (int)($file['error'] ?? UPLOAD_ERR_NO_FILE);
    if ($err !== UPLOAD_ERR_NO_FILE) {
        if ($err !== UPLOAD_ERR_OK) {
            $conn->close();
            api_send_json(400, [
                'ok' => false,
                'error' => 'Failed to upload back ID',
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

        if ($mime !== '' && !in_array($mime, $allowedIdTypes, true)) {
            $conn->close();
            api_send_json(400, [
                'ok' => false,
                'error' => 'Back ID must be an image (jpg, png, webp, gif)',
            ]);
        }

        $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
        $ext = $ext !== '' ? $ext : 'jpg';
        $filename = 'back_id_' . $id . '_' . bin2hex(random_bytes(6)) . '.' . $ext;

        $savedPath = api_storage_save_uploaded_file($tmp, $uploadsRelDir . '/' . $filename, $mime !== '' ? $mime : 'image/jpeg');
        if ($savedPath === null) {
            $conn->close();
            api_send_json(500, [
                'ok' => false,
                'error' => 'Failed to save back ID',
            ]);
        }

        $backIdPath = $savedPath;
    }
}

$stmt = $conn->prepare('UPDATE resident_user SET fname = ?, midname = ?, lname = ?, email = ?, phone = ?, gender = ?, sitio = ?, front_id = ?, back_id = ?, user_pass = ?, profile_photo = ? WHERE id = ?');
if (!$stmt) {
    $conn->close();
    api_send_json(500, [
        'ok' => false,
        'error' => 'Update prepare failed',
    ]);
}

$stmt->bind_param('sssssssssssi', $fname, $midname, $lname, $email, $phone, $gender, $sitio, $frontIdPath, $backIdPath, $hashedPass, $profilePath, $id);
$stmt->execute();
$stmt->close();

$stmtFetch = $conn->prepare('SELECT profile_photo, selfie_photo FROM resident_user WHERE id = ? LIMIT 1');
if ($stmtFetch) {
    $stmtFetch->bind_param('i', $id);
    $stmtFetch->execute();
    $fetchResult = $stmtFetch->get_result();
    $fetchedUser = $fetchResult ? $fetchResult->fetch_assoc() : null;
    $stmtFetch->close();
    if ($fetchedUser) {
        $profilePath = $fetchedUser['profile_photo'] ?? null;
        if (!$profilePath) {
            $profilePath = $fetchedUser['selfie_photo'] ?? null;
        }
    }
}
$conn->close();

api_send_json(200, [
    'ok' => true,
    'user' => [
        'id' => $id,
        'fname' => $fname,
        'midname' => $midname,
        'lname' => $lname,
        'email' => $email,
        'phone' => $phone,
        'gender' => $gender,
        'sitio' => $sitio,
        'front_id' => $frontIdPath,
        'back_id' => $backIdPath,
        'profile_photo' => $profilePath,
        'role' => 'RESIDENT',
    ],
]);
