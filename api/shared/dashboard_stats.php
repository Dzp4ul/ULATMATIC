<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';

api_apply_cors();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    api_send_json(405, [
        'ok' => false,
        'error' => 'Method not allowed',
    ]);
}

$conn = api_db();

// --- Complaint counts by status ---
$complaintCounts = [
    'PENDING' => 0,
    'APPROVED' => 0,
    'IN_PROGRESS' => 0,
    'CANCELLED' => 0,
    'total' => 0,
];

$res = $conn->query("SELECT status, COUNT(*) AS cnt FROM complaints GROUP BY status");
if ($res) {
    while ($row = $res->fetch_assoc()) {
        $status = strtoupper(trim((string)($row['status'] ?? '')));
        $cnt = (int)($row['cnt'] ?? 0);
        if (isset($complaintCounts[$status])) {
            $complaintCounts[$status] = $cnt;
        }
        $complaintCounts['total'] += $cnt;
    }
    $res->free();
}

// --- Hearing counts by status ---
$hearingCounts = [
    'PENDING' => 0,
    'APPROVED' => 0,
    'CANCELLED' => 0,
    'RESOLVED' => 0,
    'total' => 0,
];

$res = $conn->query("SELECT status, COUNT(*) AS cnt FROM hearing_schedules GROUP BY status");
if ($res) {
    while ($row = $res->fetch_assoc()) {
        $status = strtoupper(trim((string)($row['status'] ?? '')));
        $cnt = (int)($row['cnt'] ?? 0);
        if (isset($hearingCounts[$status])) {
            $hearingCounts[$status] = $cnt;
        }
        $hearingCounts['total'] += $cnt;
    }
    $res->free();
}

// --- Complaints by month (current year) ---
$year = isset($_GET['year']) ? (int)$_GET['year'] : (int)date('Y');
$complaintsByMonth = [];
for ($m = 1; $m <= 12; $m++) {
    $complaintsByMonth[$m] = 0;
}

$stmt = $conn->prepare("SELECT MONTH(created_at) AS m, COUNT(*) AS cnt FROM complaints WHERE YEAR(created_at) = ? GROUP BY MONTH(created_at)");
if ($stmt) {
    $stmt->bind_param('i', $year);
    $stmt->execute();
    $res = $stmt->get_result();
    if ($res) {
        while ($row = $res->fetch_assoc()) {
            $m = (int)($row['m'] ?? 0);
            if ($m >= 1 && $m <= 12) {
                $complaintsByMonth[$m] = (int)($row['cnt'] ?? 0);
            }
        }
        $res->free();
    }
    $stmt->close();
}

// --- Hearings by month (current year) ---
$hearingsByMonth = [];
for ($m = 1; $m <= 12; $m++) {
    $hearingsByMonth[$m] = 0;
}

$stmt = $conn->prepare("SELECT MONTH(created_at) AS m, COUNT(*) AS cnt FROM hearing_schedules WHERE YEAR(created_at) = ? GROUP BY MONTH(created_at)");
if ($stmt) {
    $stmt->bind_param('i', $year);
    $stmt->execute();
    $res = $stmt->get_result();
    if ($res) {
        while ($row = $res->fetch_assoc()) {
            $m = (int)($row['m'] ?? 0);
            if ($m >= 1 && $m <= 12) {
                $hearingsByMonth[$m] = (int)($row['cnt'] ?? 0);
            }
        }
        $res->free();
    }
    $stmt->close();
}

// --- Resolved hearings by month (case resolutions) ---
$resolutionsByMonth = [];
for ($m = 1; $m <= 12; $m++) {
    $resolutionsByMonth[$m] = 0;
}

