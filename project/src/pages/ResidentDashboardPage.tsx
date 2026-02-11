import {
  AlertCircle,
  Calendar,
  Camera,
  ChevronDown,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Search,
  ShieldAlert,
  User,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import logo from '../../Logo/406613648_313509771513180_7654072355038554241_n.png';
import { FileDropzone } from '../components/FileDropzone';

type ComplaintRow = {
  id: number;
  resident_id: number;
  tracking_number?: string | null;
  complaint_title: string;
  complaint_type: string;
  complaint_category: string;
  sitio: string;
  respondent_name?: string | null;
  respondent_address?: string | null;
  description: string;
  witness?: string | null;
  evidence_path?: string | null;
  evidence_mime?: string | null;
  status: string;
  created_at?: string | null;
};

type IncidentRow = {
  id: number;
  resident_id: number | null;
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

type HearingRow = {
  id: number;
  complaint_id: number;
  scheduled_date: string;
  scheduled_time: string;
  location: string;
  notes?: string | null;
  status: string;
  tracking_number?: string | null;
  case_number?: string | null;
  complaint_title: string;
  complaint_type: string;
  created_at?: string | null;
};

function formatHearingDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      }
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

function formatHearingTime(timeStr: string | null | undefined): string {
  if (!timeStr) return '-';
  try {
    const parts = timeStr.split(':');
    if (parts.length >= 2) {
      let h = Number(parts[0]);
      const m = Number(parts[1]);
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
    }
    return timeStr;
  } catch {
    return timeStr;
  }
}

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

function StatCard({
  title,
  value,
  icon,
  iconBgClassName,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  iconBgClassName: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-3 p-5">
        <div>
          <div className="text-sm font-medium text-gray-600">{title}</div>
          <div className="mt-3 text-3xl font-bold text-gray-900">{value}</div>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconBgClassName}`}>{icon}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  const styles =
    normalized === 'APPROVED' || normalized === 'ACCEPTED' || normalized === 'RESOLVED'
      ? 'bg-emerald-100 text-emerald-700'
      : normalized === 'CANCELLED' || normalized === 'DECLINED'
        ? 'bg-red-100 text-red-700'
        : 'bg-orange-100 text-orange-700';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles}`}>{status}</span>;
}

