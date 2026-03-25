<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/mailer_config.php';
require_once __DIR__ . '/email_template.php';

use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\PHPMailer;

/**
 * Send email notification to a resident
 *
 * @param mysqli $conn Database connection
 * @param int $residentId Resident ID
 * @param string $subject Email subject
 * @param string $body HTML email body
 * @return bool Whether the email was sent successfully
 */
function send_resident_email(mysqli $conn, int $residentId, string $subject, string $body): bool
{
    // Get resident email
    $stmt = $conn->prepare("SELECT email, fname FROM resident_user WHERE id = ?");
    if (!$stmt) {
        return false;
    }

    $stmt->bind_param('i', $residentId);
    $stmt->execute();
    $result = $stmt->get_result();
    $resident = $result->fetch_assoc();
    $stmt->close();

    if (!$resident || empty($resident['email'])) {
        return false;
    }

    $autoload = __DIR__ . '/../../vendor/autoload.php';
    if (!file_exists($autoload)) {
        return false;
    }

    require_once $autoload;

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
        $mail->addAddress($resident['email'], $resident['fname'] ?? '');

        $mail->isHTML(true);
        $mail->Subject = 'ULATMATIC - ' . $subject;
        $mail->Body = $body;
        $mail->AltBody = strip_tags(str_replace(['<br>', '<br/>', '<br />'], "\n", $body));

        // Embed logo image for email display
        $logoPath = __DIR__ . '/../../uploads/logo.png';
        if (file_exists($logoPath)) {
            $mail->addEmbeddedImage($logoPath, 'logo', 'logo.png');
        }

        $mail->send();
        return true;
    } catch (Exception $e) {
        error_log('Email send failed: ' . $mail->ErrorInfo);
        return false;
    }
}

/**
 * Send complaint status update email to resident
 */
function notify_complaint_status(mysqli $conn, int $residentId, string $status, string $complaintTitle, string $caseNumber = '', string $reason = ''): bool
{
    $body = api_complaint_status_email($status, $complaintTitle, $caseNumber, $reason);
    $subject = 'Complaint ' . ucfirst(strtolower(str_replace('_', ' ', $status)));
    return send_resident_email($conn, $residentId, $subject, $body);
}

/**
 * Send hearing schedule email to resident
 */
function notify_hearing_scheduled(mysqli $conn, int $residentId, string $complaintTitle, string $caseNumber, string $date, string $time, string $location, bool $isReschedule = false): bool
{
    $body = api_hearing_schedule_email($complaintTitle, $caseNumber, $date, $time, $location, $isReschedule);
    $subject = $isReschedule ? 'Hearing Rescheduled' : 'Hearing Scheduled';
    return send_resident_email($conn, $residentId, $subject, $body);
}

/**
 * Send case resolution email to resident
 */
function notify_case_resolved(mysqli $conn, int $residentId, string $complaintTitle, string $caseNumber, string $resolutionType, string $resolutionMethod = '', string $notes = ''): bool
{
    $body = api_case_resolved_email($complaintTitle, $caseNumber, $resolutionType, $resolutionMethod, $notes);
    return send_resident_email($conn, $residentId, 'Case Resolved', $body);
}

/**
 * Send incident status email to resident
 */
function notify_incident_status(mysqli $conn, int $residentId, string $status, string $incidentType, string $trackingNumber): bool
{
    $body = api_incident_status_email($status, $incidentType, $trackingNumber);
    $subject = 'Incident Report ' . ucfirst(strtolower($status));
    return send_resident_email($conn, $residentId, $subject, $body);
}
