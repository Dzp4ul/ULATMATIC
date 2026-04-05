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

$fname = trim((string)($_POST['fname'] ?? ''));
$midname = trim((string)($_POST['midname'] ?? ''));
$lname = trim((string)($_POST['lname'] ?? ''));
$suffix = trim((string)($_POST['suffix'] ?? ''));
$email = trim((string)($_POST['email'] ?? ''));
$phone = trim((string)($_POST['phone'] ?? ''));
$gender = trim((string)($_POST['gender'] ?? ''));
$sitio = trim((string)($_POST['sitio'] ?? ''));
$userPass = trim((string)($_POST['user_pass'] ?? ''));

if ($fname === '' || $email === '' || $phone === '' || $gender === '' || $sitio === '' || $userPass === '') {
    api_send_json(400, [
        'ok' => false,
        'error' => 'Missing required fields',
    ]);
}

if (!preg_match('/^\+639\d{9}$/', $phone)) {
    api_send_json(400, [
        'ok' => false,
        'error' => 'Phone number must start with +639 and contain 10 digits.',
    ]);
}

if (!preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/', $userPass)) {
    api_send_json(400, [
        'ok' => false,
        'error' => 'Password must include uppercase, lowercase, number, and symbol.',
    ]);
}

if (!isset($_FILES['front_id']) || !isset($_FILES['back_id'])) {
    api_send_json(400, [
        'ok' => false,
        'error' => 'ID uploads are required',
    ]);
}

if (!isset($_FILES['selfie'])) {
    api_send_json(400, [
        'ok' => false,
        'error' => 'Selfie photo is required for face verification',
    ]);
}

$front = $_FILES['front_id'];
$back = $_FILES['back_id'];
$selfie = $_FILES['selfie'];

$frontError = $front['error'] ?? UPLOAD_ERR_NO_FILE;
$backError = $back['error'] ?? UPLOAD_ERR_NO_FILE;
$selfieError = $selfie['error'] ?? UPLOAD_ERR_NO_FILE;

if ($frontError !== UPLOAD_ERR_OK || $backError !== UPLOAD_ERR_OK || $selfieError !== UPLOAD_ERR_OK) {
    $errorMessages = [
        UPLOAD_ERR_INI_SIZE => 'File exceeds server upload limit',
        UPLOAD_ERR_FORM_SIZE => 'File exceeds form upload limit',
        UPLOAD_ERR_PARTIAL => 'File was only partially uploaded',
        UPLOAD_ERR_NO_FILE => 'No file was uploaded',
        UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder',
        UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
        UPLOAD_ERR_EXTENSION => 'File upload stopped by extension',
    ];
    
    $errors = [];
    if ($frontError !== UPLOAD_ERR_OK) $errors[] = 'Front ID: ' . ($errorMessages[$frontError] ?? 'Unknown error');
    if ($backError !== UPLOAD_ERR_OK) $errors[] = 'Back ID: ' . ($errorMessages[$backError] ?? 'Unknown error');
    if ($selfieError !== UPLOAD_ERR_OK) $errors[] = 'Selfie: ' . ($errorMessages[$selfieError] ?? 'Unknown error');
    
    api_send_json(400, [
        'ok' => false,
        'error' => 'Failed to upload files: ' . implode(', ', $errors),
    ]);
}

$maxFileSize = 5 * 1024 * 1024; // 5 MB
if (($front['size'] ?? 0) > $maxFileSize || ($back['size'] ?? 0) > $maxFileSize || ($selfie['size'] ?? 0) > $maxFileSize) {
    api_send_json(400, [
        'ok' => false,
        'error' => 'Each file must be under 5MB',
    ]);
}

$allowedIdMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
foreach ([&$front, &$back, &$selfie] as &$uploadedFile) {
    $tmp = (string)($uploadedFile['tmp_name'] ?? '');
    if ($tmp !== '' && function_exists('mime_content_type')) {
        $detected = @mime_content_type($tmp);
        if (is_string($detected) && !in_array($detected, $allowedIdMimes, true)) {
            api_send_json(400, [
                'ok' => false,
                'error' => 'ID and selfie uploads must be images (jpg, png, webp, gif)',
            ]);
        }
    }
}
unset($uploadedFile);

$uploadsDir = realpath(__DIR__ . '/../..');
if ($uploadsDir === false) {
    api_send_json(500, [
        'ok' => false,
        'error' => 'Server path error',
    ]);
}

$uploadsRelDir = 'uploads/resident_ids';
$uploadsAbsDir = $uploadsDir . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'resident_ids';
if (!is_dir($uploadsAbsDir)) {
    if (!@mkdir($uploadsAbsDir, 0755, true)) {
        api_send_json(500, [
            'ok' => false,
            'error' => 'Failed to create uploads directory. Please contact administrator.',
        ]);
    }
}

