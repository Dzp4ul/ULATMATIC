<?php

declare(strict_types=1);

function api_mailer_config(): array
{
    return [
        'host' => 'smtp.gmail.com',
        'username' => 'ulatmatic@gmail.com',
        'password' => 'zrum ybew ferc uocg',
        'secure' => 'tls',
        'port' => 587,
        'from_email' => 'ulatmatic@gmail.com',
        'from_name' => 'ULATMATIC',
    ];
}
