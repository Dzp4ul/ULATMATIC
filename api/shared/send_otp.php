<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/mailer_config.php';
require_once __DIR__ . '/email_template.php';

use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\PHPMailer;

function api_send_otp_error(int $statusCode, string $publicMessage, string $logMessage = ''): void
{
    if ($logMessage !== '') {
        error_log('[send_otp] ' . $logMessage);
    }

    api_send_json($statusCode, [
        'ok' => false,
        'error' => $publicMessage,
    ]);
}

function api_vendor_dir_candidates(): array
{
    $candidates = [];

    $fromEnv = trim((string)(getenv('COMPOSER_VENDOR_DIR') ?: ''));
    if ($fromEnv !== '') {
        $candidates[] = rtrim($fromEnv, "/\\");
    }

    $candidates[] = __DIR__ . '/../../vendor';

    // Fallback: if app root is mounted one level differently in runtime.
    $candidates[] = dirname(__DIR__, 3) . '/vendor';

    $existing = [];
    foreach ($candidates as $dir) {
        if ($dir === '') {
            continue;
        }
        $real = realpath($dir);
        if ($real !== false && is_dir($real) && !in_array($real, $existing, true)) {
            $existing[] = $real;
        }
    }

    return $existing;
}

function api_bootstrap_phpmailer(): bool
{
    $vendorDirs = api_vendor_dir_candidates();

    foreach ($vendorDirs as $vendorDir) {
        $autoloadPath = $vendorDir . '/autoload.php';
        if (is_file($autoloadPath)) {
            require_once $autoloadPath;
        }
        if (class_exists(PHPMailer::class)) {
            return true;
        }
    }

    // Fallback for deployments where Composer autoload exists but package map is incomplete.
    foreach ($vendorDirs as $vendorDir) {
        $mailerSrc = $vendorDir . '/phpmailer/phpmailer/src';
        $requiredFiles = [
            $mailerSrc . '/Exception.php',
            $mailerSrc . '/PHPMailer.php',
            $mailerSrc . '/SMTP.php',
        ];

        $allPresent = true;
        foreach ($requiredFiles as $file) {
            if (!is_file($file)) {
                $allPresent = false;
                break;
            }
        }
        if (!$allPresent) {
            continue;
        }

        foreach ($requiredFiles as $file) {
            require_once $file;
        }

        if (class_exists(PHPMailer::class)) {
            return true;
        }
    }

    return false;
}

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

try {
    if (!api_bootstrap_phpmailer()) {
        api_send_otp_error(
            500,
            'OTP service unavailable. Mailer dependency missing.',
            'PHPMailer not loadable from vendor dirs: ' . implode(', ', api_vendor_dir_candidates())
        );
    }

    $body = api_read_json_body();
    $email = trim((string)($body['email'] ?? ''));

    if ($email === '') {
        api_send_otp_error(400, 'Email is required');
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        api_send_otp_error(400, 'Invalid email address');
    }

    try {
        $otp = (string)random_int(100000, 999999);
    } catch (Throwable $e) {
        api_send_otp_error(500, 'Failed to generate OTP', 'OTP generation failed: ' . $e->getMessage());
    }

    $otpHash = password_hash($otp, PASSWORD_DEFAULT);
    $expiresAt = (new DateTimeImmutable('now'))->modify('+10 minutes')->format('Y-m-d H:i:s');

    $conn = api_db();

    $tableReady = $conn->query(
        "CREATE TABLE IF NOT EXISTS email_otps (\n"
            . "  email VARCHAR(255) NOT NULL PRIMARY KEY,\n"
            . "  otp_hash VARCHAR(255) NOT NULL,\n"
            . "  expires_at DATETIME NOT NULL,\n"
            . "  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,\n"
            . "  attempts INT NOT NULL DEFAULT 0\n"
            . ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );
    if ($tableReady === false) {
        $dbErr = $conn->error;
        $conn->close();
        api_send_otp_error(500, 'OTP service unavailable. Please try again.', 'OTP table init failed: ' . $dbErr);
    }

    $stmt = $conn->prepare(
        'INSERT INTO email_otps (email, otp_hash, expires_at, attempts) VALUES (?, ?, ?, 0) '
            . 'ON DUPLICATE KEY UPDATE otp_hash = VALUES(otp_hash), expires_at = VALUES(expires_at), attempts = 0'
    );

    if (!$stmt) {
        $dbErr = $conn->error;
        $conn->close();
        api_send_otp_error(500, 'OTP save failed', 'OTP prepare failed: ' . $dbErr);
    }

    $stmt->bind_param('sss', $email, $otpHash, $expiresAt);
    if (!$stmt->execute()) {
        $dbErr = $stmt->error;
        $stmt->close();
        $conn->close();
        api_send_otp_error(500, 'OTP save failed', 'OTP save execute failed: ' . $dbErr);
    }
    $stmt->close();
    $conn->close();

    $config = api_mailer_config();
    if (
        trim((string)($config['host'] ?? '')) === '' ||
        trim((string)($config['username'] ?? '')) === '' ||
        trim((string)($config['password'] ?? '')) === '' ||
        trim((string)($config['from_email'] ?? '')) === ''
    ) {
        api_send_otp_error(500, 'Mail server is not configured');
    }

    $mail = new PHPMailer(true);
    $secure = strtolower(trim((string)($config['secure'] ?? 'tls')));
    $allowSelfSigned = filter_var((string)(getenv('MAIL_ALLOW_SELF_SIGNED') ?: '0'), FILTER_VALIDATE_BOOLEAN);

    $mail->isSMTP();
    $mail->Host = $config['host'];
    $mail->SMTPAuth = true;
    $mail->Username = $config['username'];
    $mail->Password = $config['password'];
    $mail->Port = (int)$config['port'];
    $mail->Timeout = 10;
    $mail->SMTPKeepAlive = false;
    $mail->CharSet = 'UTF-8';

    if ($secure === '' || $secure === 'none' || $secure === 'off' || $secure === '0') {
        $mail->SMTPSecure = false;
        $mail->SMTPAutoTLS = false;
    } elseif ($secure === 'ssl' || $secure === 'smtps') {
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
    } else {
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    }

    if ($allowSelfSigned) {
        $mail->SMTPOptions = [
            'ssl' => [
                'verify_peer' => false,
                'verify_peer_name' => false,
                'allow_self_signed' => true,
            ],
        ];
    }

    $mail->setFrom($config['from_email'], $config['from_name']);
    $mail->addAddress($email);

    $mail->isHTML(true);
    $mail->Subject = 'ULATMATIC - Email Verification Code';
    $mail->Body = api_otp_email($otp);
    $mail->AltBody = "Your ULATMATIC verification code is: $otp. This code expires in 10 minutes.";

    // Embed logo image for email display
    $logoPath = __DIR__ . '/../../uploads/logo.png';
    if (file_exists($logoPath)) {
        $mail->addEmbeddedImage($logoPath, 'logo', 'logo.png');
    }

    $mail->send();

    api_send_json(200, [
        'ok' => true,
        'message' => 'OTP sent',
    ]);
} catch (Exception $e) {
    $mailError = isset($mail) ? (string)$mail->ErrorInfo : '';
    api_send_otp_error(502, 'Unable to send OTP email. Please try again.', 'Mail exception: ' . $mailError . ' | ' . $e->getMessage());
} catch (Throwable $e) {
    api_send_otp_error(500, 'OTP service failed. Please try again.', 'Unexpected fatal: ' . $e->getMessage());
}
