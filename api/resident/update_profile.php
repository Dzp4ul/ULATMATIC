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
$fname = trim((string)($body['fname'] ?? ''));
$midname = trim((string)($body['midname'] ?? ''));
$lname = trim((string)($body['lname'] ?? ''));
$email = trim((string)($body['email'] ?? ''));
$phone = trim((string)($body['phone'] ?? ''));
$gender = trim((string)($body['gender'] ?? ''));
$sitio = trim((string)($body['sitio'] ?? ''));
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

$stmt = $conn->prepare('SELECT fname, midname, lname, email, phone, gender, sitio, front_id, back_id, user_pass, profile_photo FROM resident_user WHERE id = ? LIMIT 1');
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

        $uploadsRoot = realpath(__DIR__ . '/../..');
        if ($uploadsRoot === false) {
            $conn->close();
            api_send_json(500, [
                'ok' => false,
                'error' => 'Server path error',
            ]);
        }

        $uploadsRelDir = 'uploads/profiles/resident';
        $uploadsAbsDir = $uploadsRoot . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'profiles' . DIRECTORY_SEPARATOR . 'resident';
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

$uploadsRoot = realpath(__DIR__ . '/../..');
if ($uploadsRoot === false) {
    $conn->close();
    api_send_json(500, [
        'ok' => false,
        'error' => 'Server path error',
    ]);
}

$uploadsRelDir = 'uploads/resident_ids';
$uploadsAbsDir = $uploadsRoot . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'resident_ids';
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
        $abs = $uploadsAbsDir . DIRECTORY_SEPARATOR . $filename;

        if (!move_uploaded_file($tmp, $abs)) {
            $conn->close();
            api_send_json(500, [
                'ok' => false,
                'error' => 'Failed to save front ID',
            ]);
        }

        $frontIdPath = $uploadsRelDir . '/' . $filename;
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
        $abs = $uploadsAbsDir . DIRECTORY_SEPARATOR . $filename;

        if (!move_uploaded_file($tmp, $abs)) {
            $conn->close();
            api_send_json(500, [
                'ok' => false,
                'error' => 'Failed to save back ID',
            ]);
        }

        $backIdPath = $uploadsRelDir . '/' . $filename;
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
