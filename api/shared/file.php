<?php

declare(strict_types=1);

require_once __DIR__ . '/storage.php';

api_apply_cors();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Method not allowed';
    exit;
}

$key = api_storage_normalize_key((string)($_GET['key'] ?? ''));
if ($key === '' || !str_starts_with($key, 'uploads/')) {
    http_response_code(400);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Invalid file key';
    exit;
}

$file = api_storage_fetch_db_file($key);
if ($file !== null) {
    header('Content-Type: ' . $file['content_type']);
    if ((int)$file['file_size'] > 0) {
        header('Content-Length: ' . (int)$file['file_size']);
    }
    header('Cache-Control: public, max-age=31536000, immutable');
    echo $file['data'];
    exit;
}

$localPath = api_storage_local_path($key);
if ($localPath !== null && is_file($localPath) && is_readable($localPath)) {
    $mime = 'application/octet-stream';
    if (function_exists('mime_content_type')) {
        $detected = @mime_content_type($localPath);
        if (is_string($detected) && $detected !== '') {
            $mime = $detected;
        }
    }

    header('Content-Type: ' . $mime);
    header('Content-Length: ' . (string)filesize($localPath));
    header('Cache-Control: public, max-age=31536000, immutable');
    readfile($localPath);
    exit;
}

http_response_code(404);
header('Content-Type: text/plain; charset=utf-8');
echo 'File not found';
