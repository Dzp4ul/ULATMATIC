<?php

declare(strict_types=1);

require_once __DIR__ . '/../config.php';

function api_mailer_config(): array
{
    return [
        'host'       => MAIL_HOST,
        'username'   => MAIL_USERNAME,
        'password'   => MAIL_PASSWORD,
        'secure'     => MAIL_SECURE,
        'port'       => MAIL_PORT,
        'from_email' => MAIL_FROM_EMAIL,
        'from_name'  => MAIL_FROM_NAME,
    ];
}
