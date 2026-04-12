<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';

function api_storage_mode(): string
{
    $mode = strtolower(trim((string)(getenv('UPLOAD_STORAGE') ?: 'db')));
    return in_array($mode, ['db', 'local', 'spaces'], true) ? $mode : 'db';
}

function api_storage_normalize_key(string $key): string
{
    $key = str_replace('\\', '/', trim($key));
    $key = preg_replace('#/+#', '/', $key) ?? $key;
    return ltrim($key, '/');
}

function api_storage_is_spaces_enabled(): bool
{
    $mode = api_storage_mode();
    if ($mode === 'spaces') {
        return true;
    }

    return false;
}

function api_storage_is_db_enabled(): bool
{
    return api_storage_mode() === 'db';
}

function api_storage_public_url(string $key): string
{
    $key = api_storage_normalize_key($key);
    $encodedKey = implode('/', array_map('rawurlencode', explode('/', $key)));
    $publicBase = rtrim((string)(getenv('SPACES_PUBLIC_BASE_URL') ?: getenv('SPACES_CDN_ENDPOINT') ?: ''), '/');

    if ($publicBase !== '') {
        return $publicBase . '/' . $encodedKey;
    }

    $bucket = (string)(getenv('SPACES_BUCKET') ?: '');
    $region = (string)(getenv('SPACES_REGION') ?: 'sgp1');
    return 'https://' . $bucket . '.' . $region . '.digitaloceanspaces.com/' . $encodedKey;
}

function api_storage_db_url(string $key): string
{
    return 'api/shared/file.php?key=' . rawurlencode(api_storage_normalize_key($key));
}

function api_storage_local_path(string $key): ?string
{
    $key = api_storage_normalize_key($key);
    $root = realpath(__DIR__ . '/../..');
    if ($root === false) {
        return null;
    }

    return $root . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $key);
}

function api_storage_ensure_local_dir(string $key): ?string
{
    $abs = api_storage_local_path($key);
    if ($abs === null) {
        return null;
    }

    $dir = dirname($abs);
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }

    return is_dir($dir) ? $abs : null;
}

function api_storage_save_uploaded_file(string $tmpPath, string $key, string $contentType = 'application/octet-stream'): ?string
{
    $key = api_storage_normalize_key($key);
    if (api_storage_is_spaces_enabled()) {
        return api_storage_put_file($tmpPath, $key, $contentType);
    }

    if (api_storage_is_db_enabled()) {
        return api_storage_put_db_file($tmpPath, $key, $contentType);
    }

    $abs = api_storage_ensure_local_dir($key);
    if ($abs === null || !move_uploaded_file($tmpPath, $abs)) {
        return null;
    }

    return $key;
}

function api_storage_save_file(string $sourcePath, string $key, string $contentType = 'application/octet-stream'): ?string
{
    $key = api_storage_normalize_key($key);
    if (api_storage_is_spaces_enabled()) {
        return api_storage_put_file($sourcePath, $key, $contentType);
    }

    if (api_storage_is_db_enabled()) {
        return api_storage_put_db_file($sourcePath, $key, $contentType);
    }

    $abs = api_storage_ensure_local_dir($key);
    $sourceReal = realpath($sourcePath);
    $destReal = $abs !== null && is_file($abs) ? realpath($abs) : false;
    if ($sourceReal !== false && $destReal !== false && $sourceReal === $destReal) {
        return $key;
    }

    if ($abs === null || !copy($sourcePath, $abs)) {
        return null;
    }

    return $key;
}

function api_storage_ensure_db_schema(mysqli $conn): void
{
    $conn->query(
        "CREATE TABLE IF NOT EXISTS uploaded_files (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            storage_key VARCHAR(512) NOT NULL,
            content_type VARCHAR(120) NOT NULL DEFAULT 'application/octet-stream',
            file_size BIGINT UNSIGNED NOT NULL DEFAULT 0,
            data LONGBLOB NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_uploaded_files_storage_key (storage_key)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    );
}

function api_storage_put_db_file(string $sourcePath, string $key, string $contentType = 'application/octet-stream'): ?string
{
    if (!is_file($sourcePath) || !is_readable($sourcePath)) {
        error_log('DB upload failed: source file is not readable');
        return null;
    }

    $conn = api_db();
    api_storage_ensure_db_schema($conn);

    $key = api_storage_normalize_key($key);
    $size = filesize($sourcePath);
    $fileSize = $size === false ? 0 : (int)$size;
    $blob = null;

    $stmt = $conn->prepare(
        'INSERT INTO uploaded_files (storage_key, content_type, file_size, data)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            content_type = VALUES(content_type),
            file_size = VALUES(file_size),
            data = VALUES(data)'
    );
    if (!$stmt) {
        error_log('DB upload failed: prepare failed');
        $conn->close();
        return null;
    }

    $stmt->bind_param('ssib', $key, $contentType, $fileSize, $blob);

    $handle = fopen($sourcePath, 'rb');
    if ($handle === false) {
        error_log('DB upload failed: unable to open source file');
        $stmt->close();
        $conn->close();
        return null;
    }

    while (!feof($handle)) {
        $chunk = fread($handle, 1024 * 1024);
        if ($chunk === false) {
            fclose($handle);
            $stmt->close();
            $conn->close();
            error_log('DB upload failed: unable to read source file');
            return null;
        }
        if ($chunk !== '') {
            $stmt->send_long_data(3, $chunk);
        }
    }
    fclose($handle);

    if (!$stmt->execute()) {
        error_log('DB upload failed: ' . $stmt->error);
        $stmt->close();
        $conn->close();
        return null;
    }

    $stmt->close();
    $conn->close();
    return api_storage_db_url($key);
}

