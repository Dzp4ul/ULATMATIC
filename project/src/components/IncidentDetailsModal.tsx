import { resolveAssetUrl } from '../utils/api';

export type IncidentDetailsData = {
  id: number;
  tracking_number?: string | null;
  incident_type: string;
  incident_category: string;
  sitio: string;
  description: string;
  witness?: string | null;
  evidence_path?: string | null;
  evidence_mime?: string | null;
  status: string;
  created_at?: string | null;
  resolved_at?: string | null;
  transferred_at?: string | null;
};

function formatDateTime(value?: string | null): string {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

export function IncidentDetailsModal({
  open,
  incident,
  onClose,
  canAccept = false,
  onAccept,
  isAccepting = false,
}: {
  open: boolean;
  incident: IncidentDetailsData | null;
  onClose: () => void;
  canAccept?: boolean;
  onAccept?: () => void;
  isAccepting?: boolean;
}) {
  if (!open || !incident) {
    return null;
  }

  const evidenceUrl = resolveAssetUrl(incident.evidence_path);
  const hasImageEvidence = Boolean(evidenceUrl && (incident.evidence_mime ?? '').startsWith('image/'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Incident Report Details</h2>
            <p className="mt-1 text-sm text-gray-600">
              {incident.tracking_number ?? 'No tracking number'} · {incident.status}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canAccept ? (
              <button
                type="button"
                onClick={onAccept}
                disabled={isAccepting}
                className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand/90 disabled:cursor-not-allowed disabled:bg-brand/50"
              >
                {isAccepting ? 'Accepting...' : 'Accept Report'}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>

        <div className="grid gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Type</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{incident.incident_type || '-'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Category</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{incident.incident_category || '-'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Sitio</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{incident.sitio || '-'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Submitted</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{formatDateTime(incident.created_at)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Resolved At</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{formatDateTime(incident.resolved_at)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Transferred At</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{formatDateTime(incident.transferred_at)}</p>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Description</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-gray-800">{incident.description || '-'}</p>
        </div>

        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Witness / Contact</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-gray-800">{incident.witness || '-'}</p>
        </div>

        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Evidence</p>
          {evidenceUrl ? (
            <div className="mt-3 space-y-3">
              {hasImageEvidence ? (
                <img src={evidenceUrl} alt="Incident evidence" className="max-h-80 w-full rounded-lg border border-gray-200 object-contain bg-gray-50" />
              ) : (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                  File attached
                </div>
              )}
              <a
                href={evidenceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand/90"
              >
                Open Evidence in New Tab
              </a>
            </div>
          ) : (
            <p className="mt-2 text-sm text-gray-500">No evidence uploaded.</p>
          )}
        </div>
      </div>
    </div>
  );
}
