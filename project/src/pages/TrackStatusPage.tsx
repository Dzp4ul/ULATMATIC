import { useState } from 'react';
import HomeNav from './home/HomeNav';
import HomeFooter from './home/HomeFooter';

type TrackedComplaint = {
  tracking_number: string;
  case_number?: string | null;
  complaint_title: string;
  complaint_category: string;
  status: string;
  created_at?: string | null;
};

type TrackedIncident = {
  tracking_number: string;
  incident_type: string;
  incident_category: string;
  sitio?: string | null;
  status: string;
  created_at?: string | null;
};

type TrackedHearing = {
  id: number;
  scheduled_date: string;
  scheduled_time: string;
  location: string;
  status: string;
  created_at?: string | null;
};

function formatPhDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const datePart = d.toLocaleDateString('en-US', {
      timeZone: 'Asia/Manila',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    const timePart = d.toLocaleTimeString('en-US', {
      timeZone: 'Asia/Manila',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return `${datePart} | ${timePart}`;
  } catch {
    return dateStr;
  }
}

function formatPhDateOnly(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', {
      timeZone: 'Asia/Manila',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toUpperCase().replace(/[\s_-]+/g, '_');
  let className = 'inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ';
  switch (s) {
    case 'PENDING':
      className += 'bg-orange-100 text-orange-700';
      break;
    case 'IN_PROGRESS':
      className += 'bg-blue-100 text-blue-700';
      break;
    case 'RESOLVED':
      className += 'bg-green-100 text-green-700';
      break;
    case 'DISMISSED':
    case 'CANCELLED':
      className += 'bg-red-100 text-red-700';
      break;
    case 'APPROVED':
      className += 'bg-emerald-100 text-emerald-700';
      break;
    default:
      className += 'bg-gray-100 text-gray-700';
  }
  return <span className={className}>{status.replace(/_/g, ' ')}</span>;
}

const STATUS_STEPS = [
  { key: 'PENDING', label: 'Pending', description: 'Your report has been received and is awaiting review by barangay officials.' },
  { key: 'IN_PROGRESS', label: 'In Progress', description: 'Your report is being actively investigated by barangay officials.' },
  { key: 'TRANSFERRED', label: 'Transferred', description: 'Your report has been transferred for further handling.' },
  { key: 'RESOLVED', label: 'Resolved', description: 'Your report has been resolved. The case is now closed.' },
];

export default function TrackStatusPage({ onNavigate }: { onNavigate: (to: string) => void }) {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [complaint, setComplaint] = useState<TrackedComplaint | null>(null);
  const [incident, setIncident] = useState<TrackedIncident | null>(null);
  const [hearings, setHearings] = useState<TrackedHearing[]>([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    const trimmed = trackingNumber.trim();
    if (!trimmed) {
      setError('Please enter a tracking number.');
      return;
    }

    setError(null);
    setComplaint(null);
    setIncident(null);
    setHearings([]);
    setLoading(true);
    setSearched(true);

    try {
      const upper = trimmed.toUpperCase();

      const fetchComplaint = async (): Promise<{ ok: boolean; data?: { complaint?: TrackedComplaint; hearings?: TrackedHearing[] } }> => {
        const res = await fetch(
          `/api/complaints/track.php?tracking_number=${encodeURIComponent(trimmed)}`
        );
        const data = (await res.json()) as {
          ok?: boolean;
          complaint?: TrackedComplaint;
          hearings?: TrackedHearing[];
        };
        return { ok: !!(res.ok && data.ok), data };
      };

      const fetchIncident = async (): Promise<{ ok: boolean; data?: { incident?: TrackedIncident } }> => {
        const res = await fetch('/api/incidents/track.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tracking_number: trimmed }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          incident?: TrackedIncident;
        };
        return { ok: !!(res.ok && data.ok), data };
      };

      const looksLikeComplaint = upper.startsWith('CMP-');
      const looksLikeIncident = upper.startsWith('INC-') || upper.startsWith('EMG-');

      const strategies: Array<'complaint' | 'incident'> = looksLikeComplaint
        ? ['complaint', 'incident']
        : looksLikeIncident
          ? ['incident', 'complaint']
          : ['complaint', 'incident'];

      let found = false;
      for (const strategy of strategies) {
        if (strategy === 'complaint') {
          const complaintResult = await fetchComplaint();
          if (complaintResult.ok) {
            setComplaint(complaintResult.data?.complaint ?? null);
            setIncident(null);
            setHearings(complaintResult.data?.hearings ?? []);
            found = true;
            break;
          }
          continue;
        }

        const incidentResult = await fetchIncident();
        if (incidentResult.ok) {
          const inc = incidentResult.data?.incident ?? null;
          setIncident(inc);
          setComplaint(null);
          setHearings([]);
          found = true;
          break;
        }
      }

      if (!found) {
        setError('No report found with that tracking number.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

    const activeStatus = (complaint?.status ?? incident?.status ?? '').toUpperCase().replace(/[\s-]+/g, '_');

    const currentStepIndex = activeStatus
      ? STATUS_STEPS.findIndex((s) => s.key === activeStatus)
      : -1;

    const isDismissed = activeStatus === 'DISMISSED';
    const isComplaintResult = complaint !== null;

    return (
      <div className="min-h-screen bg-gray-50">
        <HomeNav onNavigate={onNavigate} activeRoute="track" />

        <div className="max-w-5xl mx-auto px-4 py-12">
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-brand mb-2">Track Your Report Status</h2>
            <p className="text-gray-600 max-w-xl mx-auto">
              This page lets you check the current status of your submitted complaint, incident, or emergency report.
              Enter your tracking number below to get started.
            </p>
          </div>

          {/* Search */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
            <p className="text-base text-gray-700 mb-4 text-center">
              To track your report, enter your tracking number (e.g. <span className="font-mono font-bold text-brand">CMP-20260210-XXXXXX</span>, <span className="font-mono font-bold text-brand">INC-20260210-XXXXXX</span>, or <span className="font-mono font-bold text-brand">EMG-20260210-XXXXXX</span>) in the field below:
            </p>
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-center">
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch();
                }}
                placeholder="Tracking Number"
                className="flex-1 max-w-md rounded-lg border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand"
              />
              <button
                type="button"
                onClick={handleSearch}
                disabled={loading}
                className="rounded-lg bg-brand px-6 py-3 text-base font-bold text-white hover:bg-brand/90 disabled:bg-brand/60 transition-colors shadow-sm"
              >
                {loading ? 'Searching...' : 'Check Status'}
              </button>
            </div>

            {error ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-base text-red-700 text-center">
                {error}
              </div>
            ) : null}
          </div>

          {/* Result */}
          {complaint || incident ? (
            <div className="space-y-6">
              {/* Report Info */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="border-b border-gray-200 px-6 py-4 bg-gray-50">
                  <h3 className="text-sm font-bold text-gray-900">Report Details</h3>
                </div>
                <div className="p-6">
                  <div className="grid gap-4 sm:grid-cols-2 text-sm">
                    <div>
                      <div className="text-xs text-gray-500">Tracking #</div>
                      <div className="mt-1 font-bold text-brand text-lg">{complaint?.tracking_number ?? incident?.tracking_number}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Report Type</div>
                      <div className="mt-1 font-semibold text-gray-900">
                        {isComplaintResult ? 'Complaint' : incident?.tracking_number?.toUpperCase().startsWith('EMG-') ? 'Emergency Incident' : 'Incident'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Title / Incident Type</div>
                      <div className="mt-1 font-semibold text-gray-900">{complaint?.complaint_title ?? incident?.incident_type}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Category</div>
                      <div className="mt-1 font-semibold text-gray-900">{complaint?.complaint_category ?? incident?.incident_category}</div>
                    </div>
                    {!isComplaintResult ? (
                      <div>
                        <div className="text-xs text-gray-500">Sitio</div>
                        <div className="mt-1 font-semibold text-gray-900">{incident?.sitio ?? '-'}</div>
                      </div>
                    ) : null}
                    <div>
                      <div className="text-xs text-gray-500">Submitted</div>
                      <div className="mt-1 font-semibold text-gray-900">{formatPhDate(complaint?.created_at ?? incident?.created_at)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Current Status</div>
                      <div className="mt-1">
                        <StatusBadge status={complaint?.status ?? incident?.status ?? '-'} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Timeline */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="border-b border-gray-200 px-6 py-4 bg-gray-50">
                  <h3 className="text-sm font-bold text-gray-900">Report Status</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-0">
                    {STATUS_STEPS.map((step, i) => {
                      const isActive = i <= currentStepIndex;
                      const isCurrent = i === currentStepIndex;

                      return (
                        <div key={step.key} className="flex gap-4">
                          {/* Line + Dot */}
                          <div className="flex flex-col items-center">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center border-2 shrink-0 ${
                                isDismissed && step.key !== 'PENDING'
                                  ? 'border-gray-300 bg-gray-100'
                                  : isCurrent
                                    ? 'border-brand bg-brand text-white'
                                    : isActive
                                      ? 'border-green-500 bg-green-500 text-white'
                                      : 'border-gray-300 bg-white'
                              }`}
                            >
                              {isActive && !isCurrent && !isDismissed ? (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <span className={`text-xs font-bold ${isActive || isCurrent ? 'text-white' : 'text-gray-400'}`}>{i + 1}</span>
                              )}
                            </div>
                            {i < STATUS_STEPS.length - 1 ? (
                              <div className={`w-0.5 h-16 ${isActive && !isDismissed ? 'bg-green-500' : 'bg-gray-200'}`} />
                            ) : null}
                          </div>
                          {/* Text */}
                          <div className="pb-8">
                            <div className={`text-sm font-bold ${isCurrent ? 'text-brand' : isActive ? 'text-green-700' : 'text-gray-400'}`}>
                              {step.label}
                            </div>
                            <div className={`mt-1 text-sm ${isActive ? 'text-gray-600' : 'text-gray-400'}`}>
                              {step.description}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Dismissed state */}
                    {isDismissed ? (
                      <div className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center border-2 shrink-0 border-red-500 bg-red-500 text-white">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </div>
                        </div>
                        <div className="pb-8">
                          <div className="text-sm font-bold text-red-700">Dismissed</div>
                          <div className="mt-1 text-sm text-gray-600">
                            This report has been dismissed by barangay officials.
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Hearing History (complaints only) */}
              {isComplaintResult && hearings.length > 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="border-b border-gray-200 px-6 py-4 bg-gray-50">
                    <h3 className="text-sm font-bold text-gray-900">
                      Hearing Schedule
                      <span className="ml-2 inline-flex items-center rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-bold text-brand">
                        {hearings.length} attempt{hearings.length !== 1 ? 's' : ''}
                      </span>
                    </h3>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {hearings.map((h, i) => (
                      <div key={h.id} className="px-6 py-4">
                        <div className="flex items-center justify-between gap-4 mb-2">
                          <div className="text-sm font-bold text-gray-900">
                            Hearing #{hearings.length - i}
                          </div>
                          <StatusBadge status={h.status} />
                        </div>
                        <div className="grid gap-2 sm:grid-cols-3 text-sm text-gray-600">
                          <div>
                            <span className="text-xs text-gray-400">Date:</span>{' '}
                            <span className="font-semibold text-gray-800">{formatPhDateOnly(h.scheduled_date)}</span>
                          </div>
                          <div>
                            <span className="text-xs text-gray-400">Time:</span>{' '}
                            <span className="font-semibold text-gray-800">{h.scheduled_time}</span>
                          </div>
                          <div>
                            <span className="text-xs text-gray-400">Location:</span>{' '}
                            <span className="font-semibold text-gray-800">{h.location}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : searched && !loading && !error ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center text-gray-500">
              No results found.
            </div>
          ) : null}

          {/* Status Guide */}
          <div className="mt-10">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Status Guide</h3>
            <ul className="space-y-3">
              <li>
                <span className="text-base font-bold text-gray-900">Pending</span>
                <p className="text-base text-gray-600 mt-0.5">
                  Your report has been received and is waiting to be reviewed by barangay officials. No action has been taken yet.
                </p>
              </li>
              <li>
                <span className="text-base font-bold text-gray-900">In Progress</span>
                <p className="text-base text-gray-600 mt-0.5">
                  Your report is being actively investigated and handled by barangay officials.
                </p>
              </li>
              <li>
                <span className="text-base font-bold text-gray-900">Transferred</span>
                <p className="text-base text-gray-600 mt-0.5">
                  Your report has been transferred to another office for proper handling.
                </p>
              </li>
              <li>
                <span className="text-base font-bold text-gray-900">Resolved</span>
                <p className="text-base text-gray-600 mt-0.5">
                  Your report has been successfully resolved and the case is closed. Thank you for your report.
                </p>
              </li>
              <li>
                <span className="text-base font-bold text-gray-900">Dismissed</span>
                <p className="text-base text-gray-600 mt-0.5">
                  The report has been dismissed by barangay officials after evaluation.
                </p>
              </li>
            </ul>
          </div>

          {/* Helper links */}
          <div className="mt-10 space-y-4 text-base text-gray-700">
            <p>
              No Tracking Number? Please proceed to the{' '}
              <button type="button" onClick={() => onNavigate('/signup')} className="text-blue-600 hover:underline font-medium">
                Sign Up page
              </button>{' '}
              and create an account to file a report.
            </p>
            <p>
              Have an existing account?{' '}
              <button type="button" onClick={() => onNavigate('/signin')} className="text-blue-600 hover:underline font-medium">
                Click here
              </button>{' '}
              to login.
            </p>
          </div>
        </div>
        <HomeFooter />
      </div>
    );
  }
