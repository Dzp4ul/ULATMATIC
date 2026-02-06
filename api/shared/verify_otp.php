<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';

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

$body = api_read_json_body();
$email = trim((string)($body['email'] ?? ''));
$otp = trim((string)($body['otp'] ?? ''));

if ($email === '' || $otp === '') {
    api_send_json(400, [
        'ok' => false,
        'error' => 'Email and OTP are required',
    ]);
}

$conn = api_db();

$conn->query(
    "CREATE TABLE IF NOT EXISTS email_otps (\n"
        . "  email VARCHAR(255) NOT NULL PRIMARY KEY,\n"
        . "  otp_hash VARCHAR(255) NOT NULL,\n"
        . "  expires_at DATETIME NOT NULL,\n"
        . "  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,\n"
        . "  attempts INT NOT NULL DEFAULT 0\n"
        . ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
);

$stmt = $conn->prepare('SELECT otp_hash, expires_at, attempts FROM email_otps WHERE email = ? LIMIT 1');
if (!$stmt) {
    $conn->close();
    api_send_json(500, [
        'ok' => false,
        'error' => 'Query prepare failed',
    ]);
}

$stmt->bind_param('s', $email);
$stmt->execute();
$result = $stmt->get_result();
$row = $result ? $result->fetch_assoc() : null;
$stmt->close();

if (!$row) {
    $conn->close();
    api_send_json(400, [
        'ok' => false,
        'error' => 'OTP not found. Please request a new OTP.',
    ]);
}

$attempts = (int)($row['attempts'] ?? 0);
if ($attempts >= 5) {
    $conn->close();
    api_send_json(429, [
        'ok' => false,
        'error' => 'Too many attempts. Please request a new OTP.',
    ]);
}

$expiresAt = (string)($row['expires_at'] ?? '');
$now = (new DateTimeImmutable('now'))->format('Y-m-d H:i:s');

if ($expiresAt !== '' && $expiresAt < $now) {
    $conn->close();
    api_send_json(400, [
        'ok' => false,
        'error' => 'OTP expired. Please request a new OTP.',
    ]);
}

$hash = (string)($row['otp_hash'] ?? '');
$valid = $hash !== '' && password_verify($otp, $hash);

if (!$valid) {
    $stmt2 = $conn->prepare('UPDATE email_otps SET attempts = attempts + 1 WHERE email = ?');
    if ($stmt2) {
        $stmt2->bind_param('s', $email);
        $stmt2->execute();
        $stmt2->close();
    }

    $conn->close();
    api_send_json(401, [
        'ok' => false,
        'error' => 'Invalid OTP',
    ]);
}

$stmt3 = $conn->prepare('DELETE FROM email_otps WHERE email = ?');
if ($stmt3) {
    $stmt3->bind_param('s', $email);
    $stmt3->execute();
    $stmt3->close();
}

$conn->close();

api_send_json(200, [
    'ok' => true,
    'message' => 'OTP verified',
]);
