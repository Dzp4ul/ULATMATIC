export type IncidentAnalyticsRow = {
  created_at?: string | null;
  resolved_at?: string | null;
  transferred_at?: string | null;
};

export type IncidentMonthlyDatum = {
  month: string;
  submitted: number;
  resolved: number;
  transferred: number;
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getMonthIndex(timestamp?: string | null, year = new Date().getFullYear()): number | null {
  if (!timestamp) {
    return null;
  }

  const normalized = timestamp.includes('T') ? timestamp : timestamp.replace(' ', 'T');
  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime()) || parsed.getFullYear() !== year) {
    return null;
  }

  return parsed.getMonth();
}

export function buildIncidentMonthlyData(rows: IncidentAnalyticsRow[], year = new Date().getFullYear()): IncidentMonthlyDatum[] {
  const monthly = MONTH_NAMES.map((month) => ({
    month,
    submitted: 0,
    resolved: 0,
    transferred: 0,
  }));

  rows.forEach((row) => {
    const createdMonth = getMonthIndex(row.created_at, year);
    if (createdMonth !== null) {
      monthly[createdMonth].submitted += 1;
    }

    const resolvedMonth = getMonthIndex(row.resolved_at, year);
    if (resolvedMonth !== null) {
      monthly[resolvedMonth].resolved += 1;
    }

    const transferredMonth = getMonthIndex(row.transferred_at, year);
    if (transferredMonth !== null) {
      monthly[transferredMonth].transferred += 1;
    }
  });

  return monthly;
}