if (!is_writable($uploadsAbsDir)) {
    api_send_json(500, [
        'ok' => false,
        'error' => 'Uploads directory is not writable. Please contact administrator.',
    ]);
}

$sanitize = static function (string $value): string {
    $value = strtolower(trim($value));
    $value = preg_replace('/[^a-z0-9_\-\.]+/i', '_', $value);
    return $value === '' ? 'file' : $value;
};

$frontExt = strtolower(pathinfo((string)($front['name'] ?? ''), PATHINFO_EXTENSION));
$backExt = strtolower(pathinfo((string)($back['name'] ?? ''), PATHINFO_EXTENSION));
$selfieExt = strtolower(pathinfo((string)($selfie['name'] ?? ''), PATHINFO_EXTENSION));

$frontExt = $frontExt !== '' ? $frontExt : 'bin';
$backExt = $backExt !== '' ? $backExt : 'bin';
$selfieExt = $selfieExt !== '' ? $selfieExt : 'jpg';

$tag = $sanitize($email) . '_' . bin2hex(random_bytes(6));
$frontFilename = 'front_' . $tag . '.' . $frontExt;
$backFilename = 'back_' . $tag . '.' . $backExt;
$selfieFilename = 'selfie_' . $tag . '.' . $selfieExt;

$frontAbs = $uploadsAbsDir . DIRECTORY_SEPARATOR . $frontFilename;
$backAbs = $uploadsAbsDir . DIRECTORY_SEPARATOR . $backFilename;
$selfieAbs = $uploadsAbsDir . DIRECTORY_SEPARATOR . $selfieFilename;

if (!move_uploaded_file((string)$front['tmp_name'], $frontAbs) || !move_uploaded_file((string)$back['tmp_name'], $backAbs) || !move_uploaded_file((string)$selfie['tmp_name'], $selfieAbs)) {
    api_send_json(500, [
        'ok' => false,
        'error' => 'Failed to save uploaded files',
    ]);
}

$frontPath = $uploadsRelDir . '/' . $frontFilename;
$backPath = $uploadsRelDir . '/' . $backFilename;
$selfiePath = $uploadsRelDir . '/' . $selfieFilename;

$conn = api_db();
api_ensure_resident_user_schema($conn);

$stmtCheck = $conn->prepare('SELECT id, status FROM resident_user WHERE email = ? LIMIT 1');
if (!$stmtCheck) {
    $conn->close();
    api_send_json(500, [
        'ok' => false,
        'error' => 'Query prepare failed',
    ]);
}

$stmtCheck->bind_param('s', $email);
$stmtCheck->execute();
$res = $stmtCheck->get_result();
$existing = $res ? $res->fetch_assoc() : null;
$stmtCheck->close();

if ($existing && (string)($existing['status'] ?? '') !== 'DECLINED') {
    $conn->close();
    api_send_json(409, [
        'ok' => false,
        'error' => 'Email already registered',
    ]);
}

$hashed = password_hash($userPass, PASSWORD_DEFAULT);

if ($existing) {
    $id = (int)($existing['id'] ?? 0);
    $status = 'PENDING';
    $approvedAt = null;
    $declinedAt = null;

    $stmt = $conn->prepare(
        'UPDATE resident_user SET fname = ?, midname = ?, lname = ?, suffix = ?, phone = ?, gender = ?, sitio = ?, user_pass = ?, front_id = ?, back_id = ?, selfie_photo = ?, status = ?, approved_at = ?, declined_at = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?'
    );

    if (!$stmt) {
        $conn->close();
        api_send_json(500, [
            'ok' => false,
            'error' => 'Update failed',
        ]);
    }

    $stmt->bind_param('sssssssssssssii', $fname, $midname, $lname, $suffix, $phone, $gender, $sitio, $hashed, $frontPath, $backPath, $selfiePath, $status, $approvedAt, $declinedAt, $id);
    $stmt->execute();
    $stmt->close();
    $conn->close();

    api_send_json(200, [
        'ok' => true,
        'message' => 'Registration submitted for approval',
        'status' => 'PENDING',
        'id' => $id,
    ]);
}

$status = 'PENDING';
$stmt = $conn->prepare(
    'INSERT INTO resident_user (fname, midname, lname, suffix, email, phone, gender, sitio, user_pass, front_id, back_id, selfie_photo, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
);
if (!$stmt) {
    $conn->close();
    api_send_json(500, [
        'ok' => false,
        'error' => 'Insert failed',
    ]);
}

$stmt->bind_param('sssssssssssss', $fname, $midname, $lname, $suffix, $email, $phone, $gender, $sitio, $hashed, $frontPath, $backPath, $selfiePath, $status);
$stmt->execute();
$id = $stmt->insert_id;
$stmt->close();
$conn->close();

api_send_json(200, [
    'ok' => true,
    'message' => 'Registration submitted for approval',
    'status' => 'PENDING',
    'id' => (int)$id,
]);