$stmt = $conn->prepare("SELECT MONTH(resolved_at) AS m, COUNT(*) AS cnt FROM hearing_schedules WHERE YEAR(resolved_at) = ? AND resolved_at IS NOT NULL AND resolution_type IS NOT NULL AND resolution_type != '' AND resolution_type != 'PENDING' GROUP BY MONTH(resolved_at)");
if ($stmt) {
    $stmt->bind_param('i', $year);
    $stmt->execute();
    $res = $stmt->get_result();
    if ($res) {
        while ($row = $res->fetch_assoc()) {
            $m = (int)($row['m'] ?? 0);
            if ($m >= 1 && $m <= 12) {
                $resolutionsByMonth[$m] = (int)($row['cnt'] ?? 0);
            }
        }
        $res->free();
    }
    $stmt->close();
}

// --- Complaint categories breakdown ---
$complaintCategories = [];
$res = $conn->query("SELECT complaint_category, COUNT(*) AS cnt FROM complaints GROUP BY complaint_category ORDER BY cnt DESC");
if ($res) {
    while ($row = $res->fetch_assoc()) {
        $cat = (string)($row['complaint_category'] ?? 'Unknown');
        $complaintCategories[] = [
            'name' => $cat === '' ? 'Uncategorized' : $cat,
            'value' => (int)($row['cnt'] ?? 0),
        ];
    }
    $res->free();
}

// --- Complaint types breakdown ---
$complaintTypes = [];
$res = $conn->query("SELECT complaint_type, COUNT(*) AS cnt FROM complaints GROUP BY complaint_type ORDER BY cnt DESC");
if ($res) {
    while ($row = $res->fetch_assoc()) {
        $type = (string)($row['complaint_type'] ?? 'Unknown');
        $complaintTypes[] = [
            'name' => $type === '' ? 'Uncategorized' : $type,
            'value' => (int)($row['cnt'] ?? 0),
        ];
    }
    $res->free();
}

// --- Resolution types breakdown ---
$resolutionTypes = [];
$res = $conn->query("SELECT resolution_type, COUNT(*) AS cnt FROM hearing_schedules WHERE resolved_at IS NOT NULL AND resolution_type IS NOT NULL AND resolution_type != '' AND resolution_type != 'PENDING' GROUP BY resolution_type ORDER BY cnt DESC");
if ($res) {
    while ($row = $res->fetch_assoc()) {
        $type = (string)($row['resolution_type'] ?? 'Unknown');
        $resolutionTypes[] = [
            'name' => $type,
            'value' => (int)($row['cnt'] ?? 0),
        ];
    }
    $res->free();
}

// --- Resident counts ---
$residentCounts = ['total' => 0, 'pending' => 0, 'approved' => 0, 'declined' => 0];
$res = $conn->query("SELECT status, COUNT(*) AS cnt FROM resident_user GROUP BY status");
if ($res) {
    while ($row = $res->fetch_assoc()) {
        $status = strtoupper(trim((string)($row['status'] ?? '')));
        $cnt = (int)($row['cnt'] ?? 0);
        if ($status === 'PENDING') $residentCounts['pending'] = $cnt;
        elseif ($status === 'APPROVED') $residentCounts['approved'] = $cnt;
        elseif ($status === 'DECLINED') $residentCounts['declined'] = $cnt;
        $residentCounts['total'] += $cnt;
    }
    $res->free();
}

$conn->close();

$monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
$monthlyData = [];
for ($m = 1; $m <= 12; $m++) {
    $monthlyData[] = [
        'month' => $monthNames[$m - 1],
        'complaints' => $complaintsByMonth[$m],
        'hearings' => $hearingsByMonth[$m],
        'resolutions' => $resolutionsByMonth[$m],
    ];
}

api_send_json(200, [
    'ok' => true,
    'complaints' => $complaintCounts,
    'hearings' => $hearingCounts,
    'residents' => $residentCounts,
    'monthly' => $monthlyData,
    'complaint_categories' => $complaintCategories,
    'complaint_types' => $complaintTypes,
    'resolution_types' => $resolutionTypes,
    'year' => $year,
]);
