import {
  Camera,
  Calendar,
  ChevronDown,
  ChevronUp,
  FileCheck,
  FileText,
  FolderCheck,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Search,
  AlertCircle,
  User,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import logo from '../../Logo/406613648_313509771513180_7654072355038554241_n.png';

type ComplaintRow = {
  id: number;
  resident_id: number;
  resident_name?: string | null;
  tracking_number?: string | null;
  case_number?: string | null;
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
  has_hearing?: boolean;
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
  complaint_category?: string | null;
  resident_id: number;
  respondent_name?: string | null;
  respondent_address?: string | null;
  description?: string | null;
  created_at?: string | null;
  attempt_count?: number | null;
  resolution_type?: string | null;
  resolution_method?: string | null;
  resolution_notes?: string | null;
  resolved_at?: string | null;
};

type KpMonthData = {
  nature: { criminal: number; civil: number; others: number; total: number };
  settled: { mediation: number; conciliation: number; arbitration: number; total: number };
  unsettled: { repudiated: number; withdrawn: number; pending: number; dismissed: number; certified: number; referred: number; total: number };
  savings: number;
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
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconBgClassName}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  const styles =
    normalized === 'APPROVED' || normalized === 'RESOLVED'
      ? 'bg-emerald-100 text-emerald-700'
      : normalized === 'IN_PROGRESS' || normalized === 'ACCEPTED'
        ? 'bg-blue-100 text-blue-700'
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

const MODAL_CLOSE_DELAY_MS = 1500;

export default function SecretaryDashboardPage({
  onNavigate,
}: {
  onNavigate: (to: string) => void;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [secretaryName, setSecretaryName] = useState<string>('');
  const [secretaryId, setSecretaryId] = useState<number>(0);
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [complaintsOpen, setComplaintsOpen] = useState(false);
  const [hearingSchedulesOpen, setHearingSchedulesOpen] = useState(false);
  const [activeView, setActiveView] = useState<'dashboard' | 'profile' | 'residents' | 'complaints' | 'complaint_detail' | 'hearings' | 'hearing_detail' | 'case_resolutions' | 'case_report'>(
    'dashboard'
  );
  const [residentsTab, setResidentsTab] = useState<'pending' | 'approved'>('pending');
  const [residentsLoading, setResidentsLoading] = useState(false);
  const [residentsError, setResidentsError] = useState<string | null>(null);
  const [residents, setResidents] = useState<
    Array<{
      id: number;
      fname: string;
      midname?: string | null;
      lname?: string | null;
      email: string;
      sitio: string;
      front_id: string;
      back_id: string;
      status: string;
      created_at?: string | null;
    }>
  >([]);

  const [approvedResidents, setApprovedResidents] = useState<
    Array<{
      id: number;
      fname: string;
      midname?: string | null;
      lname?: string | null;
      email: string;
      sitio: string;
      front_id: string;
      back_id: string;
      status: string;
      created_at?: string | null;
      approved_at?: string | null;
    }>
  >([]);
  const [idPreview, setIdPreview] = useState<{ url: string; label: string } | null>(null);
  const [complaintStatus, setComplaintStatus] = useState<'ALL' | 'PENDING' | 'IN_PROGRESS' | 'CANCELLED'>('ALL');
  const [complaints, setComplaints] = useState<ComplaintRow[]>([]);
  const [complaintsLoading, setComplaintsLoading] = useState(false);
  const [complaintsError, setComplaintsError] = useState<string | null>(null);
  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintRow | null>(null);
  const [complaintActionLoading, setComplaintActionLoading] = useState(false);
  const [complaintActionError, setComplaintActionError] = useState<string | null>(null);
  const [evidencePreview, setEvidencePreview] = useState<{ url: string; isVideo: boolean } | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [hearingDate, setHearingDate] = useState('');
  const [hearingTime, setHearingTime] = useState('');
  const [hearingLocation, setHearingLocation] = useState('');
  const [hearingNotes, setHearingNotes] = useState('');
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [scheduleSuccess, setScheduleSuccess] = useState<string | null>(null);
  const [hearings, setHearings] = useState<HearingRow[]>([]);
  const [hearingsLoading, setHearingsLoading] = useState(false);
  const [hearingsError, setHearingsError] = useState<string | null>(null);
  const [hearingStatus, setHearingStatus] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'CANCELLED'>('ALL');
  const [isReschedule, setIsReschedule] = useState(false);
  const [selectedHearing, setSelectedHearing] = useState<HearingRow | null>(null);
  const [showResolutionModal, setShowResolutionModal] = useState(false);
  const [resolutionType, setResolutionType] = useState('');
  const [resolutionMethod, setResolutionMethod] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolutionLoading, setResolutionLoading] = useState(false);
  const [resolutionError, setResolutionError] = useState<string | null>(null);
  const [kpReportYear, setKpReportYear] = useState(new Date().getFullYear());
  const [kpMonths, setKpMonths] = useState<Record<number, KpMonthData>>({});
  const [kpTotals, setKpTotals] = useState<KpMonthData | null>(null);
  const [kpLoading, setKpLoading] = useState(false);
  const [caseResolutionsOpen, setCaseResolutionsOpen] = useState(false);
  const [caseResolutionFilter, setCaseResolutionFilter] = useState<'all' | 'resolved' | 'unresolved'>('all');
  const [caseResolutionHearings, setCaseResolutionHearings] = useState<HearingRow[]>([]);
  const [caseResolutionLoading, setCaseResolutionLoading] = useState(false);

  // Check if the selected complaint has a hearing when entering complaint_detail view
  useEffect(() => {
    if (activeView !== 'complaint_detail' || !selectedComplaint) return;
    if (selectedComplaint.status.toUpperCase() !== 'IN_PROGRESS') return;
    
    let active = true;
    const checkHearing = async () => {
      try {
        const res = await fetch('http://localhost/ULATMATIC/api/hearings/list.php');
        const data = (await res.json()) as { ok?: boolean; hearings?: HearingRow[] };
        if (!active || !res.ok || !data.ok || !Array.isArray(data.hearings)) return;
        
        const hasHearing = data.hearings.some(h => Number(h.complaint_id) === selectedComplaint.id);
        if (hasHearing !== selectedComplaint.has_hearing) {
          setSelectedComplaint(prev => prev ? { ...prev, has_hearing: hasHearing } : prev);
        }
      } catch { /* ignore */ }
    };
    void checkHearing();
    return () => { active = false; };
  }, [activeView, selectedComplaint?.id, selectedComplaint?.status]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const raw = localStorage.getItem('ulatmatic_secretary');
        if (!raw) {
          onNavigate('/signin');
          return;
        }

        const parsed = JSON.parse(raw) as { id?: unknown; sec_name?: string; sec_email?: string };
        const id = typeof parsed.id === 'number' ? parsed.id : Number(parsed.id);
        if (!Number.isFinite(id) || id <= 0) {
          onNavigate('/signin');
          return;
        }

        if (!active) return;
        setSecretaryId(id);
        if (parsed.sec_name) {
          setSecretaryName(parsed.sec_name);
          setProfileName(parsed.sec_name);
        }
        if (parsed.sec_email) {
          setProfileEmail(parsed.sec_email);
        }

        const res = await fetch('http://localhost/ULATMATIC/api/secretary/profile.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id }),
        });

        const data = (await res.json()) as {
          ok?: boolean;
          user?: { sec_name?: string; sec_email?: string; profile_photo?: string | null };
        };

        if (!active || !res.ok || !data.ok || !data.user) return;
        if (data.user.sec_name) {
          setSecretaryName(data.user.sec_name);
          setProfileName(data.user.sec_name);
        }
        if (data.user.sec_email) setProfileEmail(data.user.sec_email);
        setProfilePhoto(data.user.profile_photo ?? null);
      } catch {
        // ignore
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [onNavigate]);

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
    if (!profileMenuOpen) return;
    const handler = (event: MouseEvent) => {
      if (!profileMenuRef.current) return;
      if (event.target instanceof Node && profileMenuRef.current.contains(event.target)) return;
      setProfileMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [profileMenuOpen]);

  useEffect(() => {
    const loadResidents = async () => {
      if (activeView !== 'residents') return;
      setResidentsError(null);
      setResidentsLoading(true);
      try {
        const endpoint =
          residentsTab === 'pending'
            ? 'http://localhost/ULATMATIC/api/resident/list_pending.php'
            : 'http://localhost/ULATMATIC/api/resident/list_approved.php';

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        });

        const data = (await res.json()) as {
          ok?: boolean;
          error?: string;
          residents?: Array<{
            id: number | string;
            fname: string;
            midname?: string | null;
            lname?: string | null;
            email: string;
            sitio: string;
            front_id: string;
            back_id: string;
            status: string;
            created_at?: string | null;
            approved_at?: string | null;
          }>;
        };

        if (!res.ok || !data.ok || !Array.isArray(data.residents)) {
          setResidentsError(data.error ?? 'Failed to load residents');
          setResidents([]);
          setApprovedResidents([]);
          return;
        }

        const mapped = data.residents.map((r) => ({
          id: typeof r.id === 'number' ? r.id : Number(r.id),
          fname: r.fname,
          midname: r.midname,
          lname: r.lname,
          email: r.email,
          sitio: r.sitio,
          front_id: r.front_id,
          back_id: r.back_id,
          status: r.status,
          created_at: r.created_at,
          approved_at: r.approved_at,
        }));

        if (residentsTab === 'pending') {
          setResidents(mapped);
        } else {
          setApprovedResidents(mapped);
        }
      } catch {
        setResidentsError('Network error. Please try again.');
        setResidents([]);
        setApprovedResidents([]);
      } finally {
        setResidentsLoading(false);
      }
    };

    void loadResidents();
  }, [activeView, residentsTab]);

  useEffect(() => {
    const loadComplaints = async () => {
      if (activeView !== 'complaints') return;
      setComplaintsError(null);
      setComplaintsLoading(true);
      try {
        const res = await fetch('http://localhost/ULATMATIC/api/complaints/list.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ all: true, status: complaintStatus }),
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

        // Check if any complaints are IN_PROGRESS and fetch hearings to mark which ones have hearings scheduled
        const hasInProgressComplaints = mapped.some(c => c.status.toUpperCase() === 'IN_PROGRESS');
        
        if (hasInProgressComplaints) {
          try {
            const hearingsRes = await fetch('http://localhost/ULATMATIC/api/hearings/list.php');
            const hearingsData = (await hearingsRes.json()) as { ok?: boolean; hearings?: HearingRow[] };
            
            if (hearingsRes.ok && hearingsData.ok && Array.isArray(hearingsData.hearings)) {
              // Create a map of complaint_id -> has_hearing
              const hearingsMap = new Map<number, boolean>();
              hearingsData.hearings.forEach(hearing => {
                if (hearing.complaint_id) {
                  hearingsMap.set(Number(hearing.complaint_id), true);
                }
              });
              
              // Mark IN_PROGRESS complaints that have hearings
              const mappedWithHearings = mapped.map(complaint => ({
                ...complaint,
                has_hearing: complaint.status.toUpperCase() === 'IN_PROGRESS' && hearingsMap.has(complaint.id)
              }));
              setComplaints(mappedWithHearings);
            } else {
              setComplaints(mapped);
            }
          } catch {
            // If hearings fetch fails, just show complaints without hearing info
            setComplaints(mapped);
          }
        } else {
          setComplaints(mapped);
        }
      } catch {
        setComplaintsError('Network error. Please try again.');
        setComplaints([]);
      } finally {
        setComplaintsLoading(false);
      }
    };

    void loadComplaints();
  }, [activeView, complaintStatus]);

  const loadHearings = useCallback(async () => {
    if (activeView !== 'hearings') return;
    setHearingsError(null);
    setHearingsLoading(true);
    try {
      const statusParam = hearingStatus !== 'ALL' ? `?status=${hearingStatus}` : '';
      const res = await fetch(`http://localhost/ULATMATIC/api/hearings/list.php${statusParam}`);
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
  }, [activeView, hearingStatus]);

  useEffect(() => {
    void loadHearings();
  }, [loadHearings]);

  const handleResolution = async () => {
    if (!selectedHearing || resolutionLoading || !resolutionType) return;
    setResolutionError(null);
    setResolutionLoading(true);
    try {
      const res = await fetch('http://localhost/ULATMATIC/api/hearings/resolve.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hearing_id: selectedHearing.id,
          resolution_type: resolutionType,
          resolution_method: resolutionType === 'SETTLED' ? resolutionMethod : null,
          resolution_notes: resolutionNotes || null,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setResolutionError(data.error ?? 'Failed to save resolution');
        return;
      }
      setSelectedHearing({ ...selectedHearing, resolution_type: resolutionType, resolution_method: resolutionType === 'SETTLED' ? resolutionMethod : null, resolution_notes: resolutionNotes, resolved_at: new Date().toISOString(), status: resolutionType === 'PENDING' ? 'PENDING' : 'RESOLVED' });
      setShowResolutionModal(false);
      setResolutionType('');
      setResolutionMethod('');
      setResolutionNotes('');
      void loadHearings();
    } catch {
      setResolutionError('Network error. Please try again.');
    } finally {
      setResolutionLoading(false);
    }
  };

  const loadKpReport = useCallback(async () => {
    if (activeView !== 'case_report') return;
    setKpLoading(true);
    try {
      const res = await fetch(`http://localhost/ULATMATIC/api/hearings/kp_report.php?year=${kpReportYear}`);
      const data = (await res.json()) as { ok?: boolean; months?: Record<number, KpMonthData>; totals?: KpMonthData };
      if (res.ok && data.ok && data.months && data.totals) {
        setKpMonths(data.months);
        setKpTotals(data.totals);
      }
    } catch { /* ignore */ }
    finally { setKpLoading(false); }
  }, [activeView, kpReportYear]);

  useEffect(() => {
    void loadKpReport();
  }, [loadKpReport]);

  const loadCaseResolutions = useCallback(async () => {
    if (activeView !== 'case_resolutions') return;
    setCaseResolutionLoading(true);
    try {
      const params = caseResolutionFilter !== 'all' ? `?resolution=${caseResolutionFilter}` : '';
      const res = await fetch(`http://localhost/ULATMATIC/api/hearings/list.php${params}`);
      const data = (await res.json()) as { ok?: boolean; hearings?: HearingRow[] };
      if (res.ok && data.ok && Array.isArray(data.hearings)) {
        setCaseResolutionHearings(data.hearings);
      } else {
        setCaseResolutionHearings([]);
      }
    } catch {
      setCaseResolutionHearings([]);
    } finally {
      setCaseResolutionLoading(false);
    }
  }, [activeView, caseResolutionFilter]);

  useEffect(() => {
    void loadCaseResolutions();
  }, [loadCaseResolutions]);

  const handleComplaintAction = async (action: 'ACCEPT' | 'DECLINE') => {
    if (!selectedComplaint || complaintActionLoading) return;
    setComplaintActionError(null);
    setComplaintActionLoading(true);
    try {
      const res = await fetch('http://localhost/ULATMATIC/api/complaints/update_status.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: selectedComplaint.id, action }),
      });

      const data = (await res.json()) as { ok?: boolean; error?: string; status?: string; case_number?: string | null };
      if (!res.ok || !data.ok) {
        setComplaintActionError(data.error ?? 'Failed to update complaint');
        return;
      }

      const nextStatus = (data.status ?? selectedComplaint.status).toUpperCase();
      const updated: ComplaintRow = {
        ...selectedComplaint,
        status: nextStatus,
        case_number: data.case_number ?? selectedComplaint.case_number,
      };

      setSelectedComplaint(updated);
      setComplaints((prev) => {
        const next = prev.map((row) => (row.id === updated.id ? updated : row));
        if (complaintStatus === 'ALL' || nextStatus === complaintStatus) {
          return next;
        }
        return next.filter((row) => row.id !== updated.id);
      });
    } catch {
      setComplaintActionError('Network error. Please try again.');
    } finally {
      setComplaintActionLoading(false);
    }
  };

  const handleScheduleHearing = async () => {
    if (!selectedComplaint || scheduleLoading) return;
    
    setScheduleError(null);
    setScheduleSuccess(null);

    if (!hearingDate || !hearingTime || !hearingLocation) {
      setScheduleError('Please fill in all required fields');
      return;
    }

    setScheduleLoading(true);
    try {
      const res = await fetch('http://localhost/ULATMATIC/api/hearings/schedule.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          complaint_id: selectedComplaint.id,
          scheduled_date: hearingDate,
          scheduled_time: hearingTime,
          location: hearingLocation,
          notes: hearingNotes,
        }),
      });

      const data = (await res.json()) as { ok?: boolean; error?: string; hearing_id?: number };
      if (!res.ok || !data.ok) {
        setScheduleError(data.error ?? 'Failed to schedule hearing');
        return;
      }

      setScheduleSuccess(isReschedule ? 'Hearing rescheduled successfully!' : 'Hearing scheduled successfully!');
      setHearingDate('');
      setHearingTime('');
      setHearingLocation('');
      setHearingNotes('');
      setIsReschedule(false);
      
      // Mark the complaint as having a hearing in both list and selected
      setSelectedComplaint(prev => prev ? { ...prev, has_hearing: true } : prev);
      setComplaints(prev => prev.map(c => 
        c.id === selectedComplaint.id ? { ...c, has_hearing: true } : c
      ));
      
      // Reload hearings list
      void loadHearings();
      
      setTimeout(() => {
        setShowScheduleModal(false);
        setScheduleSuccess(null);
      }, MODAL_CLOSE_DELAY_MS);
    } catch {
      setScheduleError('Network error. Please try again.');
    } finally {
      setScheduleLoading(false);
    }
  };

  const stats = useMemo(
    () => [
      {
        title: 'Approved Complaints',
        value: 0,
        icon: <FileCheck className="h-5 w-5 text-blue-700" />,
        iconBgClassName: 'bg-blue-100',
      },
      {
        title: 'Pending Complaints',
        value: 0,
        icon: <FileText className="h-5 w-5 text-emerald-700" />,
        iconBgClassName: 'bg-emerald-100',
      },
      {
        title: 'Cancelled Complaints',
        value: 0,
        icon: <FolderCheck className="h-5 w-5 text-orange-700" />,
        iconBgClassName: 'bg-orange-100',
      },
      {
        title: 'Approved Hearings',
        value: 0,
        icon: <Calendar className="h-5 w-5 text-emerald-700" />,
        iconBgClassName: 'bg-emerald-100',
      },
      {
        title: 'Pending Hearings',
        value: 0,
        icon: <Calendar className="h-5 w-5 text-blue-700" />,
        iconBgClassName: 'bg-blue-100',
      },
      {
        title: 'Cancelled Hearings',
        value: 0,
        icon: <Calendar className="h-5 w-5 text-orange-700" />,
        iconBgClassName: 'bg-orange-100',
      },
    ],
    []
  );

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside
          className={
            sidebarOpen
              ? 'w-72 shrink-0 bg-brand text-white'
              : 'hidden w-72 shrink-0 bg-brand text-white lg:block'
          }
        >
          <div className="flex items-center gap-3 px-6 py-5">
            <div className="flex h-10 w-10 items-center justify-center">
              <img src={logo} alt="ULATMATIC logo" className="h-10 w-10 object-contain" />
            </div>
            <div>
              <div className="text-lg font-bold leading-tight">ULATMATIC</div>
              <div className="text-xs text-white/80">Secretary Portal</div>
            </div>
          </div>

          <div className="px-6 pb-4">
            <div className="flex items-center gap-3 rounded-xl bg-white/10 p-3">
              {profilePhotoUrl ? (
                <img src={profilePhotoUrl} alt="Secretary" className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                  <User className="h-5 w-5 text-white/80" />
                </div>
              )}
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{secretaryName || 'Barangay Secretary'}</div>
                <div className="truncate text-xs text-white/80">Barangay Secretary</div>
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
              label="Residents / Users"
              icon={<Users className="h-5 w-5" />}
              active={activeView === 'residents'}
              onClick={() => setActiveView('residents')}
            />
            <button
              type="button"
              onClick={() => setComplaintsOpen((v) => !v)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-blue-50/90 hover:bg-white/10"
            >
              <span className="text-white/80">
                <FileText className="h-5 w-5" />
              </span>
              <span className="flex-1">Complaints</span>
              <span className="text-white/80">
                {complaintsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </span>
            </button>
            {complaintsOpen ? (
              <div className="space-y-1 pl-9">
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('complaints');
                    setComplaintStatus('ALL');
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-white/90 hover:bg-white/10"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
                  <span>Report Lists</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('complaints');
                    setComplaintStatus('PENDING');
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-white/90 hover:bg-white/10"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
                  <span>Pending Complaints</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('complaints');
                    setComplaintStatus('IN_PROGRESS');
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-white/90 hover:bg-white/10"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
                  <span>Accepted Complaints</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('complaints');
                    setComplaintStatus('CANCELLED');
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-white/90 hover:bg-white/10"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
                  <span>Cancelled Complaints</span>
                </button>
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => setHearingSchedulesOpen((v) => !v)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-blue-50/90 hover:bg-white/10"
            >
              <span className="text-white/80">
                <Calendar className="h-5 w-5" />
              </span>
              <span className="flex-1">Hearing Schedules</span>
              <span className="text-white/80">
                {hearingSchedulesOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </span>
            </button>
            {hearingSchedulesOpen ? (
              <div className="space-y-1 pl-9">
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('hearings');
                    setHearingStatus('PENDING');
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-white/90 hover:bg-white/10"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
                  <span>Pending Hearing Schedules</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('hearings');
                    setHearingStatus('CANCELLED');
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-white/90 hover:bg-white/10"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
                  <span>Cancelled Hearing Schedules</span>
                </button>
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => setCaseResolutionsOpen((p) => !p)}
              className={
                activeView === 'case_resolutions'
                  ? 'flex w-full items-center gap-3 rounded-lg bg-white px-3 py-2 text-left text-sm font-semibold text-brand'
                  : 'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-blue-50/90 hover:bg-white/10'
              }
            >
              <span className={activeView === 'case_resolutions' ? 'text-brand' : 'text-white/80'}>
                <FolderCheck className="h-5 w-5" />
              </span>
              <span>Case Resolutions</span>
              {caseResolutionsOpen ? <ChevronUp className="ml-auto h-4 w-4" /> : <ChevronDown className="ml-auto h-4 w-4" />}
            </button>
            {caseResolutionsOpen ? (
              <div className="space-y-1 pl-9">
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('case_resolutions');
                    setCaseResolutionFilter('all');
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-white/90 hover:bg-white/10"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
                  <span>All Cases</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('case_resolutions');
                    setCaseResolutionFilter('resolved');
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-white/90 hover:bg-white/10"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>Resolved Cases</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('case_resolutions');
                    setCaseResolutionFilter('unresolved');
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-white/90 hover:bg-white/10"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                  <span>Unresolved Cases</span>
                </button>
              </div>
            ) : null}
            <SidebarItem label="Case Reports" icon={<FileText className="h-5 w-5" />} active={activeView === 'case_report'} onClick={() => setActiveView('case_report')} />
            <SidebarItem label="Messages" icon={<MessageCircle className="h-5 w-5" />} />
          </nav>

          <div className="mt-auto px-4 pb-6 pt-6" />
        </aside>

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Topbar */}
          <header className="sticky top-0 z-10 border-b border-black/5 bg-brand">
            <div className="flex items-center gap-4 px-4 py-3 lg:px-6">
              <button
                type="button"
                onClick={() => setSidebarOpen((v) => !v)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/15 lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="relative flex-1">
                <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                  <Search className="h-4 w-4 text-white/80" />
                </div>
                <input
                  className="h-10 w-full rounded-lg bg-white/15 pl-10 pr-3 text-sm text-white placeholder:text-white/70 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-white/25"
                  placeholder="Search"
                />
              </div>

              <div className="relative" ref={profileMenuRef}>
                <button
                  type="button"
                  onClick={() => setProfileMenuOpen((v) => !v)}
                  className="flex items-center gap-3 rounded-full bg-white/10 px-3 py-1.5 text-left text-white hover:bg-white/15"
                >
                  <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-white/20">
                    {profilePhotoUrl ? (
                      <img src={profilePhotoUrl} alt="Secretary" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-4 w-4 text-white/80" />
                    )}
                  </div>
                  <div className="hidden sm:block">
                    <div className="text-sm font-semibold leading-tight">{secretaryName || 'Secretary'}</div>
                    <div className="text-xs text-white/70">Barangay Secretary</div>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-white/80 transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {profileMenuOpen ? (
                  <div className="absolute right-0 mt-3 w-64 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
                    <div className="flex items-center gap-3 px-4 py-4">
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-gray-100">
                        {profilePhotoUrl ? (
                          <img src={profilePhotoUrl} alt="Secretary" className="h-full w-full object-cover" />
                        ) : (
                          <User className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{secretaryName || 'Barangay Secretary'}</div>
                        <div className="text-xs text-gray-500">{profileEmail || 'Secretary Account'}</div>
                        <div className="text-xs text-gray-400">Barangay Secretary</div>
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
                          localStorage.removeItem('ulatmatic_secretary');
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

          {/* Content */}
          <main className="flex-1 px-4 py-6 lg:px-8">
            {activeView === 'dashboard' ? (
              <>
                <div className="mb-5">
                  <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                  <div className="mt-1 text-sm text-gray-500">
                    Home <span className="text-gray-400">/</span> Dashboard
                  </div>
                </div>

                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {stats.map((s) => (
                    <StatCard
                      key={s.title}
                      title={s.title}
                      value={s.value}
                      icon={s.icon}
                      iconBgClassName={s.iconBgClassName}
                    />
                  ))}
                </section>

                <section className="mt-6 grid gap-4 xl:grid-cols-2">
                  <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="text-sm font-semibold text-gray-900">Total Case Reports</div>
                    <div className="mt-3 h-40 rounded-lg bg-gray-50" />
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="text-sm font-semibold text-gray-900">Total Case Resolutions</div>
                    <div className="mt-3 h-40 rounded-lg bg-gray-50" />
                  </div>
                </section>
              </>
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
                    if (!secretaryId) {
                      setProfileError('Secretary session not found. Please sign in again.');
                      return;
                    }

                    setProfileSaving(true);
                    setProfileError(null);
                    setProfileSuccess(null);
                    try {
                      const fd = new FormData();
                      fd.append('id', String(secretaryId));
                      fd.append('sec_name', profileName.trim());
                      fd.append('sec_email', profileEmail.trim());
                      if (profilePhotoFile) fd.append('profile_photo', profilePhotoFile);

                      const res = await fetch('http://localhost/ULATMATIC/api/secretary/update_profile.php', {
                        method: 'POST',
                        body: fd,
                      });
                      const data = (await res.json()) as {
                        ok?: boolean;
                        error?: string;
                        user?: { sec_name?: string; sec_email?: string; profile_photo?: string | null };
                      };

                      if (!res.ok || !data.ok || !data.user) {
                        setProfileError(data.error ?? 'Failed to update profile.');
                        return;
                      }

                      const user = data.user;
                      const nextName = user.sec_name ?? profileName.trim();
                      setSecretaryName(nextName);
                      setProfileName(nextName);
                      setProfileEmail(user.sec_email ?? profileEmail.trim());
                      setProfilePhoto(user.profile_photo ?? null);
                      setProfilePhotoFile(null);
                      if (profilePhotoInputRef.current) profilePhotoInputRef.current.value = '';
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
                        <div className="text-sm font-semibold text-gray-900">{secretaryName || 'Barangay Secretary'}</div>
                        <div className="text-xs text-gray-500">Supported formats: JPG, PNG, GIF. Max size 5MB.</div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-gray-900">Personal Information</div>
                        <span className="text-xs text-brand">Edit</span>
                      </div>
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Name</label>
                          <input
                            type="text"
                            value={profileName}
                            onChange={(e) => setProfileName(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Email Address</label>
                          <input
                            type="email"
                            value={profileEmail}
                            onChange={(e) => setProfileEmail(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                          />
                        </div>
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
            ) : activeView === 'residents' ? (
              <>
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Residents / Users</h1>
                    <div className="mt-1 text-sm text-gray-500">
                      Home <span className="text-gray-400">/</span> Residents / Users
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setResidentsTab((v) => (v === 'pending' ? 'approved' : 'pending'))}
                    className="inline-flex items-center rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90"
                  >
                    {residentsTab === 'pending' ? 'View Approved' : 'View Pending'}
                  </button>
                </div>

                {residentsError ? (
                  <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {residentsError}
                  </div>
                ) : null}

                <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-gray-200">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        {residentsTab === 'pending' ? 'Pending Residents' : 'Approved Residents'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {residentsTab === 'pending'
                          ? 'Approve or decline new resident accounts.'
                          : 'These residents can now sign in and file reports.'}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        disabled={residentsLoading}
                        onClick={() => setResidentsTab((v) => (v === 'pending' ? 'approved' : 'pending'))}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:bg-gray-50"
                      >
                        {residentsTab === 'pending' ? 'Show Approved' : 'Show Pending'}
                      </button>
                      <div className="text-sm font-semibold text-gray-700">
                        {residentsTab === 'pending' ? residents.length : approvedResidents.length}
                      </div>
                    </div>
                  </div>

                  {residentsLoading ? (
                    <div className="p-6 text-sm text-gray-600">Loading…</div>
                  ) : residentsTab === 'pending' ? (
                    residents.length === 0 ? (
                      <div className="p-6 text-sm text-gray-600">No pending residents.</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                          <thead className="bg-gray-50 text-xs font-semibold text-gray-600">
                            <tr>
                              <th className="px-5 py-3">Name</th>
                              <th className="px-5 py-3">Email</th>
                              <th className="px-5 py-3">Sitio</th>
                              <th className="px-5 py-3">IDs</th>
                              <th className="px-5 py-3">Submitted</th>
                              <th className="px-5 py-3"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {residents.map((r) => {
                              const fullName = `${r.fname} ${r.midname ?? ''} ${r.lname ?? ''}`.replace(/\s+/g, ' ').trim();
                              const frontUrl = `http://localhost/ULATMATIC/${r.front_id}`;
                              const backUrl = `http://localhost/ULATMATIC/${r.back_id}`;
                              return (
                                <tr key={r.id} className="hover:bg-gray-50">
                                  <td className="px-5 py-3 font-semibold text-gray-900">{fullName}</td>
                                  <td className="px-5 py-3 text-gray-700">{r.email}</td>
                                  <td className="px-5 py-3 text-gray-700">{r.sitio}</td>
                                  <td className="px-5 py-3">
                                    <div className="flex items-center gap-3">
                                      <button
                                        type="button"
                                        onClick={() => setIdPreview({ url: frontUrl, label: 'Front ID' })}
                                        className="text-brand hover:text-brand/90 font-semibold"
                                      >
                                        Front
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setIdPreview({ url: backUrl, label: 'Back ID' })}
                                        className="text-brand hover:text-brand/90 font-semibold"
                                      >
                                        Back
                                      </button>
                                    </div>
                                  </td>
                                  <td className="px-5 py-3 text-gray-600">{formatPhDate(r.created_at)}</td>
                                  <td className="px-5 py-3">
                                    <div className="flex items-center justify-end gap-2">
                                      <button
                                        type="button"
                                        disabled={residentsLoading}
                                        onClick={async () => {
                                          if (residentsLoading) return;
                                          setResidentsError(null);
                                          setResidentsLoading(true);
                                          try {
                                            const res = await fetch('http://localhost/ULATMATIC/api/resident/approve.php', {
                                              method: 'POST',
                                              headers: {
                                                'Content-Type': 'application/json',
                                              },
                                              body: JSON.stringify({ id: r.id }),
                                            });
                                            const data = (await res.json()) as { ok?: boolean; error?: string };
                                            if (!res.ok || !data.ok) {
                                              setResidentsError(data.error ?? 'Approve failed');
                                              return;
                                            }
                                            setResidents((prev) => prev.filter((x) => x.id !== r.id));
                                          } catch {
                                            setResidentsError('Network error. Please try again.');
                                          } finally {
                                            setResidentsLoading(false);
                                          }
                                        }}
                                        className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:bg-emerald-300"
                                      >
                                        Approve
                                      </button>
                                      <button
                                        type="button"
                                        disabled={residentsLoading}
                                        onClick={async () => {
                                          if (residentsLoading) return;
                                          setResidentsError(null);
                                          setResidentsLoading(true);
                                          try {
                                            const res = await fetch('http://localhost/ULATMATIC/api/resident/decline.php', {
                                              method: 'POST',
                                              headers: {
                                                'Content-Type': 'application/json',
                                              },
                                              body: JSON.stringify({ id: r.id }),
                                            });
                                            const data = (await res.json()) as { ok?: boolean; error?: string };
                                            if (!res.ok || !data.ok) {
                                              setResidentsError(data.error ?? 'Decline failed');
                                              return;
                                            }
                                            setResidents((prev) => prev.filter((x) => x.id !== r.id));
                                          } catch {
                                            setResidentsError('Network error. Please try again.');
                                          } finally {
                                            setResidentsLoading(false);
                                          }
                                        }}
                                        className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:bg-red-300"
                                      >
                                        Decline
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )
                  ) : approvedResidents.length === 0 ? (
                    <div className="p-6 text-sm text-gray-600">No approved residents yet.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-left text-sm">
                        <thead className="bg-gray-50 text-xs font-semibold text-gray-600">
                          <tr>
                            <th className="px-5 py-3">Name</th>
                            <th className="px-5 py-3">Email</th>
                            <th className="px-5 py-3">Sitio</th>
                            <th className="px-5 py-3">IDs</th>
                            <th className="px-5 py-3">Approved</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {approvedResidents.map((r) => {
                            const fullName = `${r.fname} ${r.midname ?? ''} ${r.lname ?? ''}`.replace(/\s+/g, ' ').trim();
                            const frontUrl = `http://localhost/ULATMATIC/${r.front_id}`;
                            const backUrl = `http://localhost/ULATMATIC/${r.back_id}`;
                            return (
                              <tr key={r.id} className="hover:bg-gray-50">
                                <td className="px-5 py-3 font-semibold text-gray-900">{fullName}</td>
                                <td className="px-5 py-3 text-gray-700">{r.email}</td>
                                <td className="px-5 py-3 text-gray-700">{r.sitio}</td>
                                <td className="px-5 py-3">
                                  <div className="flex items-center gap-3">
                                    <button
                                      type="button"
                                      onClick={() => setIdPreview({ url: frontUrl, label: 'Front ID' })}
                                      className="text-brand hover:text-brand/90 font-semibold"
                                    >
                                      Front
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setIdPreview({ url: backUrl, label: 'Back ID' })}
                                      className="text-brand hover:text-brand/90 font-semibold"
                                    >
                                      Back
                                    </button>
                                  </div>
                                </td>
                                <td className="px-5 py-3 text-gray-600">{r.approved_at ?? '-'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            ) : activeView === 'complaint_detail' ? (
              <div className="space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Complaint Details</h1>
                    <div className="mt-1 text-sm text-gray-500">
                      Home <span className="text-gray-400">/</span> Complaints <span className="text-gray-400">/</span> Details
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveView('complaints')}
                    className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Back to List
                  </button>
                </div>

                {!selectedComplaint ? (
                  <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600 shadow-sm">
                    Select a complaint from the list to view its details.
                  </div>
                ) : (
                  <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 px-6 py-4">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          Tracking #{selectedComplaint.tracking_number ?? '-'}
                        </div>
                        <div className="text-xs text-gray-500">Case #{selectedComplaint.case_number ?? '-'}</div>
                      </div>
                      {selectedComplaint.has_hearing ? (
                        <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold bg-purple-100 text-purple-700">
                          Hearing Scheduled
                        </span>
                      ) : (
                        <StatusBadge status={selectedComplaint.status} />
                      )}
                    </div>
                    <div className="space-y-6 p-6">
                      <div className="grid gap-4 sm:grid-cols-2 text-sm">
                        <div>
                          <div className="text-xs text-gray-500">Status</div>
                          <div className="mt-1">
                            {selectedComplaint.has_hearing ? (
                              <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold bg-purple-100 text-purple-700">
                                Hearing Scheduled
                              </span>
                            ) : (
                              <StatusBadge status={selectedComplaint.status} />
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Submitted</div>
                          <div className="mt-1 font-semibold text-gray-900">{formatPhDate(selectedComplaint.created_at)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Resident Name</div>
                          <div className="mt-1 font-semibold text-gray-900">{selectedComplaint.resident_name ?? '-'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Complaint Title</div>
                          <div className="mt-1 font-semibold text-gray-900">{selectedComplaint.complaint_title}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Sitio</div>
                          <div className="mt-1 font-semibold text-gray-900">{selectedComplaint.sitio}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Type</div>
                          <div className="mt-1 font-semibold text-gray-900">{selectedComplaint.complaint_type}</div>
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
                          <div className="text-xs text-gray-500">Respondent Address</div>
                          <div className="mt-1 font-semibold text-gray-900">{selectedComplaint.respondent_address ?? '-'}</div>
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

                      {complaintActionError ? (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                          {complaintActionError}
                        </div>
                      ) : null}

                      <div className="flex flex-wrap justify-end gap-2">
                        {selectedComplaint.status.toUpperCase() === 'PENDING' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleComplaintAction('DECLINE')}
                              disabled={complaintActionLoading}
                              className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                            >
                              {complaintActionLoading ? 'Processing…' : 'Decline'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleComplaintAction('ACCEPT')}
                              disabled={complaintActionLoading}
                              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-emerald-300"
                            >
                              {complaintActionLoading ? 'Processing…' : 'Accept'}
                            </button>
                          </>
                        ) : selectedComplaint.status.toUpperCase() === 'IN_PROGRESS' ? (
                          selectedComplaint.has_hearing ? (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveView('hearings');
                                  setHearingStatus('ALL');
                                }}
                                className="rounded-lg border border-purple-500 bg-purple-50 px-4 py-2 text-sm font-semibold text-purple-700 hover:bg-purple-100"
                              >
                                View Hearing Schedule
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsReschedule(true);
                                  setShowScheduleModal(true);
                                }}
                                className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
                              >
                                Reschedule
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setIsReschedule(false);
                                setShowScheduleModal(true);
                              }}
                              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90"
                            >
                              Schedule Hearing
                            </button>
                          )
                        ) : null}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : activeView === 'complaints' ? (
              <>
                <div className="mb-5">
                  <h1 className="text-2xl font-bold text-gray-900">Complaint Reports</h1>
                  <div className="mt-1 text-sm text-gray-500">
                    Home <span className="text-gray-400">/</span> Complaints
                    {complaintStatus !== 'ALL' ? (
                      <>
                        {' '}
                        <span className="text-gray-400">/</span> {complaintStatus}
                      </>
                    ) : null}
                  </div>
                </div>

                {complaintsError ? (
                  <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {complaintsError}
                  </div>
                ) : null}

                <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-gray-200">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">Complaint Reports</div>
                      <div className="text-xs text-gray-500">
                        {complaintStatus === 'ALL'
                          ? 'All complaint reports filed by residents.'
                          : `Showing ${complaintStatus.toLowerCase()} complaints.`}
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-gray-700">{complaints.length}</div>
                  </div>

                  {complaintsLoading ? (
                    <div className="p-6 text-sm text-gray-600">Loading…</div>
                  ) : complaints.length === 0 ? (
                    <div className="p-6 text-sm text-gray-600">
                      {complaintStatus === 'ALL'
                        ? 'No complaints found yet.'
                        : `No ${complaintStatus.toLowerCase()} complaints found.`}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-left text-sm">
                        <thead className="bg-gray-50 text-xs font-semibold text-gray-600">
                          <tr>
                            <th className="px-5 py-3">Tracking #</th>
                            <th className="px-5 py-3">Resident Name</th>
                            <th className="px-5 py-3">Title</th>
                            <th className="px-5 py-3">Type</th>
                            <th className="px-5 py-3">Sitio</th>
                            <th className="px-5 py-3">Status</th>
                            <th className="px-5 py-3">Submitted</th>
                            <th className="px-5 py-3 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {complaints.map((row) => (
                            <tr key={row.id} className="hover:bg-gray-50">
                              <td className="px-5 py-3 font-semibold text-gray-900">{row.tracking_number ?? '-'}</td>
                              <td className="px-5 py-3 text-gray-700">{row.resident_name ?? '-'}</td>
                              <td className="px-5 py-3 text-gray-700">
                                <div className="font-semibold text-gray-900">{row.complaint_title}</div>
                              </td>
                              <td className="px-5 py-3 text-gray-700">{row.complaint_type}</td>
                              <td className="px-5 py-3 text-gray-700">{row.sitio}</td>
                              <td className="px-5 py-3">
                                {row.has_hearing ? (
                                  <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold bg-purple-100 text-purple-700">
                                    Hearing Scheduled
                                  </span>
                                ) : (
                                  <StatusBadge status={row.status} />
                                )}
                              </td>
                              <td className="px-5 py-3 text-gray-600">{formatPhDate(row.created_at)}</td>
                              <td className="px-5 py-3 text-center">
                                {row.has_hearing ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveView('hearings');
                                      setHearingStatus('ALL');
                                    }}
                                    className="rounded-lg border border-purple-500 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-100"
                                  >
                                    View Hearing
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedComplaint(row);
                                      setEvidencePreview(null);
                                      setComplaintActionError(null);
                                      setActiveView('complaint_detail');
                                    }}
                                    className="rounded-lg border border-brand px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand/5"
                                  >
                                    View
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            ) : activeView === 'hearings' ? (
              <>
                <div className="mb-5">
                  <h1 className="text-2xl font-bold text-gray-900">Hearing Schedules</h1>
                  <div className="mt-1 text-sm text-gray-500">
                    Home <span className="text-gray-400">/</span> Hearing Schedules
                    {hearingStatus !== 'ALL' ? (
                      <>
                        {' '}
                        <span className="text-gray-400">/</span> {hearingStatus}
                      </>
                    ) : null}
                  </div>
                </div>

                {hearingsError ? (
                  <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {hearingsError}
                  </div>
                ) : null}

                <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-gray-200">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">Hearing Schedules</div>
                      <div className="text-xs text-gray-500">
                        {hearingStatus === 'ALL'
                          ? 'All scheduled hearings for complaints.'
                          : `Showing ${hearingStatus.toLowerCase()} hearings.`}
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-gray-700">{hearings.length}</div>
                  </div>

                  {hearingsLoading ? (
                    <div className="p-6 text-sm text-gray-600">Loading…</div>
                  ) : hearings.length === 0 ? (
                    <div className="p-6 text-sm text-gray-600">
                      {hearingStatus === 'ALL'
                        ? 'No hearing schedules found yet.'
                        : `No ${hearingStatus.toLowerCase()} hearings found.`}
                    </div>
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
                            <th className="px-5 py-3 text-center">Action</th>
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
                              <td className="px-5 py-3 text-gray-700">{formatPhDateOnly(row.scheduled_date)}</td>
                              <td className="px-5 py-3 text-gray-700">{row.scheduled_time}</td>
                              <td className="px-5 py-3 text-gray-700">{row.location}</td>
                              <td className="px-5 py-3">
                                <StatusBadge status={row.status} />
                              </td>
                              <td className="px-5 py-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedHearing(row);
                                      setActiveView('hearing_detail');
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
              </>
            ) : activeView === 'hearing_detail' ? (
              <div className="space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Hearing Schedule Details</h1>
                    <div className="mt-1 text-sm text-gray-500">
                      Home <span className="text-gray-400">/</span> Hearing Schedules <span className="text-gray-400">/</span> Details
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveView('hearings')}
                    className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Back to List
                  </button>
                </div>

                {!selectedHearing ? (
                  <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600 shadow-sm">
                    Select a hearing from the list to view its details.
                  </div>
                ) : (
                  <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 px-6 py-4">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          Case #{selectedHearing.case_number ?? selectedHearing.tracking_number ?? '-'}
                        </div>
                        <div className="text-xs text-gray-500">{selectedHearing.complaint_title}</div>
                      </div>
                      <StatusBadge status={selectedHearing.status} />
                    </div>
                    <div className="space-y-6 p-6">
                      <div className="grid gap-4 sm:grid-cols-2 text-sm">
                        <div>
                          <div className="text-xs text-gray-500">Complaint Title</div>
                          <div className="mt-1 font-semibold text-gray-900">{selectedHearing.complaint_title}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Complaint Type</div>
                          <div className="mt-1 font-semibold text-gray-900">{selectedHearing.complaint_type}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Tracking #</div>
                          <div className="mt-1 font-semibold text-gray-900">{selectedHearing.tracking_number ?? '-'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Case #</div>
                          <div className="mt-1 font-semibold text-gray-900">{selectedHearing.case_number ?? '-'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Scheduled Date</div>
                          <div className="mt-1 font-semibold text-gray-900">{formatPhDateOnly(selectedHearing.scheduled_date)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Scheduled Time</div>
                          <div className="mt-1 font-semibold text-gray-900">{selectedHearing.scheduled_time}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Location</div>
                          <div className="mt-1 font-semibold text-gray-900">{selectedHearing.location}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Status</div>
                          <div className="mt-1">
                            <StatusBadge status={selectedHearing.status} />
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Hearing Attempts</div>
                          <div className="mt-1 font-semibold text-gray-900">
                            <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-bold ${(selectedHearing.attempt_count ?? 1) >= 3 ? 'bg-red-100 text-red-700' : (selectedHearing.attempt_count ?? 1) >= 2 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                              {selectedHearing.attempt_count ?? 1}
                            </span>
                          </div>
                        </div>
                      </div>

                      {selectedHearing.notes ? (
                        <div>
                          <div className="text-xs text-gray-500">Notes</div>
                          <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 whitespace-pre-line">
                            {selectedHearing.notes}
                          </div>
                        </div>
                      ) : null}

                      {/* Resolution Info */}
                      {selectedHearing.resolution_type ? (
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Case Resolution</div>
                          <div className="grid gap-3 sm:grid-cols-2 text-sm">
                            <div>
                              <div className="text-xs text-gray-500">Resolution</div>
                              <div className="mt-1 font-semibold text-gray-900">{selectedHearing.resolution_type}</div>
                            </div>
                            {selectedHearing.resolution_method ? (
                              <div>
                                <div className="text-xs text-gray-500">Method</div>
                                <div className="mt-1 font-semibold text-gray-900">{selectedHearing.resolution_method}</div>
                              </div>
                            ) : null}
                            {selectedHearing.resolved_at ? (
                              <div>
                                <div className="text-xs text-gray-500">Resolved At</div>
                                <div className="mt-1 font-semibold text-gray-900">{formatPhDate(selectedHearing.resolved_at)}</div>
                              </div>
                            ) : null}
                            {selectedHearing.resolution_notes ? (
                              <div className="sm:col-span-2">
                                <div className="text-xs text-gray-500">Resolution Notes</div>
                                <div className="mt-1 text-gray-700 whitespace-pre-line">{selectedHearing.resolution_notes}</div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ) : null}

                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setResolutionType(selectedHearing.resolution_type ?? '');
                            setResolutionMethod(selectedHearing.resolution_method ?? '');
                            setResolutionNotes(selectedHearing.resolution_notes ?? '');
                            setResolutionError(null);
                            setShowResolutionModal(true);
                          }}
                          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90"
                        >
                          {selectedHearing.resolution_type ? 'Update Resolution' : 'Resolve Case'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const complaintForHearing: ComplaintRow = {
                              id: Number(selectedHearing.complaint_id),
                              resident_id: Number(selectedHearing.resident_id),
                              complaint_title: selectedHearing.complaint_title,
                              complaint_type: selectedHearing.complaint_type,
                              complaint_category: '',
                              sitio: '',
                              description: '',
                              status: 'IN_PROGRESS',
                              tracking_number: selectedHearing.tracking_number,
                              case_number: selectedHearing.case_number,
                              has_hearing: true,
                            };
                            setSelectedComplaint(complaintForHearing);
                            setIsReschedule(true);
                            setShowScheduleModal(true);
                          }}
                          className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
                        >
                          Reschedule
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : activeView === 'case_resolutions' ? (
              <div className="space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                      {caseResolutionFilter === 'resolved' ? 'Resolved Cases' : caseResolutionFilter === 'unresolved' ? 'Unresolved Cases' : 'Case Resolutions'}
                    </h1>
                    <div className="mt-1 text-sm text-gray-500">
                      Home <span className="text-gray-400">/</span> Case Resolutions
                      {caseResolutionFilter !== 'all' ? (
                        <>
                          <span className="text-gray-400"> / </span>
                          {caseResolutionFilter === 'resolved' ? 'Resolved' : 'Unresolved'}
                        </>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {(['all', 'resolved', 'unresolved'] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setCaseResolutionFilter(f)}
                        className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                          caseResolutionFilter === f
                            ? 'bg-brand text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {f === 'all' ? 'All' : f === 'resolved' ? 'Resolved' : 'Unresolved'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                  {caseResolutionLoading ? (
                    <div className="flex items-center justify-center py-16 text-gray-400">Loading cases...</div>
                  ) : caseResolutionHearings.length === 0 ? (
                    <div className="p-8 text-center text-sm text-gray-500">
                      {caseResolutionFilter === 'resolved' ? 'No resolved cases found.' : caseResolutionFilter === 'unresolved' ? 'No unresolved cases found.' : 'No cases found.'}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[900px] text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50">
                            <th className="px-5 py-3 text-left font-semibold text-gray-600">Case #</th>
                            <th className="px-5 py-3 text-left font-semibold text-gray-600">Complaint</th>
                            <th className="px-5 py-3 text-left font-semibold text-gray-600">Type</th>
                            <th className="px-5 py-3 text-left font-semibold text-gray-600">Hearing Date</th>
                            <th className="px-5 py-3 text-left font-semibold text-gray-600">Resolution</th>
                            <th className="px-5 py-3 text-left font-semibold text-gray-600">Method</th>
                            <th className="px-5 py-3 text-left font-semibold text-gray-600">Status</th>
                            <th className="px-5 py-3 text-center font-semibold text-gray-600">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {caseResolutionHearings.map((row) => (
                            <tr key={row.id} className="hover:bg-gray-50/60 transition-colors">
                              <td className="px-5 py-3 font-semibold text-gray-900">{row.case_number ?? row.tracking_number ?? '-'}</td>
                              <td className="px-5 py-3">
                                <div className="font-semibold text-gray-900">{row.complaint_title}</div>
                              </td>
                              <td className="px-5 py-3 text-gray-700">{row.complaint_type}</td>
                              <td className="px-5 py-3 text-gray-700">{formatPhDateOnly(row.scheduled_date)}</td>
                              <td className="px-5 py-3">
                                {row.resolution_type ? (
                                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                    row.resolution_type === 'SETTLED' ? 'bg-emerald-100 text-emerald-700'
                                    : row.resolution_type === 'DISMISSED' ? 'bg-red-100 text-red-700'
                                    : row.resolution_type === 'WITHDRAWN' ? 'bg-gray-100 text-gray-600'
                                    : row.resolution_type === 'PENDING' ? 'bg-orange-100 text-orange-700'
                                    : 'bg-blue-100 text-blue-700'
                                  }`}>
                                    {row.resolution_type}
                                  </span>
                                ) : (
                                  <span className="inline-flex rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700">UNRESOLVED</span>
                                )}
                              </td>
                              <td className="px-5 py-3 text-gray-700">{row.resolution_method ?? '-'}</td>
                              <td className="px-5 py-3">
                                <StatusBadge status={row.status} />
                              </td>
                              <td className="px-5 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedHearing(row);
                                    setActiveView('hearing_detail');
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
              </div>
            ) : activeView === 'case_report' ? (
              <div className="space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4 print:hidden">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">KP Compliance Monitoring Report</h1>
                    <div className="mt-1 text-sm text-gray-500">
                      Home <span className="text-gray-400">/</span> Case Reports
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      value={kpReportYear}
                      onChange={(e) => setKpReportYear(Number(e.target.value))}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                    >
                      {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90"
                    >
                      Print Report
                    </button>
                  </div>
                </div>

                {kpLoading ? (
                  <div className="flex items-center justify-center py-16 text-gray-400">Loading report...</div>
                ) : (
                  <div id="kp-report-print" className="rounded-xl border border-gray-200 bg-white shadow-sm print:shadow-none print:border-none overflow-auto">
                    <div className="p-6 text-center text-sm leading-relaxed">
                      <div className="text-xs">Republic of the Philippines</div>
                      <div className="text-xs">Province of Bulacan</div>
                      <div className="text-xs">Municipality of Norzagaray</div>
                      <div className="text-xs font-semibold">Barangay San Mateo</div>
                      <div className="mt-3 text-sm font-bold uppercase tracking-wide">Katarungang Pambarangay</div>
                      <div className="text-xs font-semibold">Compliance Monitoring Form</div>
                      <div className="text-xs text-gray-500 mt-1">Year: {kpReportYear}</div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[1100px] border-collapse text-xs">
                        <thead>
                          <tr className="bg-gray-100 border-b border-gray-300">
                            <th rowSpan={2} className="border border-gray-300 px-2 py-2 text-center font-semibold">Month</th>
                            <th colSpan={4} className="border border-gray-300 px-2 py-1 text-center font-semibold">Nature of Dispute</th>
                            <th colSpan={4} className="border border-gray-300 px-2 py-1 text-center font-semibold">Settled Cases</th>
                            <th colSpan={7} className="border border-gray-300 px-2 py-1 text-center font-semibold">Unsettled Cases</th>
                            <th rowSpan={2} className="border border-gray-300 px-2 py-2 text-center font-semibold">Est. Gov&apos;t Savings</th>
                          </tr>
                          <tr className="bg-gray-50 border-b border-gray-300">
                            <th className="border border-gray-300 px-1 py-1 text-center">Criminal<br/><span className="text-[10px] text-gray-400">2a.1</span></th>
                            <th className="border border-gray-300 px-1 py-1 text-center">Civil<br/><span className="text-[10px] text-gray-400">2a.2</span></th>
                            <th className="border border-gray-300 px-1 py-1 text-center">Others<br/><span className="text-[10px] text-gray-400">2a.3</span></th>
                            <th className="border border-gray-300 px-1 py-1 text-center font-bold">Total<br/><span className="text-[10px] text-gray-400">2a.4</span></th>
                            <th className="border border-gray-300 px-1 py-1 text-center">Mediation<br/><span className="text-[10px] text-gray-400">2b.1</span></th>
                            <th className="border border-gray-300 px-1 py-1 text-center">Conciliation<br/><span className="text-[10px] text-gray-400">2b.2</span></th>
                            <th className="border border-gray-300 px-1 py-1 text-center">Arbitration<br/><span className="text-[10px] text-gray-400">2b.3</span></th>
                            <th className="border border-gray-300 px-1 py-1 text-center font-bold">Total<br/><span className="text-[10px] text-gray-400">2b.4</span></th>
                            <th className="border border-gray-300 px-1 py-1 text-center">Repudiated<br/><span className="text-[10px] text-gray-400">2c.1</span></th>
                            <th className="border border-gray-300 px-1 py-1 text-center">Withdrawn<br/><span className="text-[10px] text-gray-400">2c.2</span></th>
                            <th className="border border-gray-300 px-1 py-1 text-center">Pending<br/><span className="text-[10px] text-gray-400">2c.3</span></th>
                            <th className="border border-gray-300 px-1 py-1 text-center">Dismissed<br/><span className="text-[10px] text-gray-400">2c.4</span></th>
                            <th className="border border-gray-300 px-1 py-1 text-center">Certified<br/><span className="text-[10px] text-gray-400">2c.5</span></th>
                            <th className="border border-gray-300 px-1 py-1 text-center">Referred<br/><span className="text-[10px] text-gray-400">2c.6</span></th>
                            <th className="border border-gray-300 px-1 py-1 text-center font-bold">Total<br/><span className="text-[10px] text-gray-400">2c.7</span></th>
                          </tr>
                        </thead>
                        <tbody>
                          {['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'].map((label, idx) => {
                            const m = kpMonths[idx + 1];
                            const n = m?.nature ?? { criminal: 0, civil: 0, others: 0, total: 0 };
                            const s = m?.settled ?? { mediation: 0, conciliation: 0, arbitration: 0, total: 0 };
                            const u = m?.unsettled ?? { repudiated: 0, withdrawn: 0, pending: 0, dismissed: 0, certified: 0, referred: 0, total: 0 };
                            const sv = m?.savings ?? 0;
                            return (
                              <tr key={label} className="hover:bg-gray-50">
                                <td className="border border-gray-300 px-2 py-1.5 text-center font-semibold">{label}</td>
                                <td className="border border-gray-300 px-2 py-1.5 text-center">{n.criminal || '-'}</td>
                                <td className="border border-gray-300 px-2 py-1.5 text-center">{n.civil || '-'}</td>
                                <td className="border border-gray-300 px-2 py-1.5 text-center">{n.others || '-'}</td>
                                <td className="border border-gray-300 px-2 py-1.5 text-center font-bold">{n.total || '-'}</td>
                                <td className="border border-gray-300 px-2 py-1.5 text-center">{s.mediation || '-'}</td>
                                <td className="border border-gray-300 px-2 py-1.5 text-center">{s.conciliation || '-'}</td>
                                <td className="border border-gray-300 px-2 py-1.5 text-center">{s.arbitration || '-'}</td>
                                <td className="border border-gray-300 px-2 py-1.5 text-center font-bold">{s.total || '-'}</td>
                                <td className="border border-gray-300 px-2 py-1.5 text-center">{u.repudiated || '-'}</td>
                                <td className="border border-gray-300 px-2 py-1.5 text-center">{u.withdrawn || '-'}</td>
                                <td className="border border-gray-300 px-2 py-1.5 text-center">{u.pending || '-'}</td>
                                <td className="border border-gray-300 px-2 py-1.5 text-center">{u.dismissed || '-'}</td>
                                <td className="border border-gray-300 px-2 py-1.5 text-center">{u.certified || '-'}</td>
                                <td className="border border-gray-300 px-2 py-1.5 text-center">{u.referred || '-'}</td>
                                <td className="border border-gray-300 px-2 py-1.5 text-center font-bold">{u.total || '-'}</td>
                                <td className="border border-gray-300 px-2 py-1.5 text-right">
                                  {sv > 0 ? `₱${sv.toLocaleString()}` : '-'}
                                </td>
                              </tr>
                            );
                          })}
                          {kpTotals ? (
                            <tr className="bg-gray-100 font-bold">
                              <td className="border border-gray-300 px-2 py-2 text-center">TOTAL</td>
                              <td className="border border-gray-300 px-2 py-2 text-center">{kpTotals.nature.criminal || '-'}</td>
                              <td className="border border-gray-300 px-2 py-2 text-center">{kpTotals.nature.civil || '-'}</td>
                              <td className="border border-gray-300 px-2 py-2 text-center">{kpTotals.nature.others || '-'}</td>
                              <td className="border border-gray-300 px-2 py-2 text-center">{kpTotals.nature.total || '-'}</td>
                              <td className="border border-gray-300 px-2 py-2 text-center">{kpTotals.settled.mediation || '-'}</td>
                              <td className="border border-gray-300 px-2 py-2 text-center">{kpTotals.settled.conciliation || '-'}</td>
                              <td className="border border-gray-300 px-2 py-2 text-center">{kpTotals.settled.arbitration || '-'}</td>
                              <td className="border border-gray-300 px-2 py-2 text-center">{kpTotals.settled.total || '-'}</td>
                              <td className="border border-gray-300 px-2 py-2 text-center">{kpTotals.unsettled.repudiated || '-'}</td>
                              <td className="border border-gray-300 px-2 py-2 text-center">{kpTotals.unsettled.withdrawn || '-'}</td>
                              <td className="border border-gray-300 px-2 py-2 text-center">{kpTotals.unsettled.pending || '-'}</td>
                              <td className="border border-gray-300 px-2 py-2 text-center">{kpTotals.unsettled.dismissed || '-'}</td>
                              <td className="border border-gray-300 px-2 py-2 text-center">{kpTotals.unsettled.certified || '-'}</td>
                              <td className="border border-gray-300 px-2 py-2 text-center">{kpTotals.unsettled.referred || '-'}</td>
                              <td className="border border-gray-300 px-2 py-2 text-center">{kpTotals.unsettled.total || '-'}</td>
                              <td className="border border-gray-300 px-2 py-2 text-right">
                                {kpTotals.savings > 0 ? `₱${kpTotals.savings.toLocaleString()}` : '-'}
                              </td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>

                    <div className="p-6 text-xs text-gray-500">
                      <div className="italic">*Estimated Government Savings: ₱9,500.00 per settled case</div>
                      <div className="mt-6 grid gap-8 sm:grid-cols-2 text-sm text-gray-800">
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Prepared by:</div>
                          <div className="border-b border-gray-400 pb-1 font-semibold">{secretaryName || 'Barangay Secretary/Lupon'}</div>
                          <div className="text-xs text-gray-500 mt-0.5">Barangay Secretary / Lupon</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Certified by:</div>
                          <div className="border-b border-gray-400 pb-1 font-semibold">___________________________</div>
                          <div className="text-xs text-gray-500 mt-0.5">Punong Barangay</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </main>
        </div>
      </div>
      {idPreview ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            onClick={() => setIdPreview(null)}
            aria-label="Close"
          />
          <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-xl border border-gray-100 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-gray-900">{idPreview.label}</div>
              <button
                type="button"
                onClick={() => setIdPreview(null)}
                className="rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-600 hover:bg-gray-100"
              >
                Close
              </button>
            </div>
            {idPreview.url.match(/\.pdf(\?|$)/i) ? (
              <iframe title={idPreview.label} src={idPreview.url} className="w-full h-[70vh] rounded-lg" />
            ) : (
              <img src={idPreview.url} alt={idPreview.label} className="w-full max-h-[70vh] rounded-lg object-contain" />
            )}
          </div>
        </div>
      ) : null}
      {showScheduleModal ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              setShowScheduleModal(false);
              setScheduleError(null);
              setScheduleSuccess(null);
            }}
            aria-label="Close"
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl border border-gray-100 p-6">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-900">{isReschedule ? 'Reschedule Hearing' : 'Schedule Hearing'}</h2>
              <p className="mt-1 text-sm text-gray-500">
                {isReschedule ? 'Reschedule' : 'Schedule'} a hearing for case #{selectedComplaint?.case_number || selectedComplaint?.tracking_number}
              </p>
            </div>

            {scheduleError ? (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {scheduleError}
              </div>
            ) : null}

            {scheduleSuccess ? (
              <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                {scheduleSuccess}
              </div>
            ) : null}

            <div className="space-y-4">
              <div>
                <label htmlFor="hearing-date" className="block text-sm font-medium text-gray-700 mb-1">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  id="hearing-date"
                  type="date"
                  value={hearingDate}
                  onChange={(e) => setHearingDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                  required
                />
              </div>

              <div>
                <label htmlFor="hearing-time" className="block text-sm font-medium text-gray-700 mb-1">
                  Time <span className="text-red-500">*</span>
                </label>
                <input
                  id="hearing-time"
                  type="time"
                  value={hearingTime}
                  onChange={(e) => setHearingTime(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                  required
                />
              </div>

              <div>
                <label htmlFor="hearing-location" className="block text-sm font-medium text-gray-700 mb-1">
                  Location <span className="text-red-500">*</span>
                </label>
                <input
                  id="hearing-location"
                  type="text"
                  value={hearingLocation}
                  onChange={(e) => setHearingLocation(e.target.value)}
                  placeholder="e.g., Barangay Hall"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                  required
                />
              </div>

              <div>
                <label htmlFor="hearing-notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  id="hearing-notes"
                  value={hearingNotes}
                  onChange={(e) => setHearingNotes(e.target.value)}
                  placeholder="Additional notes or instructions..."
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowScheduleModal(false);
                  setScheduleError(null);
                  setScheduleSuccess(null);
                }}
                disabled={scheduleLoading}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleScheduleHearing}
                disabled={scheduleLoading}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90 disabled:bg-brand/60"
              >
                {scheduleLoading ? 'Scheduling...' : isReschedule ? 'Reschedule Hearing' : 'Schedule Hearing'}
              </button>
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
      {showResolutionModal ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            onClick={() => { setShowResolutionModal(false); setResolutionError(null); }}
            aria-label="Close"
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl border border-gray-100 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Case Resolution</h2>
            <p className="text-sm text-gray-500 mb-4">
              Set the resolution for Case #{selectedHearing?.case_number ?? selectedHearing?.tracking_number ?? '-'}
            </p>

            {resolutionError ? (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{resolutionError}</div>
            ) : null}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Resolution Type <span className="text-red-500">*</span></label>
                <select
                  value={resolutionType}
                  onChange={(e) => setResolutionType(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  <option value="">Select resolution...</option>
                  <option value="SETTLED">Settled</option>
                  <option value="REPUDIATED">Repudiated</option>
                  <option value="WITHDRAWN">Withdrawn</option>
                  <option value="PENDING">Pending</option>
                  <option value="DISMISSED">Case Dismissed</option>
                  <option value="CERTIFIED">Certified to File Action</option>
                  <option value="REFERRED">Referred to Other Agency</option>
                </select>
              </div>

              {resolutionType === 'SETTLED' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Settlement Method <span className="text-red-500">*</span></label>
                  <select
                    value={resolutionMethod}
                    onChange={(e) => setResolutionMethod(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                  >
                    <option value="">Select method...</option>
                    <option value="MEDIATION">Mediation</option>
                    <option value="CONCILIATION">Conciliation</option>
                    <option value="ARBITRATION">Arbitration</option>
                  </select>
                </div>
              ) : null}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Additional notes about the resolution..."
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setShowResolutionModal(false); setResolutionError(null); }}
                disabled={resolutionLoading}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResolution}
                disabled={resolutionLoading || !resolutionType || (resolutionType === 'SETTLED' && !resolutionMethod)}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90 disabled:bg-brand/60"
              >
                {resolutionLoading ? 'Saving...' : 'Save Resolution'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
