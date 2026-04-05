<?php
declare(strict_types=1);

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
    exit;
}

$response = [
    'ok' => true,
    'files_received' => [],
    'post_data' => $_POST,
    'server_info' => [
        'upload_max_filesize' => ini_get('upload_max_filesize'),
        'post_max_size' => ini_get('post_max_size'),
        'max_file_uploads' => ini_get('max_file_uploads'),
    ]
];

foreach ($_FILES as $key => $file) {
    $response['files_received'][$key] = [
        'name' => $file['name'] ?? 'unknown',
        'size' => $file['size'] ?? 0,
        'type' => $file['type'] ?? 'unknown',
        'error' => $file['error'] ?? -1,
        'error_message' => match($file['error'] ?? -1) {
            UPLOAD_ERR_OK => 'Success',
            UPLOAD_ERR_INI_SIZE => 'File exceeds upload_max_filesize',
            UPLOAD_ERR_FORM_SIZE => 'File exceeds MAX_FILE_SIZE',
            UPLOAD_ERR_PARTIAL => 'File was only partially uploaded',
            UPLOAD_ERR_NO_FILE => 'No file was uploaded',
            UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder',
            UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
            UPLOAD_ERR_EXTENSION => 'Upload stopped by extension',
            default => 'Unknown error'
        }
    ];
}

header('Content-Type: application/json');
echo json_encode($response, JSON_PRETTY_PRINT);