function api_storage_fetch_db_file(string $key): ?array
{
    $conn = api_db();
    api_storage_ensure_db_schema($conn);

    $key = api_storage_normalize_key($key);
    $stmt = $conn->prepare('SELECT content_type, file_size, data FROM uploaded_files WHERE storage_key = ? LIMIT 1');
    if (!$stmt) {
        $conn->close();
        return null;
    }

    $stmt->bind_param('s', $key);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result ? $result->fetch_assoc() : null;
    $stmt->close();
    $conn->close();

    if (!$row) {
        return null;
    }

    return [
        'content_type' => (string)($row['content_type'] ?? 'application/octet-stream'),
        'file_size' => (int)($row['file_size'] ?? 0),
        'data' => (string)($row['data'] ?? ''),
    ];
}

function api_storage_put_file(string $sourcePath, string $key, string $contentType = 'application/octet-stream'): ?string
{
    if (!is_file($sourcePath) || !is_readable($sourcePath)) {
        error_log('Spaces upload failed: source file is not readable');
        return null;
    }

    if (!function_exists('curl_init')) {
        error_log('Spaces upload failed: PHP cURL extension is not available');
        return null;
    }

    $bucket = trim((string)(getenv('SPACES_BUCKET') ?: ''));
    $accessKey = trim((string)(getenv('SPACES_KEY') ?: ''));
    $secretKey = (string)(getenv('SPACES_SECRET') ?: '');
    $region = trim((string)(getenv('SPACES_REGION') ?: 'sgp1'));
    $endpoint = rtrim((string)(getenv('SPACES_ENDPOINT') ?: ('https://' . $region . '.digitaloceanspaces.com')), '/');

    if ($bucket === '' || $accessKey === '' || $secretKey === '' || $region === '' || $endpoint === '') {
        error_log('Spaces upload failed: missing SPACES_BUCKET, SPACES_KEY, SPACES_SECRET, or SPACES_REGION');
        return null;
    }

    $parts = parse_url($endpoint);
    $scheme = isset($parts['scheme']) ? (string)$parts['scheme'] : 'https';
    $baseHost = isset($parts['host']) ? (string)$parts['host'] : ($region . '.digitaloceanspaces.com');
    $host = $bucket . '.' . $baseHost;
    $key = api_storage_normalize_key($key);
    $encodedKey = implode('/', array_map('rawurlencode', explode('/', $key)));
    $url = $scheme . '://' . $host . '/' . $encodedKey;

    $payloadHash = hash_file('sha256', $sourcePath);
    if ($payloadHash === false) {
        error_log('Spaces upload failed: unable to hash source file');
        return null;
    }

    $now = new DateTimeImmutable('now', new DateTimeZone('UTC'));
    $amzDate = $now->format('Ymd\THis\Z');
    $dateStamp = $now->format('Ymd');
    $credentialScope = $dateStamp . '/' . $region . '/s3/aws4_request';

    $headers = [
        'content-type' => $contentType !== '' ? $contentType : 'application/octet-stream',
        'host' => $host,
        'x-amz-acl' => 'public-read',
        'x-amz-content-sha256' => $payloadHash,
        'x-amz-date' => $amzDate,
    ];
    ksort($headers);

    $canonicalHeaders = '';
    foreach ($headers as $name => $value) {
        $canonicalHeaders .= $name . ':' . trim($value) . "\n";
    }

    $signedHeaders = implode(';', array_keys($headers));
    $canonicalRequest = "PUT\n/" . $encodedKey . "\n\n"
        . $canonicalHeaders . "\n"
        . $signedHeaders . "\n"
        . $payloadHash;

    $stringToSign = "AWS4-HMAC-SHA256\n" . $amzDate . "\n" . $credentialScope . "\n" . hash('sha256', $canonicalRequest);
    $signingKey = hash_hmac('sha256', 'aws4_request',
        hash_hmac('sha256', 's3',
            hash_hmac('sha256', $region,
                hash_hmac('sha256', $dateStamp, 'AWS4' . $secretKey, true),
                true
            ),
            true
        ),
        true
    );
    $signature = hash_hmac('sha256', $stringToSign, $signingKey);

    $httpHeaders = [
        'Authorization: AWS4-HMAC-SHA256 Credential=' . $accessKey . '/' . $credentialScope
            . ', SignedHeaders=' . $signedHeaders . ', Signature=' . $signature,
    ];
    foreach ($headers as $name => $value) {
        $httpHeaders[] = $name . ': ' . $value;
    }

    $handle = fopen($sourcePath, 'rb');
    if ($handle === false) {
        error_log('Spaces upload failed: unable to open source file');
        return null;
    }

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => 'PUT',
        CURLOPT_UPLOAD => true,
        CURLOPT_INFILE => $handle,
        CURLOPT_INFILESIZE => filesize($sourcePath) ?: 0,
        CURLOPT_HTTPHEADER => $httpHeaders,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HEADER => false,
    ]);

    $response = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    fclose($handle);

    if ($response === false || $status < 200 || $status >= 300) {
        error_log('Spaces upload failed: HTTP ' . $status . ($error !== '' ? ' ' . $error : ''));
        return null;
    }

    return api_storage_public_url($key);
}
