import { Clock, MapPin } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type ComplaintRow = {
  tracking_number?: string | null;
  complaint_category?: string;
  sitio?: string;
  status?: string;
  created_at?: string | null;
};

type IncidentRow = {
  tracking_number?: string | null;
  incident_type?: string;
  incident_category?: string;
  sitio?: string;
  status?: string;
  created_at?: string | null;
};

type RecentReport = {
  id: string;
  category: string;
  status: string;
  location: string;
  createdAt: string | null;
  reportType: 'Complaint' | 'Incident' | 'Emergency';
};

function normalizeStatus(status: string): string {
  const s = status.toUpperCase().replace(/[\s-]+/g, '_');
  if (s === 'ON_GOING' || s === 'ONGOING') return 'IN_PROGRESS';
  return s;
}

function formatStatusLabel(status: string): string {
  const s = normalizeStatus(status);
  if (s === 'IN_PROGRESS') return 'In Progress';
  return s
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function statusBadgeClass(status: string): string {
  const s = normalizeStatus(status);
  if (s === 'RESOLVED') return 'bg-green-100 text-green-700';
  if (s === 'IN_PROGRESS') return 'bg-amber-100 text-amber-700';
  if (s === 'TRANSFERRED') return 'bg-blue-100 text-blue-700';
  return 'bg-gray-100 text-gray-700';
}

function formatRelative(createdAt: string | null): string {
  if (!createdAt) return 'Unknown date';
  const time = new Date(createdAt).getTime();
  if (Number.isNaN(time)) return createdAt;

  const seconds = Math.floor((Date.now() - time) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function HomeReports() {
  const [reports, setReports] = useState<RecentReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadRecentReports = async () => {
      setLoading(true);
      try {
        const [complaintsRes, incidentsRes] = await Promise.all([
          fetch('/api/complaints/list.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ all: true, status: 'ALL' }),
          }),
          fetch('/api/incidents/list.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ all: true, status: 'ALL' }),
          }),
        ]);

        const complaintsData = (await complaintsRes.json()) as { ok?: boolean; complaints?: ComplaintRow[] };
        const incidentsData = (await incidentsRes.json()) as { ok?: boolean; incidents?: IncidentRow[] };

        const complaintReports: RecentReport[] = complaintsRes.ok && complaintsData.ok && Array.isArray(complaintsData.complaints)
          ? complaintsData.complaints.map((row) => ({
              id: row.tracking_number ?? 'N/A',
              category: row.complaint_category || 'Complaint',
              status: row.status || 'PENDING',
              location: row.sitio || 'Barangay Bigte',
              createdAt: row.created_at ?? null,
              reportType: 'Complaint',
            }))
          : [];

        const incidentReports: RecentReport[] = incidentsRes.ok && incidentsData.ok && Array.isArray(incidentsData.incidents)
          ? incidentsData.incidents.map((row) => ({
              id: row.tracking_number ?? 'N/A',
              category: row.incident_category || row.incident_type || 'Incident',
              status: row.status || 'PENDING',
              location: row.sitio || 'Barangay Bigte',
              createdAt: row.created_at ?? null,
              reportType: (row.tracking_number ?? '').toUpperCase().startsWith('EMG-') ? 'Emergency' : 'Incident',
            }))
          : [];

        const merged = [...complaintReports, ...incidentReports]
          .sort((a, b) => {
            const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return tb - ta;
          })
          .slice(0, 3);

        if (active) {
          setReports(merged);
        }
      } catch {
        if (active) {
          setReports([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadRecentReports();
    return () => {
      active = false;
    };
  }, []);

  const cards = useMemo(() => reports, [reports]);

  return (
    <section id="reports" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h3 className="text-3xl font-bold text-gray-900 mb-4">Recent Reports</h3>
          <p className="text-lg text-gray-600">Transparency in action - see what's being reported and resolved</p>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
                <div className="h-4 w-24 bg-gray-200 rounded mb-4" />
                <div className="h-6 w-2/3 bg-gray-200 rounded mb-3" />
                <div className="h-4 w-1/2 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        ) : cards.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
            No reports available yet.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cards.map((report) => (
              <div key={`${report.reportType}-${report.id}`} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4 gap-2">
                  <span className="text-sm font-mono text-gray-500 truncate">{report.id}</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${statusBadgeClass(report.status)}`}>
                    {formatStatusLabel(report.status)}
                  </span>
                </div>
                <h4 className="font-semibold text-gray-900 mb-1 text-lg">{report.category}</h4>
                <div className="text-xs font-semibold uppercase tracking-wide text-blue-700 mb-3">{report.reportType}</div>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-2" />
                    {report.location}
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    {formatRelative(report.createdAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
