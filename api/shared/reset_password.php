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
$newPassword = trim((string)($body['new_password'] ?? ''));

if ($email === '' || $otp === '' || $newPassword === '') {
    api_send_json(400, [
        'ok' => false,
        'error' => 'Email, OTP, and new password are required',
    ]);
}

if (!preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/', $newPassword)) {
    api_send_json(400, [
        'ok' => false,
        'error' => 'Password must include uppercase, lowercase, number, and symbol.',
    ]);
}

$conn = api_db();

$conn->query(
    "CREATE TABLE IF NOT EXISTS password_reset_otps (\n"
        . "  email VARCHAR(255) NOT NULL PRIMARY KEY,\n"
        . "  otp_hash VARCHAR(255) NOT NULL,\n"
        . "  expires_at DATETIME NOT NULL,\n"
        . "  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,\n"
        . "  attempts INT NOT NULL DEFAULT 0\n"
        . ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
);

// Verify OTP
$stmt = $conn->prepare('SELECT otp_hash, expires_at, attempts FROM password_reset_otps WHERE email = ? LIMIT 1');
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

$expiresAt = new DateTimeImmutable((string)$row['expires_at']);
$now = new DateTimeImmutable('now');

if ($now > $expiresAt) {
    $conn->close();
    api_send_json(400, [
        'ok' => false,
        'error' => 'OTP has expired. Please request a new one.',
    ]);
}

$otpHash = (string)($row['otp_hash'] ?? '');
if (!password_verify($otp, $otpHash)) {
    // Increment attempts
    $conn->query("UPDATE password_reset_otps SET attempts = attempts + 1 WHERE email = '" . $conn->real_escape_string($email) . "'");
    $conn->close();
    api_send_json(400, [
        'ok' => false,
        'error' => 'Invalid OTP. Please try again.',
    ]);
}

// OTP verified — update password in all relevant tables
$hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
$updated = false;

$tableConfig = [
    ['table' => 'resident_user', 'email_col' => 'email', 'pass_col' => 'user_pass'],
    ['table' => 'secretary_user', 'email_col' => 'sec_email', 'pass_col' => 'sec_pass'],
    ['table' => 'captain_user', 'email_col' => 'cap_email', 'pass_col' => 'cap_pass'],
    ['table' => 'chief_user', 'email_col' => 'chief_email', 'pass_col' => 'chief_pass'],
    ['table' => 'pio_user', 'email_col' => 'pio_email', 'pass_col' => 'pio_pass'],
];

foreach ($tableConfig as $cfg) {
    $table = $cfg['table'];
    $emailCol = $cfg['email_col'];
    $passCol = $cfg['pass_col'];

    $check = $conn->query("SHOW TABLES LIKE '$table'");
    if (!$check || $check->num_rows === 0) continue;

    $stmt = $conn->prepare("UPDATE $table SET $passCol = ? WHERE $emailCol = ?");
    if (!$stmt) continue;

    $stmt->bind_param('ss', $hashedPassword, $email);
    $stmt->execute();

    if ($stmt->affected_rows > 0) {
        $updated = true;
    }
    $stmt->close();
}

// Delete the used OTP
$conn->query("DELETE FROM password_reset_otps WHERE email = '" . $conn->real_escape_string($email) . "'");
$conn->close();

if (!$updated) {
    api_send_json(404, [
        'ok' => false,
        'error' => 'No account found with this email.',
    ]);
}

api_send_json(200, [
    'ok' => true,
    'message' => 'Password has been reset successfully.',
]);
