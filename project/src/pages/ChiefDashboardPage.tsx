import {
  AlertCircle,
  Camera,
  ChevronDown,
  FileCheck,
  FileText,
  FolderCheck,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  User,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import logo from '../../Logo/406613648_313509771513180_7654072355038554241_n.png';
import { FileDropzone } from '../components/FileDropzone';

type IncidentStatus = 'PENDING' | 'RESOLVED' | 'TRANSFERRED' | 'ALL';

type IncidentRow = {
  id: number;
  resident_id: number | null;
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

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  const styles =
    normalized === 'RESOLVED'
      ? 'bg-emerald-100 text-emerald-700'
      : normalized === 'TRANSFERRED'
        ? 'bg-blue-100 text-blue-700'
        : 'bg-orange-100 text-orange-700';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles}`}>{status}</span>;
}

export default function ChiefDashboardPage({
  onNavigate,
}: {
  onNavigate: (to: string) => void;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chiefName, setChiefName] = useState<string>('');
  const [chiefId, setChiefId] = useState<number>(0);
  const [activeView, setActiveView] = useState<'dashboard' | 'incidents' | 'profile'>('dashboard');
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
  const [incidentStatus, setIncidentStatus] = useState<IncidentStatus>('PENDING');
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [incidentsLoading, setIncidentsLoading] = useState(false);
  const [incidentsError, setIncidentsError] = useState<string | null>(null);
  const [incidentActionId, setIncidentActionId] = useState<number | null>(null);
  const [summary, setSummary] = useState({ pending: 0, resolved: 0, transferred: 0 });

  const loadSummary = async () => {
    try {
      const res = await fetch('http://localhost/ULATMATIC/api/incidents/list.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'ALL' }),
      });

      const data = (await res.json()) as { ok?: boolean; incidents?: IncidentRow[] };
      if (!res.ok || !data.ok || !Array.isArray(data.incidents)) return;

      const next = { pending: 0, resolved: 0, transferred: 0 };
      data.incidents.forEach((row) => {
        const status = row.status?.toUpperCase();
        if (status === 'RESOLVED') next.resolved += 1;
        else if (status === 'TRANSFERRED') next.transferred += 1;
        else next.pending += 1;
      });
      setSummary(next);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const raw = localStorage.getItem('ulatmatic_chief');
        if (!raw) {
          onNavigate('/signin');
          return;
        }

        const parsed = JSON.parse(raw) as { id?: unknown; chief_name?: string; chief_email?: string };
        const id = typeof parsed.id === 'number' ? parsed.id : Number(parsed.id);
        if (!Number.isFinite(id) || id <= 0) {
          onNavigate('/signin');
          return;
        }

        if (!active) return;
        setChiefId(id);
        if (parsed.chief_name) {
          setChiefName(parsed.chief_name);
          setProfileName(parsed.chief_name);
        }
        if (parsed.chief_email) {
          setProfileEmail(parsed.chief_email);
        }

        const res = await fetch('http://localhost/ULATMATIC/api/chief/profile.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id }),
        });

        const data = (await res.json()) as {
          ok?: boolean;
          user?: { chief_name?: string; chief_email?: string; profile_photo?: string | null };
        };

        if (!active || !res.ok || !data.ok || !data.user) return;
        if (data.user.chief_name) {
          setChiefName(data.user.chief_name);
          setProfileName(data.user.chief_name);
        }
        if (data.user.chief_email) setProfileEmail(data.user.chief_email);
        setProfilePhoto(data.user.profile_photo ?? null);
      } catch {
        // ignore
      }
    };

    void load();
    void loadSummary();
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
    const loadIncidents = async () => {
      if (activeView !== 'incidents') return;
      setIncidentsError(null);
      setIncidentsLoading(true);
      try {
        const res = await fetch('http://localhost/ULATMATIC/api/incidents/list.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: incidentStatus }),
        });

        const data = (await res.json()) as { ok?: boolean; error?: string; incidents?: IncidentRow[] };
        if (!res.ok || !data.ok || !Array.isArray(data.incidents)) {
          setIncidentsError(data.error ?? 'Failed to load incidents');
          setIncidents([]);
          return;
        }

        const mapped = data.incidents.map((row) => ({
          ...row,
          id: typeof row.id === 'number' ? row.id : Number(row.id),
          resident_id: row.resident_id == null ? null : Number(row.resident_id),
        }));
        setIncidents(mapped);
      } catch {
        setIncidentsError('Network error. Please try again.');
        setIncidents([]);
      } finally {
        setIncidentsLoading(false);
      }
    };

    void loadIncidents();
  }, [activeView, incidentStatus]);

  const stats = useMemo(
    () => [
      {
        title: 'Pending Incidents',
        value: summary.pending,
        icon: <AlertCircle className="h-5 w-5 text-orange-700" />,
        iconBgClassName: 'bg-orange-100',
      },
      {
        title: 'Resolved Incidents',
        value: summary.resolved,
        icon: <FileCheck className="h-5 w-5 text-emerald-700" />,
        iconBgClassName: 'bg-emerald-100',
      },
      {
        title: 'Transferred to Complaint',
        value: summary.transferred,
        icon: <FolderCheck className="h-5 w-5 text-blue-700" />,
        iconBgClassName: 'bg-blue-100',
      },
    ],
    [summary]
  );
  const profilePhotoUrl = profilePhoto ? `http://localhost/ULATMATIC/${profilePhoto}` : null;
  const profilePreviewUrl = profilePhotoPreview ?? profilePhotoUrl;

  const handleResolve = async (id: number) => {
    if (!window.confirm('Mark this incident as resolved?')) return;
    setIncidentActionId(id);
    setIncidentsError(null);
    try {
      const res = await fetch('http://localhost/ULATMATIC/api/incidents/resolve.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });

      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setIncidentsError(data.error ?? 'Failed to resolve incident');
        return;
      }

      if (incidentStatus === 'PENDING') {
        setIncidents((prev) => prev.filter((row) => row.id !== id));
      } else if (incidentStatus === 'ALL') {
        setIncidents((prev) => prev.map((row) => (row.id === id ? { ...row, status: 'RESOLVED' } : row)));
      }
      await loadSummary();
    } catch {
      setIncidentsError('Network error. Please try again.');
    } finally {
      setIncidentActionId(null);
    }
  };

  const handleTransfer = async (id: number) => {
    if (!window.confirm('Transfer this incident into a complaint record?')) return;
    setIncidentActionId(id);
    setIncidentsError(null);
    try {
      const res = await fetch('http://localhost/ULATMATIC/api/incidents/transfer.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });

      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setIncidentsError(data.error ?? 'Failed to transfer incident');
        return;
      }

      if (incidentStatus === 'PENDING') {
        setIncidents((prev) => prev.filter((row) => row.id !== id));
      } else if (incidentStatus === 'ALL') {
        setIncidents((prev) => prev.map((row) => (row.id === id ? { ...row, status: 'TRANSFERRED' } : row)));
      }
      await loadSummary();
    } catch {
      setIncidentsError('Network error. Please try again.');
    } finally {
      setIncidentActionId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex min-h-screen">
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
              <div className="text-xs text-white/80">Chief Barangay Portal</div>
            </div>
          </div>

          <div className="px-6 pb-4">
            <button
              type="button"
              onClick={() => setActiveView('profile')}
              className="flex w-full items-center gap-3 rounded-xl bg-white/10 p-3 text-left hover:bg-white/15"
            >
              {profilePhotoUrl ? (
                <img src={profilePhotoUrl} alt="Chief" className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                  <User className="h-5 w-5 text-white/80" />
                </div>
              )}
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{chiefName || 'Chief Barangay'}</div>
                <div className="truncate text-xs text-white/80">Incident Officer</div>
              </div>
            </button>
          </div>

          <nav className="space-y-1 px-4">
            <SidebarItem
              label="Dashboard"
              icon={<LayoutDashboard className="h-5 w-5" />}
              active={activeView === 'dashboard'}
              onClick={() => setActiveView('dashboard')}
            />
            <SidebarItem
              label="Incident Reports"
              icon={<FileText className="h-5 w-5" />}
              active={activeView === 'incidents' && incidentStatus === 'PENDING'}
              onClick={() => {
                setActiveView('incidents');
                setIncidentStatus('PENDING');
              }}
            />
            <SidebarItem
              label="Resolved Reports"
              icon={<FileCheck className="h-5 w-5" />}
              active={activeView === 'incidents' && incidentStatus === 'RESOLVED'}
              onClick={() => {
                setActiveView('incidents');
                setIncidentStatus('RESOLVED');
              }}
            />
            <SidebarItem
              label="Transferred Reports"
              icon={<FolderCheck className="h-5 w-5" />}
              active={activeView === 'incidents' && incidentStatus === 'TRANSFERRED'}
              onClick={() => {
                setActiveView('incidents');
                setIncidentStatus('TRANSFERRED');
              }}
            />
            <SidebarItem
              label="All Records"
              icon={<AlertCircle className="h-5 w-5" />}
              active={activeView === 'incidents' && incidentStatus === 'ALL'}
              onClick={() => {
                setActiveView('incidents');
                setIncidentStatus('ALL');
              }}
            />
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
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
                      <img src={profilePhotoUrl} alt="Chief" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-4 w-4 text-white/80" />
                    )}
                  </div>
                  <div className="hidden sm:block">
                    <div className="text-sm font-semibold leading-tight">{chiefName || 'Chief Barangay'}</div>
                    <div className="text-xs text-white/70">Incident Officer</div>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-white/80 transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {profileMenuOpen ? (
                  <div className="absolute right-0 mt-3 w-64 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
                    <div className="flex items-center gap-3 px-4 py-4">
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-gray-100">
                        {profilePhotoUrl ? (
                          <img src={profilePhotoUrl} alt="Chief" className="h-full w-full object-cover" />
                        ) : (
                          <User className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{chiefName || 'Chief Barangay'}</div>
                        <div className="text-xs text-gray-500">{profileEmail || 'Chief Account'}</div>
                        <div className="text-xs text-gray-400">Incident Officer</div>
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
                          localStorage.removeItem('ulatmatic_chief');
                          onNavigate('/');
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
                    <StatCard key={s.title} title={s.title} value={s.value} icon={s.icon} iconBgClassName={s.iconBgClassName} />
                  ))}
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
                    if (!chiefId) {
                      setProfileError('Chief session not found. Please sign in again.');
                      return;
                    }

                    setProfileSaving(true);
                    setProfileError(null);
                    setProfileSuccess(null);
                    try {
                      const fd = new FormData();
                      fd.append('id', String(chiefId));
                      fd.append('chief_name', profileName.trim());
                      fd.append('chief_email', profileEmail.trim());
                      if (profilePhotoFile) fd.append('profile_photo', profilePhotoFile);

                      const res = await fetch('http://localhost/ULATMATIC/api/chief/update_profile.php', {
                        method: 'POST',
                        body: fd,
                      });
                      const data = (await res.json()) as {
                        ok?: boolean;
                        error?: string;
                        user?: { chief_name?: string; chief_email?: string; profile_photo?: string | null };
                      };

                      if (!res.ok || !data.ok || !data.user) {
                        setProfileError(data.error ?? 'Failed to update profile.');
                        return;
                      }

                      const user = data.user;
                      const nextName = user.chief_name ?? profileName.trim();
                      setChiefName(nextName);
                      setProfileName(nextName);
                      setProfileEmail(user.chief_email ?? profileEmail.trim());
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
                        <div className="text-sm font-semibold text-gray-900">{chiefName || 'Chief Barangay'}</div>
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
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Email</label>
                          <input
                            type="email"
                            value={profileEmail}
                            onChange={(e) => setProfileEmail(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                          />
                        </div>
                      </div>

                      {profileError ? (
                        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                          {profileError}
                        </div>
                      ) : null}
                      {profileSuccess ? (
                        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                          {profileSuccess}
                        </div>
                      ) : null}

                      <div className="mt-6 flex items-center justify-end gap-3">
                        <button
                          type="submit"
                          disabled={profileSaving}
                          className="inline-flex items-center rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand/90 disabled:bg-brand/70"
                        >
                          {profileSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            ) : (
              <>
                <div className="mb-5">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Incident Reports</h1>
                    <div className="mt-1 text-sm text-gray-500">
                      Home <span className="text-gray-400">/</span> Incident Reports & Records
                    </div>
                  </div>
                </div>

                {incidentsError ? (
                  <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {incidentsError}
                  </div>
                ) : null}

                <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-gray-200">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">Incident Records</div>
                      <div className="text-xs text-gray-500">Manage incidents and transfer unresolved cases to complaints.</div>
                    </div>
                    <div className="text-sm font-semibold text-gray-700">{incidents.length}</div>
                  </div>

                  {incidentsLoading ? (
                    <div className="p-6 text-sm text-gray-600">Loading…</div>
                  ) : incidents.length === 0 ? (
                    <div className="p-6 text-sm text-gray-600">No incidents found for this filter.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-left text-sm">
                        <thead className="bg-gray-50 text-xs font-semibold text-gray-600">
                          <tr>
                            <th className="px-5 py-3">Type</th>
                            <th className="px-5 py-3">Category</th>
                            <th className="px-5 py-3">Sitio</th>
                            <th className="px-5 py-3">Description</th>
                            <th className="px-5 py-3">Evidence</th>
                            <th className="px-5 py-3">Status</th>
                            <th className="px-5 py-3">Submitted</th>
                            <th className="px-5 py-3"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {incidents.map((row) => {
                            const evidenceUrl = row.evidence_path
                              ? `http://localhost/ULATMATIC/${row.evidence_path}`
                              : null;
                            return (
                              <tr key={row.id} className="hover:bg-gray-50">
                                <td className="px-5 py-3 font-semibold text-gray-900">{row.incident_type}</td>
                                <td className="px-5 py-3 text-gray-700">{row.incident_category}</td>
                                <td className="px-5 py-3 text-gray-700">{row.sitio}</td>
                                <td className="px-5 py-3 text-gray-600">
                                  <div className="line-clamp-2 max-w-xs">{row.description}</div>
                                  {row.witness ? <div className="mt-1 text-xs text-gray-500">Witness: {row.witness}</div> : null}
                                </td>
                                <td className="px-5 py-3">
                                  {evidenceUrl ? (
                                    <a
                                      href={evidenceUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-brand hover:text-brand/90 font-semibold"
                                    >
                                      View
                                    </a>
                                  ) : (
                                    <span className="text-xs text-gray-400">None</span>
                                  )}
                                </td>
                                <td className="px-5 py-3">
                                  <StatusBadge status={row.status} />
                                </td>
                                <td className="px-5 py-3 text-gray-600">{row.created_at ?? '-'}</td>
                                <td className="px-5 py-3">
                                  {row.status.toUpperCase() === 'PENDING' ? (
                                    <div className="flex items-center justify-end gap-2">
                                      <button
                                        type="button"
                                        disabled={incidentActionId === row.id}
                                        onClick={() => handleResolve(row.id)}
                                        className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:bg-emerald-300"
                                      >
                                        Resolve
                                      </button>
                                      <button
                                        type="button"
                                        disabled={incidentActionId === row.id}
                                        onClick={() => handleTransfer(row.id)}
                                        className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300"
                                      >
                                        Transfer
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="text-xs text-gray-400 text-right">No action</div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
