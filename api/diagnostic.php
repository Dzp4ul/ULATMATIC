<?php
// Diagnostic script for file upload issues
header('Content-Type: application/json');

$diagnostics = [
    'php_version' => PHP_VERSION,
    'loaded_php_ini' => php_ini_loaded_file(),
    'scanned_php_ini' => php_ini_scanned_files(),
    'user_ini_filename' => ini_get('user_ini.filename'),
    'user_ini_cache_ttl' => ini_get('user_ini.cache_ttl'),
    'upload_max_filesize' => ini_get('upload_max_filesize'),
    'post_max_size' => ini_get('post_max_size'),
    'max_file_uploads' => ini_get('max_file_uploads'),
    'memory_limit' => ini_get('memory_limit'),
    'file_uploads' => ini_get('file_uploads') ? 'enabled' : 'disabled',
    'uploads_dir_exists' => is_dir(__DIR__ . '/uploads/resident_ids'),
    'uploads_dir_writable' => is_writable(__DIR__ . '/uploads/resident_ids'),
    'uploads_dir_path' => realpath(__DIR__ . '/uploads/resident_ids'),
    'mime_content_type_available' => function_exists('mime_content_type'),
    'fileinfo_extension' => extension_loaded('fileinfo'),
];

// Check if we can create test directory
if (!is_dir(__DIR__ . '/uploads/resident_ids')) {
    $diagnostics['mkdir_attempt'] = @mkdir(__DIR__ . '/uploads/resident_ids', 0755, true) ? 'success' : 'failed';
}

// Check if we can write test file
$testFile = __DIR__ . '/uploads/resident_ids/test.txt';
$diagnostics['write_test'] = @file_put_contents($testFile, 'test') !== false ? 'success' : 'failed';
if (file_exists($testFile)) {
    @unlink($testFile);
}

echo json_encode($diagnostics, JSON_PRETTY_PRINT);
