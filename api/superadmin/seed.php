<?php
/**
 * Seed a default superadmin account.
 * Run once: php api/superadmin/seed.php
 */

declare(strict_types=1);

require_once __DIR__ . '/../shared/db.php';
require_once __DIR__ . '/user_schema.php';

$conn = api_db();
api_ensure_superadmin_user_schema($conn);

$email = 'superadmin@ulatmatic.com';

$stmt = $conn->prepare('SELECT id FROM superadmin_user WHERE superadmin_email = ? LIMIT 1');
$stmt->bind_param('s', $email);
$stmt->execute();
$existing = $stmt->get_result()->fetch_assoc();
$stmt->close();

if ($existing) {
    echo "Superadmin account already exists (id={$existing['id']}).\n";
    $conn->close();
    exit(0);
}

$name = 'Super Admin';
$pass = password_hash('SuperAdmin123!', PASSWORD_DEFAULT);

$stmt = $conn->prepare('INSERT INTO superadmin_user (superadmin_name, superadmin_email, superadmin_pass) VALUES (?, ?, ?)');
$stmt->bind_param('sss', $name, $email, $pass);
$stmt->execute();
$newId = (int)$conn->insert_id;
$stmt->close();
$conn->close();

echo "Superadmin account created successfully!\n";
echo "  ID:       {$newId}\n";
echo "  Email:    {$email}\n";
echo "  Password: SuperAdmin123!\n";
echo "\nPlease change the password after first login.\n";
