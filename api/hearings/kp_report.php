<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/db.php';
require_once __DIR__ . '/schema.php';
require_once __DIR__ . '/../complaints/schema.php';

api_apply_cors();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    api_send_json(405, ['ok' => false, 'error' => 'Method not allowed']);
}

$year = isset($_GET['year']) ? (int)$_GET['year'] : (int)date('Y');

$conn = api_db();
api_ensure_hearing_schema($conn);
api_ensure_complaint_schema($conn);

// Build the KP compliance data structure:
// For each month (1-12):
//   - Nature of Dispute: Criminal, Civil, Others, Total
//   - Settled: Mediation, Conciliation, Arbitration, Total
//   - Unsettled: Repudiated, Withdrawn, Pending, Dismissed, Certified, Referred, Total
//   - Estimated Government Savings: ₱9,500 × settled total

$months = [];
for ($m = 1; $m <= 12; $m++) {
    $months[$m] = [
        'nature' => ['criminal' => 0, 'civil' => 0, 'others' => 0, 'total' => 0],
        'settled' => ['mediation' => 0, 'conciliation' => 0, 'arbitration' => 0, 'total' => 0],
        'unsettled' => ['repudiated' => 0, 'withdrawn' => 0, 'pending' => 0, 'dismissed' => 0, 'certified' => 0, 'referred' => 0, 'total' => 0],
        'savings' => 0,
    ];
}

// Query all hearings with resolutions for the given year
$sql = "SELECT 
    h.id,
    h.scheduled_date,
    h.resolution_type,
    h.resolution_method,
    h.resolved_at,
    c.complaint_type,
    c.complaint_category
FROM hearing_schedules h
INNER JOIN complaints c ON h.complaint_id = c.id
WHERE YEAR(h.scheduled_date) = ?
ORDER BY h.scheduled_date ASC";

$stmt = $conn->prepare($sql);
$stmt->bind_param('i', $year);
$stmt->execute();
$result = $stmt->get_result();

while ($row = $result->fetch_assoc()) {
    $month = (int)date('n', strtotime($row['scheduled_date']));
    if ($month < 1 || $month > 12) continue;

    // Classify complaint type into Criminal/Civil/Others
    $type = strtolower(trim($row['complaint_type'] ?? ''));
    if (strpos($type, 'criminal') !== false) {
        $months[$month]['nature']['criminal']++;
    } elseif (strpos($type, 'civil') !== false) {
        $months[$month]['nature']['civil']++;
    } else {
        $months[$month]['nature']['others']++;
    }
    $months[$month]['nature']['total']++;

    // Classify resolution
    $resType = strtoupper(trim($row['resolution_type'] ?? ''));
    $resMethod = strtoupper(trim($row['resolution_method'] ?? ''));

    if ($resType === 'SETTLED') {
        if ($resMethod === 'MEDIATION') {
            $months[$month]['settled']['mediation']++;
        } elseif ($resMethod === 'CONCILIATION') {
            $months[$month]['settled']['conciliation']++;
        } elseif ($resMethod === 'ARBITRATION') {
            $months[$month]['settled']['arbitration']++;
        }
        $months[$month]['settled']['total']++;
    } elseif (in_array($resType, ['REPUDIATED', 'WITHDRAWN', 'PENDING', 'DISMISSED', 'CERTIFIED', 'REFERRED'], true)) {
        $key = strtolower($resType);
        $months[$month]['unsettled'][$key]++;
        $months[$month]['unsettled']['total']++;
    } elseif ($resType === '' || $resType === 'NULL') {
        // No resolution yet = pending
        $months[$month]['unsettled']['pending']++;
        $months[$month]['unsettled']['total']++;
    }

    // Savings: ₱9,500 per settled case
    if ($resType === 'SETTLED') {
        $months[$month]['savings'] += 9500;
    }
}

$stmt->close();

// Calculate totals
$totals = [
    'nature' => ['criminal' => 0, 'civil' => 0, 'others' => 0, 'total' => 0],
    'settled' => ['mediation' => 0, 'conciliation' => 0, 'arbitration' => 0, 'total' => 0],
    'unsettled' => ['repudiated' => 0, 'withdrawn' => 0, 'pending' => 0, 'dismissed' => 0, 'certified' => 0, 'referred' => 0, 'total' => 0],
    'savings' => 0,
];

foreach ($months as $data) {
    foreach (['nature', 'settled', 'unsettled'] as $section) {
        foreach ($data[$section] as $key => $val) {
            $totals[$section][$key] += $val;
        }
    }
    $totals['savings'] += $data['savings'];
}

$conn->close();

api_send_json(200, [
    'ok' => true,
    'year' => $year,
    'months' => $months,
    'totals' => $totals,
]);
