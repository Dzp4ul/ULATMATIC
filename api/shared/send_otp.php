<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/mailer_config.php';

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

$autoload = __DIR__ . '/../../vendor/autoload.php';
if (!file_exists($autoload)) {
    api_send_json(500, [
        'ok' => false,
        'error' => 'PHPMailer not found. Please run composer install in ULATMATIC root.',
    ]);
}

require_once $autoload;

use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\PHPMailer;

$body = api_read_json_body();
$email = trim((string)($body['email'] ?? ''));

if ($email === '') {
    api_send_json(400, [
        'ok' => false,
        'error' => 'Email is required',
    ]);
}

$otp = (string)random_int(100000, 999999);
$otpHash = password_hash($otp, PASSWORD_DEFAULT);
$expiresAt = (new DateTimeImmutable('now'))->modify('+10 minutes')->format('Y-m-d H:i:s');

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

$stmt = $conn->prepare(
    'INSERT INTO email_otps (email, otp_hash, expires_at, attempts) VALUES (?, ?, ?, 0) '
        . 'ON DUPLICATE KEY UPDATE otp_hash = VALUES(otp_hash), expires_at = VALUES(expires_at), attempts = 0'
);

if (!$stmt) {
    $conn->close();
    api_send_json(500, [
        'ok' => false,
        'error' => 'OTP save failed',
    ]);
}

$stmt->bind_param('sss', $email, $otpHash, $expiresAt);
$stmt->execute();
$stmt->close();
$conn->close();

$config = api_mailer_config();

$mail = new PHPMailer(true);

try {
    $mail->isSMTP();
    $mail->Host = $config['host'];
    $mail->SMTPAuth = true;
    $mail->Username = $config['username'];
    $mail->Password = $config['password'];
    $mail->SMTPSecure = $config['secure'];
    $mail->Port = (int)$config['port'];

    $mail->setFrom($config['from_email'], $config['from_name']);
    $mail->addAddress($email);

    $mail->isHTML(true);
    $mail->Subject = 'OTP Verification';
    $mail->Body = 'Your OTP is <b>' . $otp . '</b>';

    $mail->send();

    api_send_json(200, [
        'ok' => true,
        'message' => 'OTP sent',
    ]);
} catch (Exception $e) {
    api_send_json(500, [
        'ok' => false,
        'error' => 'Mailer Error: ' . $mail->ErrorInfo,
    ]);
}
