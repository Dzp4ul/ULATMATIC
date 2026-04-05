<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';

api_apply_cors();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    api_send_json(405, [
        'ok' => false,
        'error' => 'Method not allowed',
    ]);
}

$toBytes = static function (string $value): int {
    $value = trim($value);
    if ($value === '') {
        return 0;
    }

    $unit = strtolower($value[strlen($value) - 1]);
    $number = (float)$value;

    return match ($unit) {
        'g' => (int)round($number * 1024 * 1024 * 1024),
        'm' => (int)round($number * 1024 * 1024),
        'k' => (int)round($number * 1024),
        default => (int)round((float)$value),
    };
};

$uploadMaxRaw = (string)ini_get('upload_max_filesize');
$postMaxRaw = (string)ini_get('post_max_size');
$uploadMaxBytes = $toBytes($uploadMaxRaw);
$postMaxBytes = $toBytes($postMaxRaw);

$appPerFileLimitBytes = 5 * 1024 * 1024;
$effectivePerFileLimitBytes = $uploadMaxBytes > 0
    ? min($appPerFileLimitBytes, $uploadMaxBytes)
    : $appPerFileLimitBytes;

// Keep a small safety margin below server hard limit.
$recommendedClientLimitBytes = (int)floor($effectivePerFileLimitBytes * 0.9);
if ($recommendedClientLimitBytes < 512 * 1024) {
    $recommendedClientLimitBytes = $effectivePerFileLimitBytes;
}

api_send_json(200, [
    'ok' => true,
    'upload_max_filesize' => $uploadMaxRaw,
    'post_max_size' => $postMaxRaw,
    'max_file_uploads' => (string)ini_get('max_file_uploads'),
    'upload_max_filesize_bytes' => $uploadMaxBytes,
    'post_max_size_bytes' => $postMaxBytes,
    'app_per_file_limit_bytes' => $appPerFileLimitBytes,
    'effective_per_file_limit_bytes' => $effectivePerFileLimitBytes,
    'recommended_client_limit_bytes' => $recommendedClientLimitBytes,
]);
