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

if (!preg_match('/^\+63\d{9}$/', $phone)) {
    api_send_json(400, [
        'ok' => false,
        'error' => 'Phone number must start with +63 and contain 9 digits.',
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

$front = $_FILES['front_id'];
$back = $_FILES['back_id'];

if (($front['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK || ($back['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
    api_send_json(400, [
        'ok' => false,
        'error' => 'Failed to upload ID files',
    ]);
}

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

$frontExt = strtolower(pathinfo((string)($front['name'] ?? ''), PATHINFO_EXTENSION));
$backExt = strtolower(pathinfo((string)($back['name'] ?? ''), PATHINFO_EXTENSION));

$frontExt = $frontExt !== '' ? $frontExt : 'bin';
$backExt = $backExt !== '' ? $backExt : 'bin';

$tag = $sanitize($email) . '_' . bin2hex(random_bytes(6));
$frontFilename = 'front_' . $tag . '.' . $frontExt;
$backFilename = 'back_' . $tag . '.' . $backExt;

$frontAbs = $uploadsAbsDir . DIRECTORY_SEPARATOR . $frontFilename;
$backAbs = $uploadsAbsDir . DIRECTORY_SEPARATOR . $backFilename;

if (!move_uploaded_file((string)$front['tmp_name'], $frontAbs) || !move_uploaded_file((string)$back['tmp_name'], $backAbs)) {
    api_send_json(500, [
        'ok' => false,
        'error' => 'Failed to save uploaded files',
    ]);
}

$frontPath = $uploadsRelDir . '/' . $frontFilename;
$backPath = $uploadsRelDir . '/' . $backFilename;

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
        'UPDATE resident_user SET fname = ?, midname = ?, lname = ?, phone = ?, gender = ?, sitio = ?, user_pass = ?, front_id = ?, back_id = ?, status = ?, approved_at = ?, declined_at = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?'
    );

    if (!$stmt) {
        $conn->close();
        api_send_json(500, [
            'ok' => false,
            'error' => 'Update failed',
        ]);
    }

    $stmt->bind_param('sssssssssssii', $fname, $midname, $lname, $phone, $gender, $sitio, $hashed, $frontPath, $backPath, $status, $approvedAt, $declinedAt, $id);
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
    'INSERT INTO resident_user (fname, midname, lname, email, phone, gender, sitio, user_pass, front_id, back_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
);
if (!$stmt) {
    $conn->close();
    api_send_json(500, [
        'ok' => false,
        'error' => 'Insert failed',
    ]);
}

$stmt->bind_param('sssssssssss', $fname, $midname, $lname, $email, $phone, $gender, $sitio, $hashed, $frontPath, $backPath, $status);
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
