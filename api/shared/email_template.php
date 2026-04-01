<?php

declare(strict_types=1);

/**
 * Get the base URL for the application
 */
function api_get_base_url(): string
{
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    return $protocol . '://' . $host . '/ULATMATIC';
}

/**
 * Generate styled HTML email template for ULATMATIC system
 */
function api_email_template(string $title, string $content, string $footer = ''): string
{
    $year = date('Y');

    return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{$title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <!-- Header with Logo -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px 40px; border-radius: 12px 12px 0 0; text-align: center;">
                            <img src="cid:logo" alt="ULATMATIC Logo" style="width: 80px; height: 80px; border-radius: 50%; margin-bottom: 15px; border: 3px solid rgba(255,255,255,0.3); background-color: #ffffff;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: 1px;">ULATMATIC</h1>
                            <p style="margin: 8px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">Online Barangay Incident & Complaint Reporting System</p>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="margin: 0 0 20px 0; color: #1e293b; font-size: 22px; font-weight: 600;">{$title}</h2>
                            {$content}
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8fafc; padding: 25px 40px; border-radius: 0 0 12px 12px; border-top: 1px solid #e2e8f0;">
                            {$footer}
                            <p style="margin: 0; color: #64748b; font-size: 12px; text-align: center;">
                                &copy; {$year} ULATMATIC. All rights reserved.<br>
                                <span style="color: #94a3b8;">This is an automated message. Please do not reply to this email.</span>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
HTML;
}

/**
 * Generate OTP verification email
 */
function api_otp_email(string $otp): string
{
    $content = <<<HTML
<p style="margin: 0 0 25px 0; color: #475569; font-size: 16px; line-height: 1.6;">
    Thank you for registering with ULATMATIC. Please use the verification code below to complete your registration.
</p>

<div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 12px; padding: 30px; text-align: center; margin: 25px 0; border: 2px dashed #0ea5e9;">
    <p style="margin: 0 0 10px 0; color: #0369a1; font-size: 14px; font-weight: 500; text-transform: uppercase; letter-spacing: 2px;">Your Verification Code</p>
    <p style="margin: 0; color: #0c4a6e; font-size: 42px; font-weight: 700; letter-spacing: 8px; font-family: 'Courier New', monospace;">{$otp}</p>
</div>

<p style="margin: 25px 0 0 0; color: #64748b; font-size: 14px; line-height: 1.6;">
    <strong style="color: #ef4444;">Important:</strong> This code will expire in <strong>10 minutes</strong>. Do not share this code with anyone.
</p>
HTML;

    $footer = <<<HTML
<p style="margin: 0 0 15px 0; color: #64748b; font-size: 13px; text-align: center;">
    If you didn't request this verification code, please ignore this email or contact support if you have concerns.
</p>
HTML;

    return api_email_template('Email Verification', $content, $footer);
}

/**
 * Generate password reset OTP email
 */
function api_password_reset_email(string $otp): string
{
    $content = <<<HTML
<p style="margin: 0 0 25px 0; color: #475569; font-size: 16px; line-height: 1.6;">
    We received a request to reset your password. Use the code below to proceed with resetting your password.
</p>

<div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 30px; text-align: center; margin: 25px 0; border: 2px dashed #f59e0b;">
    <p style="margin: 0 0 10px 0; color: #92400e; font-size: 14px; font-weight: 500; text-transform: uppercase; letter-spacing: 2px;">Password Reset Code</p>
    <p style="margin: 0; color: #78350f; font-size: 42px; font-weight: 700; letter-spacing: 8px; font-family: 'Courier New', monospace;">{$otp}</p>
</div>

<p style="margin: 25px 0 0 0; color: #64748b; font-size: 14px; line-height: 1.6;">
    <strong style="color: #ef4444;">Important:</strong> This code will expire in <strong>10 minutes</strong>. If you didn't request a password reset, please ignore this email and your password will remain unchanged.
</p>
HTML;

    $footer = <<<HTML
<p style="margin: 0 0 15px 0; color: #64748b; font-size: 13px; text-align: center;">
    For security reasons, never share this code with anyone. ULATMATIC staff will never ask for your password or reset code.
</p>
HTML;

    return api_email_template('Password Reset', $content, $footer);
}

/**
 * Generate complaint status update email
 */
function api_complaint_status_email(string $status, string $complaintTitle, string $caseNumber = '', string $reason = ''): string
{
    $statusColors = [
        'ACCEPTED' => ['bg' => '#dcfce7', 'border' => '#22c55e', 'text' => '#166534', 'icon' => '&#10004;'],
        'DECLINED' => ['bg' => '#fee2e2', 'border' => '#ef4444', 'text' => '#991b1b', 'icon' => '&#10006;'],
        'IN_PROGRESS' => ['bg' => '#dbeafe', 'border' => '#3b82f6', 'text' => '#1e40af', 'icon' => '&#9881;'],
        'RESOLVED' => ['bg' => '#d1fae5', 'border' => '#10b981', 'text' => '#065f46', 'icon' => '&#10004;'],
    ];

    $colors = $statusColors[$status] ?? $statusColors['IN_PROGRESS'];
    $statusLabel = ucfirst(strtolower(str_replace('_', ' ', $status)));

    $caseInfo = $caseNumber ? "<p style=\"margin: 15px 0 0 0; color: #475569; font-size: 14px;\"><strong>Case Number:</strong> {$caseNumber}</p>" : '';
    $reasonInfo = $reason ? "<p style=\"margin: 15px 0 0 0; color: #475569; font-size: 14px;\"><strong>Reason:</strong> {$reason}</p>" : '';

    $content = <<<HTML
<p style="margin: 0 0 25px 0; color: #475569; font-size: 16px; line-height: 1.6;">
    Your complaint has been updated. Please see the details below.
</p>

<div style="background-color: {$colors['bg']}; border-left: 4px solid {$colors['border']}; border-radius: 8px; padding: 20px; margin: 25px 0;">
    <div style="display: flex; align-items: center; margin-bottom: 10px;">
        <span style="font-size: 24px; margin-right: 10px;">{$colors['icon']}</span>
        <span style="color: {$colors['text']}; font-size: 18px; font-weight: 600;">Status: {$statusLabel}</span>
    </div>
    <p style="margin: 0; color: #475569; font-size: 15px;"><strong>Complaint:</strong> {$complaintTitle}</p>
    {$caseInfo}
    {$reasonInfo}
</div>

<p style="margin: 25px 0 0 0; color: #64748b; font-size: 14px; line-height: 1.6;">
    You can view more details by logging into your ULATMATIC account.
</p>
HTML;

    return api_email_template('Complaint Status Update', $content);
}

/**
 * Generate hearing schedule email
 */
function api_hearing_schedule_email(string $complaintTitle, string $caseNumber, string $date, string $time, string $location, bool $isReschedule = false): string
{
    $title = $isReschedule ? 'Hearing Rescheduled' : 'Hearing Scheduled';
    $intro = $isReschedule
        ? 'Your hearing has been rescheduled. Please take note of the new schedule below.'
        : 'A hearing has been scheduled for your complaint. Please see the details below and make sure to attend.';

    $content = <<<HTML
<p style="margin: 0 0 25px 0; color: #475569; font-size: 16px; line-height: 1.6;">
    {$intro}
</p>

<div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 25px; margin: 25px 0; border: 1px solid #f59e0b;">
    <h3 style="margin: 0 0 20px 0; color: #92400e; font-size: 18px; font-weight: 600;">
        <span style="font-size: 20px; margin-right: 8px;">&#128197;</span> Hearing Details
    </h3>

    <table style="width: 100%; border-collapse: collapse;">
        <tr>
            <td style="padding: 8px 0; color: #78350f; font-weight: 500; width: 120px;">Complaint:</td>
            <td style="padding: 8px 0; color: #475569;">{$complaintTitle}</td>
        </tr>
        <tr>
            <td style="padding: 8px 0; color: #78350f; font-weight: 500;">Case Number:</td>
            <td style="padding: 8px 0; color: #475569;">{$caseNumber}</td>
        </tr>
        <tr>
            <td style="padding: 8px 0; color: #78350f; font-weight: 500;">Date:</td>
            <td style="padding: 8px 0; color: #475569; font-weight: 600;">{$date}</td>
        </tr>
        <tr>
            <td style="padding: 8px 0; color: #78350f; font-weight: 500;">Time:</td>
            <td style="padding: 8px 0; color: #475569; font-weight: 600;">{$time}</td>
        </tr>
        <tr>
            <td style="padding: 8px 0; color: #78350f; font-weight: 500;">Location:</td>
            <td style="padding: 8px 0; color: #475569;">{$location}</td>
        </tr>
    </table>
</div>

<div style="background-color: #fef2f2; border-radius: 8px; padding: 15px; margin: 20px 0;">
    <p style="margin: 0; color: #991b1b; font-size: 14px;">
        <strong>&#9888; Important:</strong> Please arrive at least 15 minutes before the scheduled time. Failure to attend may affect the outcome of your case.
    </p>
</div>
HTML;

    return api_email_template($title, $content);
}

/**
 * Generate case resolution email
 */
function api_case_resolved_email(string $complaintTitle, string $caseNumber, string $resolutionType, string $resolutionMethod = '', string $notes = ''): string
{
    $resolutionLabels = [
        'SETTLED' => ['label' => 'Settled', 'color' => '#22c55e', 'bg' => '#dcfce7'],
        'REPUDIATED' => ['label' => 'Repudiated', 'color' => '#ef4444', 'bg' => '#fee2e2'],
        'WITHDRAWN' => ['label' => 'Withdrawn', 'color' => '#6b7280', 'bg' => '#f3f4f6'],
        'DISMISSED' => ['label' => 'Dismissed', 'color' => '#f59e0b', 'bg' => '#fef3c7'],
        'CERTIFIED' => ['label' => 'Certified to File Action', 'color' => '#8b5cf6', 'bg' => '#ede9fe'],
        'REFERRED' => ['label' => 'Referred to Higher Authority', 'color' => '#3b82f6', 'bg' => '#dbeafe'],
    ];

    $resolution = $resolutionLabels[$resolutionType] ?? ['label' => $resolutionType, 'color' => '#6b7280', 'bg' => '#f3f4f6'];

    $methodInfo = $resolutionMethod ? "<tr><td style=\"padding: 8px 0; color: #475569; font-weight: 500; width: 140px;\">Method:</td><td style=\"padding: 8px 0; color: #475569;\">" . ucfirst(strtolower($resolutionMethod)) . "</td></tr>" : '';
    $notesInfo = $notes ? "<tr><td style=\"padding: 8px 0; color: #475569; font-weight: 500; vertical-align: top;\">Notes:</td><td style=\"padding: 8px 0; color: #475569;\">{$notes}</td></tr>" : '';

    $content = <<<HTML
<p style="margin: 0 0 25px 0; color: #475569; font-size: 16px; line-height: 1.6;">
    Your case has been resolved. Please see the resolution details below.
</p>

<div style="background-color: {$resolution['bg']}; border-radius: 12px; padding: 25px; margin: 25px 0; border-left: 4px solid {$resolution['color']};">
    <div style="text-align: center; margin-bottom: 20px;">
        <span style="display: inline-block; background-color: {$resolution['color']}; color: white; padding: 8px 20px; border-radius: 20px; font-weight: 600; font-size: 16px;">
            {$resolution['label']}
        </span>
    </div>

    <table style="width: 100%; border-collapse: collapse;">
        <tr>
            <td style="padding: 8px 0; color: #475569; font-weight: 500; width: 140px;">Complaint:</td>
            <td style="padding: 8px 0; color: #475569;">{$complaintTitle}</td>
        </tr>
        <tr>
            <td style="padding: 8px 0; color: #475569; font-weight: 500;">Case Number:</td>
            <td style="padding: 8px 0; color: #475569;">{$caseNumber}</td>
        </tr>
        {$methodInfo}
        {$notesInfo}
    </table>
</div>

<p style="margin: 25px 0 0 0; color: #64748b; font-size: 14px; line-height: 1.6;">
    Thank you for using ULATMATIC. If you have any questions about this resolution, please visit the Barangay office.
</p>
HTML;

    return api_email_template('Case Resolved', $content);
}

/**
 * Generate incident status email
 */
function api_incident_status_email(string $status, string $incidentType, string $trackingNumber): string
{
    $statusInfo = [
        'IN_PROGRESS' => [
            'label' => 'On Going',
            'color' => '#2563eb',
            'bg' => '#dbeafe',
            'icon' => '&#9881;',
            'message' => 'Your incident report has been accepted and is now on going. Our team is currently handling your report.'
        ],
        'RESOLVED' => [
            'label' => 'Resolved',
            'color' => '#22c55e',
            'bg' => '#dcfce7',
            'icon' => '&#10004;',
            'message' => 'Your incident report has been resolved. Thank you for reporting this matter to our attention.'
        ],
        'TRANSFERRED' => [
            'label' => 'Transferred to Complaints',
            'color' => '#3b82f6',
            'bg' => '#dbeafe',
            'icon' => '&#10132;',
            'message' => 'Your incident report has been transferred to the complaints system for further action and investigation.'
        ],
    ];

    $info = $statusInfo[$status] ?? $statusInfo['RESOLVED'];

    $content = <<<HTML
<p style="margin: 0 0 25px 0; color: #475569; font-size: 16px; line-height: 1.6;">
    {$info['message']}
</p>

<div style="background-color: {$info['bg']}; border-radius: 12px; padding: 25px; margin: 25px 0; border-left: 4px solid {$info['color']};">
    <div style="display: flex; align-items: center; margin-bottom: 15px;">
        <span style="font-size: 28px; margin-right: 12px;">{$info['icon']}</span>
        <span style="color: #1e293b; font-size: 18px; font-weight: 600;">Status: {$info['label']}</span>
    </div>

    <table style="width: 100%; border-collapse: collapse;">
        <tr>
            <td style="padding: 8px 0; color: #475569; font-weight: 500; width: 140px;">Incident Type:</td>
            <td style="padding: 8px 0; color: #475569;">{$incidentType}</td>
        </tr>
        <tr>
            <td style="padding: 8px 0; color: #475569; font-weight: 500;">Tracking Number:</td>
            <td style="padding: 8px 0; color: #475569; font-family: 'Courier New', monospace;">{$trackingNumber}</td>
        </tr>
    </table>
</div>

<p style="margin: 25px 0 0 0; color: #64748b; font-size: 14px; line-height: 1.6;">
    You can track your report status by logging into your ULATMATIC account.
</p>
HTML;

    return api_email_template('Incident Report Update', $content);
}
