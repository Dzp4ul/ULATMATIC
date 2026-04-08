<?php
require_once __DIR__ . '/shared/db.php';

header('Content-Type: application/json');

$email = 'manansalajohnpaul120@gmail.com';

$conn = api_db();
$stmt = $conn->prepare('SELECT id, fname, lname, email, profile_photo, selfie_photo, front_id, back_id FROM resident_user WHERE email = ? LIMIT 1');
$stmt->bind_param('s', $email);
$stmt->execute();
$result = $stmt->get_result();
$user = $result->fetch_assoc();
$stmt->close();
$conn->close();

echo json_encode([
    'user' => $user,
    'profile_photo_exists' => $user && $user['profile_photo'] ? file_exists(__DIR__ . '/../' . $user['profile_photo']) : false,
    'selfie_photo_exists' => $user && $user['selfie_photo'] ? file_exists(__DIR__ . '/../' . $user['selfie_photo']) : false,
], JSON_PRETTY_PRINT);
