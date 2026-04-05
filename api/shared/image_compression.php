<?php

declare(strict_types=1);

/**
 * Compress an uploaded image file to reduce its size
 * 
 * @param string $sourcePath Path to the source image
 * @param string $destPath Path where compressed image will be saved
 * @param int $maxSizeMB Maximum file size in MB (default 5)
 * @param int $maxWidth Maximum width in pixels (default 1920)
 * @param int $maxHeight Maximum height in pixels (default 1920)
 * @return bool True if compression successful, false otherwise
 */
function compress_image(string $sourcePath, string $destPath, int $maxSizeMB = 5, int $maxWidth = 1920, int $maxHeight = 1920): bool
{
    if (!file_exists($sourcePath)) {
        return false;
    }

    // Check if GD is available
    if (!extension_loaded('gd')) {
        // GD not available, just copy the file
        // Client-side compression should have handled it
        return copy($sourcePath, $destPath);
    }

    $maxSizeBytes = $maxSizeMB * 1024 * 1024;
    $sourceSize = filesize($sourcePath);

    // If already under limit, just copy
    if ($sourceSize <= $maxSizeBytes) {
        return copy($sourcePath, $destPath);
    }

    // Detect image type
    $imageInfo = @getimagesize($sourcePath);
    if ($imageInfo === false) {
        return false;
    }

    [$width, $height, $type] = $imageInfo;

    // Load image based on type
    $source = null;
    switch ($type) {
        case IMAGETYPE_JPEG:
            $source = @imagecreatefromjpeg($sourcePath);
            break;
        case IMAGETYPE_PNG:
            $source = @imagecreatefrompng($sourcePath);
            break;
        case IMAGETYPE_GIF:
            $source = @imagecreatefromgif($sourcePath);
            break;
        case IMAGETYPE_WEBP:
            $source = @imagecreatefromwebp($sourcePath);
            break;
        default:
            return false;
    }

    if ($source === false) {
        return false;
    }

    // Calculate new dimensions
    $newWidth = $width;
    $newHeight = $height;

    if ($width > $maxWidth || $height > $maxHeight) {
        $ratio = min($maxWidth / $width, $maxHeight / $height);
        $newWidth = (int)($width * $ratio);
        $newHeight = (int)($height * $ratio);
    }

    // Create new image
    $dest = imagecreatetruecolor($newWidth, $newHeight);
    if ($dest === false) {
        imagedestroy($source);
        return false;
    }

    // Preserve transparency for PNG
    if ($type === IMAGETYPE_PNG) {
        imagealphablending($dest, false);
        imagesavealpha($dest, true);
        $transparent = imagecolorallocatealpha($dest, 0, 0, 0, 127);
        imagefilledrectangle($dest, 0, 0, $newWidth, $newHeight, $transparent);
    }

    // Resize
    imagecopyresampled($dest, $source, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
    imagedestroy($source);

    // Try different quality levels to get under size limit
    $quality = 90;
    $tempPath = $destPath . '.tmp';
    $success = false;

    while ($quality >= 30) {
        // Save with current quality
        $saved = @imagejpeg($dest, $tempPath, $quality);
        
        if ($saved && file_exists($tempPath)) {
            $compressedSize = filesize($tempPath);
            
            if ($compressedSize <= $maxSizeBytes) {
                // Success! Move temp file to destination
                $success = rename($tempPath, $destPath);
                break;
            }
        }
        
        // Try lower quality
        $quality -= 10;
        
        if (file_exists($tempPath)) {
            @unlink($tempPath);
        }
    }

    imagedestroy($dest);

    // Clean up temp file if it exists
    if (file_exists($tempPath)) {
        @unlink($tempPath);
    }

    return $success;
}