function SidebarItem({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? 'flex w-full items-center gap-3 rounded-lg bg-white px-3 py-2 text-left text-sm font-semibold text-brand'
          : 'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-blue-50/90 hover:bg-white/10'
      }
    >
      <span className={active ? 'text-brand' : 'text-white/80'}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

export default function ResidentDashboardPage({
  onNavigate,
}: {
  onNavigate: (to: string) => void;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [residentName, setResidentName] = useState('Resident');
  const [residentId, setResidentId] = useState<number>(0);
  const [residentSitio, setResidentSitio] = useState<string>('');
  const [activeView, setActiveView] = useState<
    | 'dashboard'
    | 'profile'
    | 'file_complaint'
    | 'my_complaints'
    | 'hearing_schedules'
    | 'incident_report'
    | 'my_incidents'
    | 'messages'
  >('dashboard');
  const [profileFname, setProfileFname] = useState('');
  const [profileMidname, setProfileMidname] = useState('');
  const [profileLname, setProfileLname] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileGender, setProfileGender] = useState('');
  const [profileSitio, setProfileSitio] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);
  const [profileFrontId, setProfileFrontId] = useState<string | null>(null);
  const [profileBackId, setProfileBackId] = useState<string | null>(null);
  const [profileFrontIdFile, setProfileFrontIdFile] = useState<File | null>(null);
  const [profileBackIdFile, setProfileBackIdFile] = useState<File | null>(null);
  const [profileFrontIdPreview, setProfileFrontIdPreview] = useState<string | null>(null);
  const [profileBackIdPreview, setProfileBackIdPreview] = useState<string | null>(null);
  const [profilePassword, setProfilePassword] = useState('');
  const [profileConfirmPassword, setProfileConfirmPassword] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);
  const profileFrontIdInputRef = useRef<HTMLInputElement>(null);
  const profileBackIdInputRef = useRef<HTMLInputElement>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const [complaintTitle, setComplaintTitle] = useState('');
  const [complaintCategory, setComplaintCategory] = useState('');
  const [complaintSitio, setComplaintSitio] = useState('');
  const [complaintRespondentName, setComplaintRespondentName] = useState('');
  const [complaintRespondentAddress, setComplaintRespondentAddress] = useState('');
  const [complaintDescription, setComplaintDescription] = useState('');
  const [complaintWitnesses, setComplaintWitnesses] = useState<string[]>(['']);
  const [complaintEvidence, setComplaintEvidence] = useState<File | null>(null);
  const [complaintEvidencePreview, setComplaintEvidencePreview] = useState<string | null>(null);
  const [complaintEvidenceIsVideo, setComplaintEvidenceIsVideo] = useState(false);
  const [complaintSubmitting, setComplaintSubmitting] = useState(false);
  const [complaintError, setComplaintError] = useState<string | null>(null);
  const [complaintSuccess, setComplaintSuccess] = useState<string | null>(null);
  const [trackingNumber, setTrackingNumber] = useState<string | null>(null);
  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintRow | null>(null);
  const [evidencePreview, setEvidencePreview] = useState<{ url: string; isVideo: boolean } | null>(null);
  const [complaints, setComplaints] = useState<ComplaintRow[]>([]);
  const [complaintsLoading, setComplaintsLoading] = useState(false);
  const [complaintsError, setComplaintsError] = useState<string | null>(null);
  const [hearings, setHearings] = useState<HearingRow[]>([]);
  const [hearingsLoading, setHearingsLoading] = useState(false);
  const [hearingsError, setHearingsError] = useState<string | null>(null);
  const evidenceInputRef = useRef<HTMLInputElement>(null);

  // --- Incident Report state ---
  const [incidentType, setIncidentType] = useState('');
  const [incidentCategory, setIncidentCategory] = useState('');
  const [incidentSitio, setIncidentSitio] = useState('');
  const [incidentDescription, setIncidentDescription] = useState('');
  const [incidentWitnesses, setIncidentWitnesses] = useState<string[]>(['']);
  const [incidentEvidence, setIncidentEvidence] = useState<File | null>(null);
  const [incidentEvidencePreview, setIncidentEvidencePreview] = useState<string | null>(null);
  const [incidentEvidenceIsVideo, setIncidentEvidenceIsVideo] = useState(false);
  const [incidentSubmitting, setIncidentSubmitting] = useState(false);
  const [incidentError, setIncidentError] = useState<string | null>(null);
  const [incidentSuccess, setIncidentSuccess] = useState<string | null>(null);
  const incidentEvidenceInputRef = useRef<HTMLInputElement>(null);

  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [incidentsLoading, setIncidentsLoading] = useState(false);
  const [incidentsError, setIncidentsError] = useState<string | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<IncidentRow | null>(null);
  const [incidentEvidenceModal, setIncidentEvidenceModal] = useState<{ url: string; isVideo: boolean } | null>(null);
  const [incidentTrackingNumber, setIncidentTrackingNumber] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadProfile = async () => {
      try {
        const raw = localStorage.getItem('ulatmatic_resident');
        if (!raw) {
          onNavigate('/signin');
          return;
        }

        const parsed = JSON.parse(raw) as { id?: unknown; fname?: string; lname?: string; email?: string; sitio?: string };
        const id = typeof parsed.id === 'number' ? parsed.id : Number(parsed.id);
        if (!Number.isFinite(id) || id <= 0) {
          onNavigate('/signin');
          return;
        }

        if (!active) return;
        setResidentId(id);

        const fallbackName = `${parsed.fname ?? ''} ${parsed.lname ?? ''}`.trim();
        if (fallbackName) setResidentName(fallbackName);
        else if (parsed.email) setResidentName(parsed.email);
        if (parsed.sitio) {
          setResidentSitio(parsed.sitio);
          setComplaintSitio(parsed.sitio);
        }

        const res = await fetch('http://localhost/ULATMATIC/api/resident/profile.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id }),
        });

        const data = (await res.json()) as {
          ok?: boolean;
          user?: {
            fname?: string;
            midname?: string | null;
            lname?: string | null;
            email?: string;
            phone?: string;
            gender?: string;
            sitio?: string;
            front_id?: string;
            back_id?: string;
            profile_photo?: string | null;
          };
        };

        if (!active || !res.ok || !data.ok || !data.user) return;
        const user = data.user;
        const fullName = `${user.fname ?? ''} ${user.lname ?? ''}`.trim();
        if (fullName) setResidentName(fullName);
        else if (user.email) setResidentName(user.email);
        setProfileFname(user.fname ?? '');
        setProfileMidname(user.midname ?? '');
        setProfileLname(user.lname ?? '');
        setProfileEmail(user.email ?? '');
        const phoneDigits = (user.phone ?? '').replace(/^\+?63/, '').replace(/\D/g, '');
        setProfilePhone(phoneDigits);
        setProfileGender(user.gender ?? '');
        setProfileSitio(user.sitio ?? '');
        setProfileFrontId(user.front_id ?? null);
        setProfileBackId(user.back_id ?? null);
        setProfilePhoto(user.profile_photo ?? null);
        if (user.sitio) {
          setResidentSitio(user.sitio);
          setComplaintSitio(user.sitio);
        }
      } catch {
        onNavigate('/signin');
      }
    };

    void loadProfile();
    return () => {
      active = false;
    };
  }, [onNavigate]);

  // Incident evidence preview
  useEffect(() => {
    if (!incidentEvidence) {
      setIncidentEvidencePreview(null);
      setIncidentEvidenceIsVideo(false);
      return;
    }
    const url = URL.createObjectURL(incidentEvidence);
    setIncidentEvidencePreview(url);
    setIncidentEvidenceIsVideo(incidentEvidence.type.startsWith('video/'));
    return () => URL.revokeObjectURL(url);
  }, [incidentEvidence]);

  // Pre-fill sitio when profile loads
  useEffect(() => {
    if (residentSitio) setIncidentSitio(residentSitio);
  }, [residentSitio]);

  useEffect(() => {
    if (!complaintEvidence) {
      setComplaintEvidencePreview(null);
      setComplaintEvidenceIsVideo(false);
      return;
    }

    const url = URL.createObjectURL(complaintEvidence);
    setComplaintEvidencePreview(url);
    setComplaintEvidenceIsVideo(complaintEvidence.type.startsWith('video/'));
    return () => URL.revokeObjectURL(url);
  }, [complaintEvidence]);

  useEffect(() => {
    if (!profilePhotoFile) {
      setProfilePhotoPreview(null);
      return;
    }

    const url = URL.createObjectURL(profilePhotoFile);
    setProfilePhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [profilePhotoFile]);

  useEffect(() => {
    if (!profileFrontIdFile) {
      setProfileFrontIdPreview(null);
      return;
    }

    const url = URL.createObjectURL(profileFrontIdFile);
    setProfileFrontIdPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [profileFrontIdFile]);

  useEffect(() => {
    if (!profileBackIdFile) {
      setProfileBackIdPreview(null);
      return;
    }

    const url = URL.createObjectURL(profileBackIdFile);
    setProfileBackIdPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [profileBackIdFile]);

  useEffect(() => {
    if (!profileMenuOpen) return;
    const handler = (event: MouseEvent) => {
      if (!profileMenuRef.current) return;
      if (event.target instanceof Node && profileMenuRef.current.contains(event.target)) return;
      setProfileMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [profileMenuOpen]);

  const loadComplaints = useCallback(async () => {
    if (!residentId) {
      setComplaintsError('Resident session not found. Please sign in again.');
      setComplaints([]);
      return;
    }

    setComplaintsError(null);
    setComplaintsLoading(true);
    try {
      const res = await fetch('http://localhost/ULATMATIC/api/complaints/list.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ resident_id: residentId, status: 'ALL' }),
      });

      const data = (await res.json()) as { ok?: boolean; error?: string; complaints?: ComplaintRow[] };
      if (!res.ok || !data.ok || !Array.isArray(data.complaints)) {
        setComplaintsError(data.error ?? 'Failed to load complaints');
        setComplaints([]);
        return;
      }

      const mapped = data.complaints.map((row) => ({
        ...row,
        id: typeof row.id === 'number' ? row.id : Number(row.id),
        resident_id: typeof row.resident_id === 'number' ? row.resident_id : Number(row.resident_id),
      }));
      setComplaints(mapped);
    } catch {
      setComplaintsError('Network error. Please try again.');
      setComplaints([]);
    } finally {
      setComplaintsLoading(false);
    }
  }, [residentId]);

  useEffect(() => {
    if (activeView !== 'my_complaints') return;
    void loadComplaints();
  }, [activeView, loadComplaints]);

  const loadHearings = useCallback(async () => {
    if (!residentId) {
      setHearingsError('Resident session not found. Please sign in again.');
      setHearings([]);
      return;
    }

    setHearingsError(null);
    setHearingsLoading(true);
    try {
      const res = await fetch(`http://localhost/ULATMATIC/api/hearings/list.php?resident_id=${residentId}`);
      const data = (await res.json()) as { ok?: boolean; error?: string; hearings?: HearingRow[] };
      if (!res.ok || !data.ok || !Array.isArray(data.hearings)) {
        setHearingsError(data.error ?? 'Failed to load hearing schedules');
        setHearings([]);
        return;
      }
      setHearings(data.hearings);
    } catch {
      setHearingsError('Network error. Please try again.');
      setHearings([]);
    } finally {
      setHearingsLoading(false);
    }
  }, [residentId]);

  useEffect(() => {
    if (activeView !== 'hearing_schedules') return;
    void loadHearings();
  }, [activeView, loadHearings]);

  const loadIncidents = useCallback(async () => {
    if (!residentId) {
      setIncidentsError('Resident session not found. Please sign in again.');
      setIncidents([]);
      return;
    }
    setIncidentsError(null);
    setIncidentsLoading(true);
    try {
      const res = await fetch('http://localhost/ULATMATIC/api/incidents/list.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resident_id: residentId, status: 'ALL' }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; incidents?: IncidentRow[] };
      if (!res.ok || !data.ok || !Array.isArray(data.incidents)) {
        setIncidentsError(data.error ?? 'Failed to load incidents');
        setIncidents([]);
        return;
      }
      setIncidents(data.incidents);
    } catch {
      setIncidentsError('Network error. Please try again.');
      setIncidents([]);
    } finally {
      setIncidentsLoading(false);
    }
  }, [residentId]);

  useEffect(() => {
    if (activeView !== 'my_incidents') return;
    void loadIncidents();
  }, [activeView, loadIncidents]);

  const stats = useMemo(
    () => [
      {
        title: 'Approved Complaints',
        value: 0,
        icon: <FileText className="h-5 w-5 text-blue-700" />,
        iconBgClassName: 'bg-blue-100',
      },
      {
        title: 'Pending Complaints',
        value: 0,
        icon: <FileText className="h-5 w-5 text-orange-700" />,
        iconBgClassName: 'bg-orange-100',
      },
      {
        title: 'Cancelled Complaints',
        value: 0,
        icon: <FileText className="h-5 w-5 text-emerald-700" />,
        iconBgClassName: 'bg-emerald-100',
      },
      {
        title: 'Approved Hearing',
        value: 0,
        icon: <Calendar className="h-5 w-5 text-blue-700" />,
        iconBgClassName: 'bg-blue-100',
      },
      {
        title: 'Pending Hearing',
        value: 0,
        icon: <Calendar className="h-5 w-5 text-emerald-700" />,
        iconBgClassName: 'bg-emerald-100',
      },
      {
        title: 'Cancelled Hearing',
        value: 0,
        icon: <Calendar className="h-5 w-5 text-orange-700" />,
        iconBgClassName: 'bg-orange-100',
      },
    ],
    []
  );

  const pageTitle =
    activeView === 'dashboard'
      ? 'Dashboard'
      : activeView === 'file_complaint'
        ? 'File Complaint'
        : activeView === 'my_complaints'
          ? 'My Complaints'
          : activeView === 'hearing_schedules'
            ? 'Hearing Schedules'
            : activeView === 'incident_report'
              ? 'Incident Report'
              : activeView === 'my_incidents'
                ? 'My Incident Reports'
                : activeView === 'profile'
                  ? 'Profile Settings'
                  : 'Messages';

  const selectedEvidenceUrl = selectedComplaint?.evidence_path
    ? `http://localhost/ULATMATIC/${selectedComplaint.evidence_path}`
    : null;
  const selectedEvidenceIsVideo = Boolean(
    selectedComplaint?.evidence_mime
      ? selectedComplaint.evidence_mime.startsWith('video/')
      : selectedComplaint?.evidence_path?.match(/\.(mp4|webm|mov)$/i)
  );
  const profilePhotoUrl = profilePhoto ? `http://localhost/ULATMATIC/${profilePhoto}` : null;
  const profilePreviewUrl = profilePhotoPreview ?? profilePhotoUrl;
  const profileFrontIdUrl = profileFrontId ? `http://localhost/ULATMATIC/${profileFrontId}` : null;
  const profileBackIdUrl = profileBackId ? `http://localhost/ULATMATIC/${profileBackId}` : null;
  const profileFrontIdDisplay = profileFrontIdPreview ?? profileFrontIdUrl;
  const profileBackIdDisplay = profileBackIdPreview ?? profileBackIdUrl;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex min-h-screen">
        <aside
          className={
            sidebarOpen
              ? 'w-72 shrink-0 bg-brand text-white flex flex-col'
              : 'hidden w-72 shrink-0 bg-brand text-white lg:block lg:flex lg:flex-col'
          }
        >
          <div className="flex items-center gap-3 px-6 py-5">
            <div className="flex h-10 w-10 items-center justify-center">
              <img src={logo} alt="ULATMATIC logo" className="h-10 w-10 object-contain" />
            </div>
            <div>
              <div className="text-lg font-bold leading-tight">ULATMATIC</div>
              <div className="text-xs text-white/80">Resident Portal</div>
            </div>
          </div>

          <div className="px-6 pb-4">
            <div className="flex items-center gap-3 rounded-xl bg-white/10 p-3">
              {profilePhotoUrl ? (
                <img src={profilePhotoUrl} alt="Resident" className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                  <User className="h-5 w-5 text-white/80" />
                </div>
              )}
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{residentName}</div>
                <div className="truncate text-xs text-white/80">Resident</div>
              </div>
            </div>
          </div>

          <nav className="space-y-1 px-4">
            <SidebarItem
              label="Dashboard"
              icon={<LayoutDashboard className="h-5 w-5" />}
              active={activeView === 'dashboard'}
              onClick={() => setActiveView('dashboard')}
            />
            <SidebarItem
              label="File Complaint"
              icon={<FileText className="h-5 w-5" />}
              active={activeView === 'file_complaint'}
              onClick={() => setActiveView('file_complaint')}
            />
            <SidebarItem
              label="My Complaints"
              icon={<FileText className="h-5 w-5" />}
              active={activeView === 'my_complaints'}
              onClick={() => setActiveView('my_complaints')}
            />
            <SidebarItem
              label="Hearing Schedules"
              icon={<Calendar className="h-5 w-5" />}
              active={activeView === 'hearing_schedules'}
              onClick={() => setActiveView('hearing_schedules')}
            />
            <SidebarItem
              label="Incident Report"
              icon={<ShieldAlert className="h-5 w-5" />}
              active={activeView === 'incident_report'}
              onClick={() => setActiveView('incident_report')}
            />
            <SidebarItem
              label="My Incident Reports"
              icon={<AlertCircle className="h-5 w-5" />}
              active={activeView === 'my_incidents'}
              onClick={() => setActiveView('my_incidents')}
            />
            <SidebarItem
              label="Messages"
              icon={<MessageCircle className="h-5 w-5" />}
              active={activeView === 'messages'}
              onClick={() => setActiveView('messages')}
            />
          </nav>

        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 border-b border-black/5 bg-brand">
            <div className="flex items-center gap-4 px-4 py-3 lg:px-8">
              <button
                type="button"
                onClick={() => setSidebarOpen((v) => !v)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/15 lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="relative w-full max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/80" />
                <input
                  type="text"
                  placeholder="Search"
                  className="h-10 w-full rounded-lg bg-white/15 pl-10 pr-3 text-sm text-white placeholder:text-white/70 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-white/25"
                />
              </div>

              <div className="ml-auto relative" ref={profileMenuRef}>
                <button
                  type="button"
                  onClick={() => setProfileMenuOpen((v) => !v)}
                  className="flex items-center gap-3 rounded-full bg-white/10 px-3 py-1.5 text-left text-white hover:bg-white/15"
                >
                  <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-white/20">
                    {profilePhotoUrl ? (
                      <img src={profilePhotoUrl} alt="Resident" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-4 w-4 text-white/80" />
                    )}
                  </div>
                  <div className="hidden sm:block">
                    <div className="text-sm font-semibold leading-tight">{residentName}</div>
                    <div className="text-xs text-white/70">Resident</div>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-white/80 transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {profileMenuOpen ? (
                  <div className="absolute right-0 mt-3 w-64 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
                    <div className="flex items-center gap-3 px-4 py-4">
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-gray-100">
                        {profilePhotoUrl ? (
                          <img src={profilePhotoUrl} alt="Resident" className="h-full w-full object-cover" />
                        ) : (
                          <User className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{residentName}</div>
                        <div className="text-xs text-gray-500">{profileEmail || 'Resident Account'}</div>
                        <div className="text-xs text-gray-400">Resident</div>
                      </div>
                    </div>
                    <div className="border-t border-gray-100">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveView('profile');
                          setProfileMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        <User className="h-4 w-4" />
                        My Profile
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          localStorage.removeItem('ulatmatic_resident');
                          onNavigate('/signin');
                        }}
                        className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="h-4 w-4" />
                        Logout
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 lg:px-8">
            {activeView !== 'profile' ? (
              <div className="mb-5">
                <h1 className="text-2xl font-bold text-gray-900">{pageTitle}</h1>
                <div className="mt-1 text-sm text-gray-500">
                  Home <span className="text-gray-400">/</span> {pageTitle}
                </div>
              </div>
            ) : null}

            {activeView === 'dashboard' ? (
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {stats.map((s) => (
                  <StatCard key={s.title} title={s.title} value={s.value} icon={s.icon} iconBgClassName={s.iconBgClassName} />
                ))}
              </section>
            ) : activeView === 'profile' ? (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
                  <p className="text-sm text-gray-500">Manage your personal information and account settings.</p>
                </div>

                <form
                  className="space-y-6"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!residentId) {
                      setProfileError('Resident session not found. Please sign in again.');
                      return;
                    }

                    if (profilePassword.trim() && profilePassword !== profileConfirmPassword) {
                      setProfileError('Passwords do not match.');
                      return;
                    }

                    const normalizedPhone = profilePhone.trim().replace(/\D/g, '');
                    if (normalizedPhone && normalizedPhone.length !== 9) {
                      setProfileError('Phone number must be +63 followed by 9 digits.');
                      return;
                    }

                    setProfileSaving(true);
                    setProfileError(null);
                    setProfileSuccess(null);
                    try {
                      const fd = new FormData();
                      fd.append('id', String(residentId));
                      fd.append('fname', profileFname.trim());
                      fd.append('midname', profileMidname.trim());
                      fd.append('lname', profileLname.trim());
                      fd.append('email', profileEmail.trim());
                      if (normalizedPhone) fd.append('phone', `+63${normalizedPhone}`);
                      fd.append('gender', profileGender.trim());
                      fd.append('sitio', profileSitio.trim());
                      if (profilePhotoFile) fd.append('profile_photo', profilePhotoFile);
                      if (profileFrontIdFile) fd.append('front_id', profileFrontIdFile);
                      if (profileBackIdFile) fd.append('back_id', profileBackIdFile);
                      if (profilePassword.trim()) fd.append('user_pass', profilePassword.trim());

                      const res = await fetch('http://localhost/ULATMATIC/api/resident/update_profile.php', {
                        method: 'POST',
                        body: fd,
                      });
                      const data = (await res.json()) as {
                        ok?: boolean;
                        error?: string;
                        user?: {
                          fname?: string;
                          midname?: string | null;
                          lname?: string | null;
                          email?: string;
                          phone?: string;
                          gender?: string;
                          sitio?: string;
                          front_id?: string;
                          back_id?: string;
                          profile_photo?: string | null;
                        };
                      };

                      if (!res.ok || !data.ok || !data.user) {
                        setProfileError(data.error ?? 'Failed to update profile.');
                        return;
                      }

                      const user = data.user;
                      const fullName = `${user.fname ?? ''} ${user.lname ?? ''}`.trim();
                      if (fullName) setResidentName(fullName);
                      else if (user.email) setResidentName(user.email);

                      setProfileFname(user.fname ?? '');
                      setProfileMidname(user.midname ?? '');
                      setProfileLname(user.lname ?? '');
                      setProfileEmail(user.email ?? '');
                      const updatedPhone = (user.phone ?? '').replace(/^\+?63/, '').replace(/\D/g, '');
                      setProfilePhone(updatedPhone);
                      setProfileGender(user.gender ?? '');
                      setProfileSitio(user.sitio ?? '');
                      setProfileFrontId(user.front_id ?? null);
                      setProfileBackId(user.back_id ?? null);
                      setProfilePhoto(user.profile_photo ?? null);
                      if (user.sitio) {
                        setResidentSitio(user.sitio);
                        setComplaintSitio(user.sitio);
                      }

                      setProfilePhotoFile(null);
                      setProfileFrontIdFile(null);
                      setProfileBackIdFile(null);
                      setProfilePassword('');
                      setProfileConfirmPassword('');
                      if (profilePhotoInputRef.current) profilePhotoInputRef.current.value = '';
                      if (profileFrontIdInputRef.current) profileFrontIdInputRef.current.value = '';
                      if (profileBackIdInputRef.current) profileBackIdInputRef.current.value = '';
                      setProfileSuccess('Profile updated successfully.');
                    } catch {
                      setProfileError('Network error. Please try again.');
                    } finally {
                      setProfileSaving(false);
                    }
                  }}
                >
                  <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
                    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                      <div className="relative mx-auto flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-gray-100">
                        {profilePreviewUrl ? (
                          <img src={profilePreviewUrl} alt="Profile" className="h-full w-full object-cover" />
                        ) : (
                          <User className="h-10 w-10 text-gray-400" />
                        )}
                        <button
                          type="button"
                          onClick={() => profilePhotoInputRef.current?.click()}
                          className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-brand text-white shadow-lg"
                        >
                          <Camera className="h-4 w-4" />
                        </button>
                        <input
                          ref={profilePhotoInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0] ?? null;
                            setProfilePhotoFile(file);
                          }}
                        />
                      </div>
                      <div className="mt-4 text-center">
                        <div className="text-sm font-semibold text-gray-900">{residentName}</div>
                        <div className="text-xs text-gray-500">Supported formats: JPG, PNG, GIF. Max size 5MB.</div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-gray-900">Personal Information</div>
                        <span className="text-xs text-brand">Edit</span>
                      </div>
                      <div className="mt-4 grid gap-4 md:grid-cols-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">First Name</label>
                          <input
                            type="text"
                            value={profileFname}
                            onChange={(e) => setProfileFname(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Middle Name</label>
                          <input
                            type="text"
                            value={profileMidname}
                            onChange={(e) => setProfileMidname(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Last Name</label>
                          <input
                            type="text"
                            value={profileLname}
                            onChange={(e) => setProfileLname(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                          />
                        </div>
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Email Address</label>
                          <input
                            type="email"
                            value={profileEmail}
                            onChange={(e) => setProfileEmail(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Phone Number</label>
                          <div className="flex rounded-lg border border-gray-300 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand">
                            <span className="inline-flex items-center rounded-l-lg border-r border-gray-200 bg-gray-50 px-3 text-xs font-semibold text-gray-500">
                              +63
                            </span>
                            <input
                              type="tel"
                              value={profilePhone}
                              onChange={(e) => setProfilePhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                              className="w-full rounded-r-lg px-3 py-2 text-sm focus:outline-none"
                              placeholder="9XXXXXXXXX"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Gender</label>
                          <select
                            value={profileGender}
                            onChange={(e) => setProfileGender(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                          >
                            <option value="">Select gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Address</label>
                          <input
                            type="text"
                            value={profileSitio}
                            onChange={(e) => setProfileSitio(e.target.value)}
                            placeholder="Enter your address"
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="text-sm font-semibold text-gray-900">Identification</div>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <FileDropzone
                        label="Front ID"
                        file={profileFrontIdFile}
                        previewUrl={profileFrontIdDisplay}
                        accept="image/*"
                        required={false}
                        inputRef={profileFrontIdInputRef}
                        onChange={(file) => setProfileFrontIdFile(file)}
                        onClear={() => {
                          setProfileFrontIdFile(null);
                          if (profileFrontIdInputRef.current) profileFrontIdInputRef.current.value = '';
                        }}
                      />
                      <FileDropzone
                        label="Back ID"
                        file={profileBackIdFile}
                        previewUrl={profileBackIdDisplay}
                        accept="image/*"
                        required={false}
                        inputRef={profileBackIdInputRef}
                        onChange={(file) => setProfileBackIdFile(file)}
                        onClear={() => {
                          setProfileBackIdFile(null);
                          if (profileBackIdInputRef.current) profileBackIdInputRef.current.value = '';
                        }}
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="text-sm font-semibold text-gray-900">Account Settings</div>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">New Password</label>
                        <input
                          type="password"
                          value={profilePassword}
                          onChange={(e) => setProfilePassword(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                          placeholder="••••••••"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Confirm Password</label>
                        <input
                          type="password"
                          value={profileConfirmPassword}
                          onChange={(e) => setProfileConfirmPassword(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>
                  </div>

                  {profileError ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {profileError}
                    </div>
                  ) : null}
                  {profileSuccess ? (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                      {profileSuccess}
                    </div>
                  ) : null}

                  <div className="flex items-center justify-end">
                    <button
                      type="submit"
                      disabled={profileSaving}
                      className="inline-flex items-center rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand/90 disabled:bg-brand/70"
                    >
                      {profileSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            ) : activeView === 'file_complaint' ? (
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <form
                  className="space-y-4"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setComplaintError(null);
                    setComplaintSuccess(null);

                    if (!residentId) {
                      setComplaintError('Resident session not found. Please sign in again.');
                      return;
                    }

                    if (
                      !complaintTitle.trim() ||
                      !complaintCategory.trim() ||
                      !complaintDescription.trim()
                    ) {
                      setComplaintError('Please fill out all required fields.');
                      return;
                    }

                    setComplaintSubmitting(true);
                    try {
                      const fd = new FormData();
                      fd.append('resident_id', String(residentId));
                      fd.append('complaint_title', complaintTitle.trim());
                      fd.append('complaint_category', complaintCategory.trim());
                      if (complaintSitio.trim()) fd.append('sitio', complaintSitio.trim());
                      fd.append('respondent_address', complaintRespondentAddress.trim());
                      fd.append('description', complaintDescription.trim());
                      if (complaintRespondentName.trim()) fd.append('respondent_name', complaintRespondentName.trim());
                      const witnessStr = complaintWitnesses.map(w => w.trim()).filter(Boolean).join(', ');
                      if (witnessStr) fd.append('witness', witnessStr);
                      if (complaintEvidence) fd.append('evidence', complaintEvidence);

                      const res = await fetch('http://localhost/ULATMATIC/api/complaints/submit.php', {
                        method: 'POST',
                        body: fd,
                      });

                      const data = (await res.json()) as {
                        ok?: boolean;
                        error?: string;
                        id?: number;
                        tracking_number?: string;
                      };
                      if (!res.ok || !data.ok) {
                        setComplaintError(data.error ?? 'Failed to submit complaint');
                        return;
                      }

                      setComplaintSuccess('Complaint submitted successfully.');
                      if (data.tracking_number) {
                        setTrackingNumber(data.tracking_number);
                      }
                      setComplaintTitle('');
                      setComplaintCategory('');
                      setComplaintSitio(residentSitio);
                      setComplaintRespondentName('');
                      setComplaintRespondentAddress('');
                      setComplaintDescription('');
                      setComplaintWitnesses(['']);
                      setComplaintEvidence(null);
                    } catch {
                      setComplaintError('Network error. Please try again.');
                    } finally {
                      setComplaintSubmitting(false);
                    }
                  }}
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Complaint Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        value={complaintTitle}
                        onChange={(e) => setComplaintTitle(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand"
                        placeholder="Complaint title"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Complaint Category <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={complaintCategory}
                        onChange={(e) => setComplaintCategory(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand"
                      >
                        <option value="" disabled>
                          Select complaint category
                        </option>
                        <option value="Public Safety">Public Safety</option>
                        <option value="Road Issues">Road Issues</option>
                        <option value="Noise Complaint">Noise Complaint</option>
                        <option value="Street lighting">Street lighting</option>
                        <option value="Waste Management">Waste Management</option>
                        <option value="Water Issues">Water Issues</option>
                        <option value="Property Damage">Property Damage</option>
                        <option value="Other Concerns">Other Concerns</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Respondent Name (optional)</label>
                      <input
                        value={complaintRespondentName}
                        onChange={(e) => setComplaintRespondentName(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand"
                        placeholder="Person or entity (optional)"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Respondent Sitio (optional)</label>
                      <select
                        value={complaintSitio}
                        onChange={(e) => setComplaintSitio(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand"
                      >
                        <option value="">Select sitio</option>
                        <option value="Ahunin">Ahunin</option>
                        <option value="Alinsangan">Alinsangan</option>
                        <option value="Baltazar">Baltazar</option>
                        <option value="Biak na Bato">Biak na Bato</option>
                        <option value="Bria Phase 1">Bria Phase 1</option>
                        <option value="Bria Phase2">Bria Phase2</option>
                        <option value="COC">COC</option>
                        <option value="Calle Onse / Sampaguita">Calle Onse / Sampaguita</option>
                        <option value="Crusher Highway">Crusher Highway</option>
                        <option value="Inner Crusher">Inner Crusher</option>
                        <option value="Kadayunan">Kadayunan</option>
                        <option value="Looban 1">Looban 1</option>
                        <option value="Looban 2">Looban 2</option>
                        <option value="Manggahan">Manggahan</option>
                        <option value="Nabus">Nabus</option>
                        <option value="Old Barrio 2">Old Barrio 2</option>
                        <option value="Old Barrio Ext">Old Barrio Ext</option>
                        <option value="Old Barrio NPC">Old Barrio NPC</option>
                        <option value="Poblacion">Poblacion</option>
                        <option value="RCD">RCD</option>
                        <option value="Riverside">Riverside</option>
                        <option value="Settling">Settling</option>
                        <option value="Spar">Spar</option>
                        <option value="Upper">Upper</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Witness (optional)</label>
                      <div className="space-y-2">
                        {complaintWitnesses.map((w, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <input
                              value={w}
                              onChange={(e) => {
                                const updated = [...complaintWitnesses];
                                updated[i] = e.target.value;
                                setComplaintWitnesses(updated);
                              }}
                              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand"
                              placeholder={`Witness name ${i + 1}`}
                            />
                            {complaintWitnesses.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setComplaintWitnesses(complaintWitnesses.filter((_, idx) => idx !== i))}
                                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-300 text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                                aria-label="Remove witness"
                              >
                                &times;
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => setComplaintWitnesses([...complaintWitnesses, ''])}
                          className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:text-brand/80 transition-colors"
                        >
                          <span className="text-lg leading-none">+</span> Add Witness
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={complaintDescription}
                      onChange={(e) => setComplaintDescription(e.target.value)}
                      className="min-h-[120px] w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                      placeholder="Describe what happened..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Proof / Evidence (image or video)</label>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      ref={evidenceInputRef}
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        setComplaintEvidence(f);
                      }}
                      className="block w-full text-sm text-gray-700 file:mr-4 file:rounded-lg file:border-0 file:bg-brand file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand/90"
                    />
                    {complaintEvidence ? (
                      <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3 relative">
                        <button
                          type="button"
                          onClick={() => {
                            setComplaintEvidence(null);
                            if (evidenceInputRef.current) {
                              evidenceInputRef.current.value = '';
                            }
                          }}
                          className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-semibold text-gray-600 shadow hover:bg-gray-100"
                          aria-label="Remove evidence"
                        >
                          X
                        </button>
                        {complaintEvidencePreview ? (
                          complaintEvidenceIsVideo ? (
                            <video src={complaintEvidencePreview} controls className="w-full max-h-64 rounded-lg" />
                          ) : (
                            <img
                              src={complaintEvidencePreview}
                              alt="Evidence preview"
                              className="w-full max-h-64 rounded-lg object-contain"
                            />
                          )
                        ) : null}
                        <div className="mt-2 text-xs text-gray-500">Selected: {complaintEvidence.name}</div>
                      </div>
                    ) : null}
                  </div>

                  {complaintError ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{complaintError}</div> : null}
                  {complaintSuccess ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{complaintSuccess}</div> : null}

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={complaintSubmitting}
                      className="inline-flex items-center justify-center rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand/90 disabled:bg-brand/60"
                    >
                      {complaintSubmitting ? 'Submitting…' : 'Submit Complaint'}
                    </button>
                  </div>
                </form>
              </div>

                <div className="w-full lg:w-80 shrink-0">
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 shadow-sm sticky top-6">
                    <h3 className="flex items-center gap-2 text-base font-bold text-blue-800 mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" /></svg>
                      Filing Guidelines
                    </h3>
                    <ul className="space-y-2.5 text-sm text-blue-700 list-disc list-inside leading-relaxed">
                      <li>Fill out all required fields marked with <span className="text-red-500 font-bold">*</span>.</li>
                      <li>Provide a clear and concise complaint title that summarizes the issue.</li>
                      <li>Select the appropriate complaint category for faster processing.</li>
                      <li>Include the respondent&apos;s name and sitio if known to help with investigation.</li>
                      <li>Add witness names if available — use the <strong>+ Add Witness</strong> button to add more.</li>
                      <li>Write a detailed description of the incident, including date, time, and location.</li>
                      <li>Attach any supporting evidence (photo or video) if available.</li>
                      <li>Once submitted, you will receive a tracking number to monitor your complaint.</li>
                      <li>False or malicious complaints may be subject to appropriate action.</li>
                    </ul>
                  </div>
                </div>
              </div>
            ) : activeView === 'my_complaints' ? (
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-gray-200">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">My Complaints</div>
                    <div className="text-xs text-gray-500">Track submitted complaints and their status.</div>
                  </div>
                  <div className="text-sm font-semibold text-gray-700">{complaints.length}</div>
                </div>

                {complaintsError ? (
                  <div className="p-6 text-sm text-red-700">{complaintsError}</div>
                ) : complaintsLoading ? (
                  <div className="p-6 text-sm text-gray-600">Loading…</div>
                ) : complaints.length === 0 ? (
                  <div className="p-6 text-sm text-gray-600">No complaints found yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-gray-50 text-xs font-semibold text-gray-600">
                        <tr>
                          <th className="px-5 py-3">Tracking #</th>
                          <th className="px-5 py-3">Title</th>
                          <th className="px-5 py-3">Category</th>
                          <th className="px-5 py-3">Status</th>
                          <th className="px-5 py-3">Submitted</th>
                          <th className="px-5 py-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {complaints.map((row) => (
                          <tr key={row.id} className="hover:bg-gray-50">
                            <td className="px-5 py-3 font-semibold text-gray-900">{row.tracking_number ?? '-'}</td>
                            <td className="px-5 py-3 text-gray-700">
                              <div className="font-semibold text-gray-900">{row.complaint_title}</div>
                            </td>
                            <td className="px-5 py-3 text-gray-700">{row.complaint_category}</td>
                            <td className="px-5 py-3">
                              <StatusBadge status={row.status} />
                            </td>
                            <td className="px-5 py-3 text-gray-600">{formatPhDate(row.created_at)}</td>
                            <td className="px-5 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedComplaint(row);
                                  setEvidencePreview(null);
                                }}
                                className="rounded-lg border border-brand px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand/5"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : activeView === 'hearing_schedules' ? (
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-gray-200">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">My Hearing Schedules</div>
                    <div className="text-xs text-gray-500">View scheduled hearings for your complaints.</div>
                  </div>
                  <div className="text-sm font-semibold text-gray-700">{hearings.length}</div>
                </div>

                {hearingsError ? (
                  <div className="p-6 text-sm text-red-700">{hearingsError}</div>
                ) : hearingsLoading ? (
                  <div className="p-6 text-sm text-gray-600">Loading…</div>
                ) : hearings.length === 0 ? (
                  <div className="p-6 text-sm text-gray-600">No hearing schedules found yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-gray-50 text-xs font-semibold text-gray-600">
                        <tr>
                          <th className="px-5 py-3">Case #</th>
                          <th className="px-5 py-3">Complaint Title</th>
                          <th className="px-5 py-3">Date</th>
                          <th className="px-5 py-3">Time</th>
                          <th className="px-5 py-3">Location</th>
                          <th className="px-5 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {hearings.map((row) => (
                          <tr key={row.id} className="hover:bg-gray-50">
                            <td className="px-5 py-3 font-semibold text-gray-900">{row.case_number ?? row.tracking_number ?? '-'}</td>
                            <td className="px-5 py-3 text-gray-700">
                              <div className="font-semibold text-gray-900">{row.complaint_title}</div>
                              <div className="text-xs text-gray-500">{row.complaint_type}</div>
                            </td>
                            <td className="px-5 py-3 text-gray-700">{formatHearingDate(row.scheduled_date)}</td>
                            <td className="px-5 py-3 text-gray-700">{formatHearingTime(row.scheduled_time)}</td>
                            <td className="px-5 py-3 text-gray-700">{row.location}</td>
                            <td className="px-5 py-3">
                              <StatusBadge status={row.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : activeView === 'incident_report' ? (
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <form
                    className="space-y-4"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setIncidentError(null);
                      setIncidentSuccess(null);

                      if (!residentId) {
                        setIncidentError('Resident session not found. Please sign in again.');
                        return;
                      }
                      if (!incidentType.trim() || !incidentCategory.trim() || !incidentDescription.trim()) {
                        setIncidentError('Please fill out all required fields.');
                        return;
                      }

                      setIncidentSubmitting(true);
                      try {
                        const fd = new FormData();
                        fd.append('resident_id', String(residentId));
                        fd.append('incident_type', incidentType.trim());
                        fd.append('incident_category', incidentCategory.trim());
                        if (incidentSitio.trim()) fd.append('sitio', incidentSitio.trim());
                        fd.append('description', incidentDescription.trim());
                        const witnessStr = incidentWitnesses.map(w => w.trim()).filter(Boolean).join(', ');
                        if (witnessStr) fd.append('witness', witnessStr);
                        if (incidentEvidence) fd.append('evidence', incidentEvidence);

                        const res = await fetch('http://localhost/ULATMATIC/api/incidents/submit.php', {
                          method: 'POST',
                          body: fd,
                        });

                        const data = (await res.json()) as { ok?: boolean; error?: string; id?: number; tracking_number?: string };
                        if (!res.ok || !data.ok) {
                          setIncidentError(data.error ?? 'Failed to submit incident report');
                          return;
                        }

                        setIncidentSuccess('Incident report submitted successfully.');
                        if (data.tracking_number) {
                          setIncidentTrackingNumber(data.tracking_number);
                        }
                        setIncidentType('');
                        setIncidentCategory('');
                        setIncidentSitio(residentSitio);
                        setIncidentDescription('');
                        setIncidentWitnesses(['']);
                        setIncidentEvidence(null);
                        if (incidentEvidenceInputRef.current) incidentEvidenceInputRef.current.value = '';
                      } catch {
                        setIncidentError('Network error. Please try again.');
                      } finally {
                        setIncidentSubmitting(false);
                      }
                    }}
                  >
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                          Incident Type <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={incidentType}
                          onChange={(e) => setIncidentType(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand"
                        >
                          <option value="" disabled>Select incident type</option>
                          <option value="Theft">Theft</option>
                          <option value="Assault">Assault</option>
                          <option value="Vandalism">Vandalism</option>
                          <option value="Traffic Accident">Traffic Accident</option>
                          <option value="Flooding">Flooding</option>
                          <option value="Noise Disturbance">Noise Disturbance</option>
                          <option value="Drug-related">Drug-related</option>
                          <option value="Domestic Violence">Domestic Violence</option>
                          <option value="Stray Animals">Stray Animals</option>
                          <option value="Illegal Construction">Illegal Construction</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                          Incident Category <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={incidentCategory}
                          onChange={(e) => setIncidentCategory(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand"
                        >
                          <option value="" disabled>Select category</option>
                          <option value="Crime">Crime</option>
                          <option value="Fire">Fire</option>
                          <option value="Accident">Accident</option>
                          <option value="Natural Disaster">Natural Disaster</option>
                          <option value="Public Disturbance">Public Disturbance</option>
                          <option value="Health Emergency">Health Emergency</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Location / Sitio</label>
                        <select
                          value={incidentSitio}
                          onChange={(e) => setIncidentSitio(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand"
                        >
                          <option value="">Select sitio</option>
                          <option value="Ahunin">Ahunin</option>
                          <option value="Alinsangan">Alinsangan</option>
                          <option value="Baltazar">Baltazar</option>
                          <option value="Biak na Bato">Biak na Bato</option>
                          <option value="Bria Phase 1">Bria Phase 1</option>
                          <option value="Bria Phase2">Bria Phase2</option>
                          <option value="COC">COC</option>
                          <option value="Calle Onse / Sampaguita">Calle Onse / Sampaguita</option>
                          <option value="Crusher Highway">Crusher Highway</option>
                          <option value="Inner Crusher">Inner Crusher</option>
                          <option value="Kadayunan">Kadayunan</option>
                          <option value="Looban 1">Looban 1</option>
                          <option value="Looban 2">Looban 2</option>
                          <option value="Manggahan">Manggahan</option>
                          <option value="Nabus">Nabus</option>
                          <option value="Old Barrio 2">Old Barrio 2</option>
                          <option value="Old Barrio Ext">Old Barrio Ext</option>
                          <option value="Old Barrio NPC">Old Barrio NPC</option>
                          <option value="Poblacion">Poblacion</option>
                          <option value="RCD">RCD</option>
                          <option value="Riverside">Riverside</option>
                          <option value="Settling">Settling</option>
                          <option value="Spar">Spar</option>
                          <option value="Upper">Upper</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Witness (optional)</label>
                        <div className="space-y-2">
                          {incidentWitnesses.map((w, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <input
                                value={w}
                                onChange={(e) => {
                                  const updated = [...incidentWitnesses];
                                  updated[i] = e.target.value;
                                  setIncidentWitnesses(updated);
                                }}
                                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand"
                                placeholder={`Witness name ${i + 1}`}
                              />
                              {incidentWitnesses.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => setIncidentWitnesses(incidentWitnesses.filter((_, idx) => idx !== i))}
                                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-300 text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                                  aria-label="Remove witness"
                                >
                                  &times;
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => setIncidentWitnesses([...incidentWitnesses, ''])}
                            className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:text-brand/80 transition-colors"
                          >
                            <span className="text-lg leading-none">+</span> Add Witness
                          </button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Description <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={incidentDescription}
                        onChange={(e) => setIncidentDescription(e.target.value)}
                        className="min-h-[120px] w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                        placeholder="Describe what happened, including date, time, and specific location..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Proof / Evidence (image or video)</label>
                      <input
                        type="file"
                        accept="image/*,video/*"
                        ref={incidentEvidenceInputRef}
                        onChange={(e) => {
                          const f = e.target.files?.[0] ?? null;
                          setIncidentEvidence(f);
                        }}
                        className="block w-full text-sm text-gray-700 file:mr-4 file:rounded-lg file:border-0 file:bg-brand file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand/90"
                      />
                      {incidentEvidence ? (
                        <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3 relative">
                          <button
                            type="button"
                            onClick={() => {
                              setIncidentEvidence(null);
                              if (incidentEvidenceInputRef.current) incidentEvidenceInputRef.current.value = '';
                            }}
                            className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-semibold text-gray-600 shadow hover:bg-gray-100"
                            aria-label="Remove evidence"
                          >
                            X
                          </button>
                          {incidentEvidencePreview ? (
                            incidentEvidenceIsVideo ? (
                              <video src={incidentEvidencePreview} controls className="w-full max-h-64 rounded-lg" />
                            ) : (
                              <img src={incidentEvidencePreview} alt="Evidence preview" className="w-full max-h-64 rounded-lg object-contain" />
                            )
                          ) : null}
                          <div className="mt-2 text-xs text-gray-500">Selected: {incidentEvidence.name}</div>
                        </div>
                      ) : null}
                    </div>

                    {incidentError ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{incidentError}</div> : null}
                    {incidentSuccess ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{incidentSuccess}</div> : null}

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={incidentSubmitting}
                        className="inline-flex items-center justify-center rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand/90 disabled:bg-brand/60"
                      >
                        {incidentSubmitting ? 'Submitting…' : 'Submit Incident Report'}
                      </button>
                    </div>
                  </form>
                </div>

                <div className="w-full lg:w-80 shrink-0">
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 shadow-sm sticky top-6">
                    <h3 className="flex items-center gap-2 text-base font-bold text-blue-800 mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" /></svg>
                      Incident Reporting Guidelines
                    </h3>
                    <ul className="space-y-2.5 text-sm text-blue-700 list-disc list-inside leading-relaxed">
                      <li>Fill out all required fields marked with <span className="text-red-500 font-bold">*</span>.</li>
                      <li>Select the correct incident type and category for faster response.</li>
                      <li>Choose the sitio/location where the incident occurred.</li>
                      <li>Add witness names if available using the <strong>+ Add Witness</strong> button.</li>
                      <li>Provide a detailed description including date, time, and circumstances.</li>
                      <li>Attach photo or video evidence if available.</li>
                      <li>Submitted reports will be reviewed by barangay officials.</li>
                      <li>False or malicious reports may be subject to appropriate action.</li>
                    </ul>
                  </div>
                </div>
              </div>
            ) : activeView === 'my_incidents' ? (
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-gray-200">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">My Incident Reports</div>
                    <div className="text-xs text-gray-500">Track submitted incident reports and their status.</div>
                  </div>
                  <div className="text-sm font-semibold text-gray-700">{incidents.length}</div>
                </div>

                {incidentsError ? (
                  <div className="p-6 text-sm text-red-700">{incidentsError}</div>
                ) : incidentsLoading ? (
                  <div className="p-6 text-sm text-gray-600">Loading…</div>
                ) : incidents.length === 0 ? (
                  <div className="p-6 text-sm text-gray-600">No incident reports found yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-gray-50 text-xs font-semibold text-gray-600">
                        <tr>
                          <th className="px-5 py-3">Tracking #</th>
                          <th className="px-5 py-3">Type</th>
                          <th className="px-5 py-3">Category</th>
                          <th className="px-5 py-3">Sitio</th>
                          <th className="px-5 py-3">Status</th>
                          <th className="px-5 py-3">Submitted</th>
                          <th className="px-5 py-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {incidents.map((row) => (
                          <tr key={row.id} className="hover:bg-gray-50">
                            <td className="px-5 py-3 font-semibold text-gray-900">{row.tracking_number ?? '-'}</td>
                            <td className="px-5 py-3 text-gray-700">{row.incident_type}</td>
                            <td className="px-5 py-3 text-gray-700">{row.incident_category}</td>
                            <td className="px-5 py-3 text-gray-700">{row.sitio}</td>
                            <td className="px-5 py-3">
                              <StatusBadge status={row.status} />
                            </td>
                            <td className="px-5 py-3 text-gray-600">{formatPhDate(row.created_at)}</td>
                            <td className="px-5 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedIncident(row);
                                  setIncidentEvidenceModal(null);
                                }}
                                className="rounded-lg border border-brand px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand/5"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="text-sm font-semibold text-gray-900">{pageTitle}</div>
                <div className="mt-2 text-sm text-gray-600">This page UI is ready. Next we can connect it to APIs.</div>
              </div>
            )}
          </main>
        </div>
      </div>

      {trackingNumber ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() => setTrackingNumber(null)}
            aria-label="Close"
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl border border-gray-100">
            <div className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Complaint Submitted</h3>
                  <p className="text-sm text-gray-600 mt-1">Save your tracking number for follow-up.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setTrackingNumber(null)}
                  className="rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-600 hover:bg-gray-100"
                >
                  Close
                </button>
              </div>
              <div className="mt-4 rounded-lg border border-brand/20 bg-brand/5 px-4 py-3 text-sm font-semibold text-brand">
                {trackingNumber}
              </div>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setTrackingNumber(null);
                    setActiveView('my_complaints');
                  }}
                  className="inline-flex items-center justify-center rounded-lg border border-brand px-4 py-2 text-sm font-semibold text-brand hover:bg-brand/5"
                >
                  View My Complaints
                </button>
                <button
                  type="button"
                  onClick={() => setTrackingNumber(null)}
                  className="inline-flex items-center justify-center rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {incidentTrackingNumber ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() => setIncidentTrackingNumber(null)}
            aria-label="Close"
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl border border-gray-100">
            <div className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Incident Report Submitted</h3>
                  <p className="text-sm text-gray-600 mt-1">Save your tracking number for follow-up.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIncidentTrackingNumber(null)}
                  className="rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-600 hover:bg-gray-100"
                >
                  Close
                </button>
              </div>
              <div className="mt-4 rounded-lg border border-brand/20 bg-brand/5 px-4 py-3 text-sm font-semibold text-brand">
                {incidentTrackingNumber}
              </div>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIncidentTrackingNumber(null);
                    setActiveView('my_incidents');
                  }}
                  className="inline-flex items-center justify-center rounded-lg border border-brand px-4 py-2 text-sm font-semibold text-brand hover:bg-brand/5"
                >
                  View My Incident Reports
                </button>
                <button
                  type="button"
                  onClick={() => setIncidentTrackingNumber(null)}
                  className="inline-flex items-center justify-center rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {selectedComplaint ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              setSelectedComplaint(null);
              setEvidencePreview(null);
            }}
            aria-label="Close"
          />
          <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-xl border border-gray-100">
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Complaint Details</h3>
                  <p className="text-sm text-gray-600 mt-1">Tracking #{selectedComplaint.tracking_number ?? '-'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedComplaint(null);
                    setEvidencePreview(null);
                  }}
                  className="rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-600 hover:bg-gray-100"
                >
                  Close
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 text-sm">
                <div>
                  <div className="text-xs text-gray-500">Status</div>
                  <div className="mt-1">
                    <StatusBadge status={selectedComplaint.status} />
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Submitted</div>
                  <div className="mt-1 font-semibold text-gray-900">{formatPhDate(selectedComplaint.created_at)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Complaint Title</div>
                  <div className="mt-1 font-semibold text-gray-900">{selectedComplaint.complaint_title}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Category</div>
                  <div className="mt-1 font-semibold text-gray-900">{selectedComplaint.complaint_category}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Respondent Name</div>
                  <div className="mt-1 font-semibold text-gray-900">{selectedComplaint.respondent_name ?? '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Respondent Sitio</div>
                  <div className="mt-1 font-semibold text-gray-900">{selectedComplaint.sitio ?? '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Witness</div>
                  <div className="mt-1 font-semibold text-gray-900">{selectedComplaint.witness ?? '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Evidence</div>
                  <div className="mt-1">
                    {selectedEvidenceUrl ? (
                      <button
                        type="button"
                        onClick={() => setEvidencePreview({ url: selectedEvidenceUrl, isVideo: selectedEvidenceIsVideo })}
                        className="text-brand font-semibold hover:text-brand/90"
                      >
                        View Attachment
                      </button>
                    ) : (
                      <span className="font-semibold text-gray-900">None</span>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-500">Description</div>
                <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 whitespace-pre-line">
                  {selectedComplaint.description}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {evidencePreview ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            onClick={() => setEvidencePreview(null)}
            aria-label="Close"
          />
          <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-xl border border-gray-100 p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="text-sm font-semibold text-gray-900">Evidence Preview</div>
              <button
                type="button"
                onClick={() => setEvidencePreview(null)}
                className="rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-600 hover:bg-gray-100"
              >
                Close
              </button>
            </div>
            {evidencePreview.isVideo ? (
              <video src={evidencePreview.url} controls className="w-full max-h-[70vh] rounded-lg" />
            ) : (
              <img src={evidencePreview.url} alt="Evidence" className="w-full max-h-[70vh] rounded-lg object-contain" />
            )}
          </div>
        </div>
      ) : null}

      {/* Incident detail modal */}
      {selectedIncident ? (() => {
        const incEvidenceUrl = selectedIncident.evidence_path
          ? `http://localhost/ULATMATIC/${selectedIncident.evidence_path}`
          : null;
        const incIsVideo = Boolean(
          selectedIncident.evidence_mime
            ? selectedIncident.evidence_mime.startsWith('video/')
            : selectedIncident.evidence_path?.match(/\.(mp4|webm|mov)$/i)
        );
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              onClick={() => { setSelectedIncident(null); setIncidentEvidenceModal(null); }}
              aria-label="Close"
            />
            <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-xl border border-gray-100">
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Incident Report Details</h3>
                    <p className="text-sm text-gray-600 mt-1">Tracking #{selectedIncident.tracking_number ?? '-'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSelectedIncident(null); setIncidentEvidenceModal(null); }}
                    className="rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-600 hover:bg-gray-100"
                  >
                    Close
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 text-sm">
                  <div>
                    <div className="text-xs text-gray-500">Status</div>
                    <div className="mt-1"><StatusBadge status={selectedIncident.status} /></div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Submitted</div>
                    <div className="mt-1 font-semibold text-gray-900">{formatPhDate(selectedIncident.created_at)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Incident Type</div>
                    <div className="mt-1 font-semibold text-gray-900">{selectedIncident.incident_type}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Category</div>
                    <div className="mt-1 font-semibold text-gray-900">{selectedIncident.incident_category}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Location / Sitio</div>
                    <div className="mt-1 font-semibold text-gray-900">{selectedIncident.sitio || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Witness</div>
                    <div className="mt-1 font-semibold text-gray-900">{selectedIncident.witness ?? '-'}</div>
                  </div>
                  {selectedIncident.resolved_at ? (
                    <div>
                      <div className="text-xs text-gray-500">Resolved At</div>
                      <div className="mt-1 font-semibold text-gray-900">{formatPhDate(selectedIncident.resolved_at)}</div>
                    </div>
                  ) : null}
                  {selectedIncident.transferred_at ? (
                    <div>
                      <div className="text-xs text-gray-500">Transferred At</div>
                      <div className="mt-1 font-semibold text-gray-900">{formatPhDate(selectedIncident.transferred_at)}</div>
                    </div>
                  ) : null}
                  <div>
                    <div className="text-xs text-gray-500">Evidence</div>
                    <div className="mt-1">
                      {incEvidenceUrl ? (
                        <button
                          type="button"
                          onClick={() => setIncidentEvidenceModal({ url: incEvidenceUrl, isVideo: incIsVideo })}
                          className="text-brand font-semibold hover:text-brand/90"
                        >
                          View Attachment
                        </button>
                      ) : (
                        <span className="font-semibold text-gray-900">None</span>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-gray-500">Description</div>
                  <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 whitespace-pre-line">
                    {selectedIncident.description}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })() : null}

      {/* Incident evidence preview modal */}
      {incidentEvidenceModal ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            onClick={() => setIncidentEvidenceModal(null)}
            aria-label="Close"
          />
          <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-xl border border-gray-100 p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="text-sm font-semibold text-gray-900">Evidence Preview</div>
              <button
                type="button"
                onClick={() => setIncidentEvidenceModal(null)}
                className="rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-600 hover:bg-gray-100"
              >
                Close
              </button>
            </div>
            {incidentEvidenceModal.isVideo ? (
              <video src={incidentEvidenceModal.url} controls className="w-full max-h-[70vh] rounded-lg" />
            ) : (
              <img src={incidentEvidenceModal.url} alt="Evidence" className="w-full max-h-[70vh] rounded-lg object-contain" />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
