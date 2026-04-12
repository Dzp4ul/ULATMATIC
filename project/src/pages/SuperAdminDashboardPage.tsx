import {
  Camera,
  ChevronDown,
  Edit3,
  Eye,
  EyeOff,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Search,
  Shield,
  User,
  Users,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NavSearch, type NavItem } from '../components/NavSearch';
import { Pagination, paginate } from '../components/Pagination';
import { resolveAssetUrl } from '../utils/api';
import logo from '../../Logo/406613648_313509771513180_7654072355038554241_n.png';

const API = '/api';

/* ─── helpers ─── */
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

type RoleKey = 'secretary' | 'captain' | 'chief' | 'pio' | 'superadmin';
const ROLES: { key: RoleKey; label: string; color: string }[] = [
  { key: 'secretary', label: 'Secretary', color: 'bg-blue-100 text-blue-700' },
  { key: 'captain', label: 'Captain', color: 'bg-emerald-100 text-emerald-700' },
  { key: 'chief', label: 'Chief', color: 'bg-amber-100 text-amber-700' },
  { key: 'pio', label: 'PIO', color: 'bg-purple-100 text-purple-700' },
  { key: 'superadmin', label: 'Super Admin', color: 'bg-red-100 text-red-700' },
];

interface RoleUser {
  id: number;
  name: string;
  email: string;
  profile_photo: string | null;
  created_at: string;
  status: string;
}

export default function SuperAdminDashboardPage({
  onNavigate,
}: {
  onNavigate: (to: string) => void;
}) {
  /* ─── state ─── */
  const [sidebarOpen, setSidebarOpen] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 1024 : true));
  const [adminName, setAdminName] = useState('');
  const [adminId, setAdminId] = useState(0);
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

  const [activeView, setActiveView] = useState<'dashboard' | 'users' | 'profile'>('dashboard');
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, [activeView]);

  // User management
  const [activeRole, setActiveRole] = useState<RoleKey>('secretary');
  const [roleUsers, setRoleUsers] = useState<Record<RoleKey, RoleUser[]>>({
    secretary: [],
    captain: [],
    chief: [],
    pio: [],
    superadmin: [],
  });
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');

  // Create / Edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [modalRole, setModalRole] = useState<RoleKey>('secretary');
  const [modalUserId, setModalUserId] = useState(0);
  const [modalName, setModalName] = useState('');
  const [modalEmail, setModalEmail] = useState('');
  const [modalPassword, setModalPassword] = useState('');
  const [showModalPassword, setShowModalPassword] = useState(false);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Toggle status
  const [toggleLoading, setToggleLoading] = useState<number | null>(null);
  const [usersPage, setUsersPage] = useState(1);
  const [selfToggleToast, setSelfToggleToast] = useState(false);

  // Dashboard stats
  const [stats, setStats] = useState<Record<RoleKey, number>>({ secretary: 0, captain: 0, chief: 0, pio: 0, superadmin: 0 });

  /* ─── fetch helpers ─── */
  const fetchRoleUsers = useCallback(async (role: RoleKey) => {
    try {
      const res = await fetch(`${API}/superadmin/list_users.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      const data = (await res.json()) as { ok?: boolean; users?: RoleUser[] };
      if (data.ok && data.users) {
        setRoleUsers((prev) => ({ ...prev, [role]: data.users! }));
        return data.users.length;
      }
    } catch { /* ignore */ }
    return 0;
  }, []);

  const loadAllUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const counts: Record<string, number> = {};
      for (const r of ROLES) {
        counts[r.key] = await fetchRoleUsers(r.key);
      }
      setStats(counts as Record<RoleKey, number>);
    } catch {
      setUsersError('Failed to load users.');
    } finally {
      setUsersLoading(false);
    }
  }, [fetchRoleUsers]);

  /* ─── auth on mount ─── */
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const raw = localStorage.getItem('ulatmatic_superadmin');
        if (!raw) { onNavigate('/signin'); return; }

        const parsed = JSON.parse(raw) as { id?: unknown; superadmin_name?: string; superadmin_email?: string };
        const id = typeof parsed.id === 'number' ? parsed.id : Number(parsed.id);
        if (!Number.isFinite(id) || id <= 0) { onNavigate('/signin'); return; }

        if (!active) return;
        setAdminId(id);
        if (parsed.superadmin_name) { setAdminName(parsed.superadmin_name); setProfileName(parsed.superadmin_name); }
        if (parsed.superadmin_email) { setProfileEmail(parsed.superadmin_email); }

        const res = await fetch(`${API}/superadmin/profile.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        });
        const data = (await res.json()) as { ok?: boolean; user?: { superadmin_name?: string; superadmin_email?: string; profile_photo?: string | null } };
        if (!active || !res.ok || !data.ok || !data.user) return;
        if (data.user.superadmin_name) { setAdminName(data.user.superadmin_name); setProfileName(data.user.superadmin_name); }
        if (data.user.superadmin_email) setProfileEmail(data.user.superadmin_email);
        setProfilePhoto(data.user.profile_photo ?? null);
      } catch { /* ignore */ }
    };
    void load();
    return () => { active = false; };
  }, [onNavigate]);

  /* ─── load all users for stats + search on mount ─── */
  useEffect(() => { void loadAllUsers(); }, [loadAllUsers]);

  /* ─── reload active role users when switching or when view enters ─── */
  useEffect(() => {
    if (activeView !== 'users') return;
    void fetchRoleUsers(activeRole);
  }, [activeView, activeRole, fetchRoleUsers]);

  /* ─── profile photo preview ─── */
  useEffect(() => {
    if (!profilePhotoFile) { setProfilePhotoPreview(null); return; }
    const url = URL.createObjectURL(profilePhotoFile);
    setProfilePhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [profilePhotoFile]);

  /* ─── close profile dropdown on outside click ─── */
  useEffect(() => {
    if (!profileMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (!profileMenuRef.current?.contains(e.target as Node)) setProfileMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [profileMenuOpen]);

  /* ─── NavSearch items ─── */
  const navItems: NavItem[] = useMemo(() => {
    const items: NavItem[] = [];
    for (const r of ROLES) {
      for (const u of roleUsers[r.key]) {
        items.push({
          label: u.name,
          category: `User Management > ${r.label}`,
          detail: u.email,
          action: () => { setActiveView('users'); setActiveRole(r.key); },
        });
      }
    }
    return items;
  }, [roleUsers]);

  /* ─── filtered users for active role tab ─── */
  const filteredUsers = useMemo(() => {
    const list = roleUsers[activeRole] ?? [];
    if (!userSearch.trim()) return list;
    const q = userSearch.toLowerCase();
    return list.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [roleUsers, activeRole, userSearch]);
  const pagedUsers = paginate(filteredUsers, usersPage);

  /* ─── modal helpers ─── */
  const openCreate = () => {
    setModalMode('create');
    setModalRole(activeRole);
    setModalUserId(0);
    setModalName('');
    setModalEmail('');
    setModalPassword('');
    setModalError(null);
    setShowModalPassword(false);
    setModalOpen(true);
  };

  const openEdit = (role: RoleKey, user: RoleUser) => {
    setModalMode('edit');
    setModalRole(role);
    setModalUserId(user.id);
    setModalName(user.name);
    setModalEmail(user.email);
    setModalPassword('');
    setModalError(null);
    setShowModalPassword(false);
    setModalOpen(true);
  };

  const handleModalSubmit = async () => {
    setModalSaving(true);
    setModalError(null);
    try {
      const endpoint = modalMode === 'create' ? 'create_user' : 'update_user';
      const body: Record<string, unknown> = {
        role: modalRole,
        name: modalName.trim(),
        email: modalEmail.trim(),
      };
      if (modalMode === 'edit') body.user_id = modalUserId;
      if (modalPassword.trim()) body.password = modalPassword.trim();
      if (modalMode === 'create' && !modalPassword.trim()) {
        setModalError('Password is required for new users.');
        setModalSaving(false);
        return;
      }

      const res = await fetch(`${API}/superadmin/${endpoint}.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setModalError(data.error ?? 'Operation failed.');
        return;
      }
      setModalOpen(false);
      void fetchRoleUsers(modalRole);
      // Update stats count
      setStats((prev) => {
        const current = roleUsers[modalRole]?.length ?? 0;
        return { ...prev, [modalRole]: modalMode === 'create' ? current + 1 : current };
      });
    } catch {
      setModalError('Network error. Please try again.');
    } finally {
      setModalSaving(false);
    }
  };

  const handleToggleStatus = async (role: RoleKey, user: RoleUser) => {
    // Block self-deactivation
    if (role === 'superadmin' && user.id === adminId && (user.status || 'active') === 'active') {
      setSelfToggleToast(true);
      setTimeout(() => setSelfToggleToast(false), 3000);
      return;
    }
    // Optimistic update
    const newStatus = (user.status || 'active') === 'active' ? 'inactive' : 'active';
    setRoleUsers((prev) => ({
      ...prev,
      [role]: prev[role].map((u) => u.id === user.id ? { ...u, status: newStatus } : u),
    }));
    setToggleLoading(user.id);
    try {
      const res = await fetch(`${API}/superadmin/toggle_status.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, user_id: user.id }),
      });
      const data = (await res.json()) as { ok?: boolean; new_status?: string; error?: string };
      if (!res.ok || !data.ok) {
        // Revert on failure
        setRoleUsers((prev) => ({
          ...prev,
          [role]: prev[role].map((u) => u.id === user.id ? { ...u, status: user.status } : u),
        }));
      }
    } catch {
      // Revert on network error
      setRoleUsers((prev) => ({
        ...prev,
        [role]: prev[role].map((u) => u.id === user.id ? { ...u, status: user.status } : u),
      }));
    } finally {
      setToggleLoading(null);
    }
  };

  /* ─── derived ─── */
  const profilePhotoUrl = resolveAssetUrl(profilePhoto);
  const profilePreviewUrl = profilePhotoPreview ?? profilePhotoUrl;
  const totalUsers = Object.values(stats).reduce((a, b) => a + b, 0);

  /* ─── render ─── */
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex min-h-screen">
        {sidebarOpen ? (
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          />
        ) : null}

        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col bg-brand text-white shadow-2xl transition-transform duration-200 lg:static lg:translate-x-0 lg:shadow-none ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center gap-3 px-6 py-5">
            <div className="flex h-10 w-10 items-center justify-center">
              <img src={logo} alt="ULATMATIC logo" className="h-10 w-10 object-contain" />
            </div>
            <div>
              <div className="text-lg font-bold leading-tight">ULATMATIC</div>
              <div className="text-xs text-white/80">Super Admin Portal</div>
            </div>
          </div>

          <div className="px-6 pb-4">
            <div className="flex items-center gap-3 rounded-xl bg-white/10 p-3">
              {profilePhotoUrl ? (
                <img src={profilePhotoUrl} alt="Admin" className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                  <Shield className="h-5 w-5 text-white/80" />
                </div>
              )}
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{adminName || 'Super Admin'}</div>
                <div className="truncate text-xs text-white/80">Super Admin</div>
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
              label="User Management"
              icon={<Users className="h-5 w-5" />}
              active={activeView === 'users'}
              onClick={() => setActiveView('users')}
            />
          </nav>

          <div className="mt-auto px-4 pb-6 pt-8">
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem('ulatmatic_superadmin');
                onNavigate('/signin');
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-200 hover:bg-red-500/20"
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Header */}
          <header className="sticky top-0 z-10 border-b border-black/5 bg-brand">
            <div className="flex items-center gap-4 px-4 py-3 lg:px-6">
              <button
                type="button"
                onClick={() => setSidebarOpen((v) => !v)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/15 lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>

              <NavSearch items={navItems} />

              <div className="relative" ref={profileMenuRef}>
                <button
                  type="button"
                  onClick={() => setProfileMenuOpen((v) => !v)}
                  className="flex items-center gap-3 rounded-full bg-white/10 px-3 py-1.5 text-left text-white hover:bg-white/15"
                >
                  <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-white/20">
                    {profilePhotoUrl ? (
                      <img src={profilePhotoUrl} alt="Admin" className="h-full w-full object-cover" />
                    ) : (
                      <Shield className="h-4 w-4 text-white/80" />
                    )}
                  </div>
                  <div className="hidden sm:block">
                    <div className="text-sm font-semibold leading-tight">{adminName || 'Super Admin'}</div>
                    <div className="text-xs text-white/70">Super Admin</div>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-white/80 transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {profileMenuOpen ? (
                  <div className="absolute right-0 mt-3 w-64 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
                    <div className="flex items-center gap-3 px-4 py-4">
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-gray-100">
                        {profilePhotoUrl ? (
                          <img src={profilePhotoUrl} alt="Admin" className="h-full w-full object-cover" />
                        ) : (
                          <Shield className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{adminName || 'Super Admin'}</div>
                        <div className="text-xs text-gray-500">{profileEmail || 'Admin Account'}</div>
                        <div className="text-xs text-gray-400">Super Admin</div>
                      </div>
                    </div>
                    <div className="border-t border-gray-100">
                      <button
                        type="button"
                        onClick={() => { setActiveView('profile'); setProfileMenuOpen(false); }}
                        className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        <User className="h-4 w-4" />
                        My Profile
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          localStorage.removeItem('ulatmatic_superadmin');
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
            {/* ── Dashboard ── */}
            {activeView === 'dashboard' ? (
              <>
                <div className="mb-5">
                  <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                  <div className="mt-1 text-sm text-gray-500">
                    Home <span className="text-gray-400">/</span> Dashboard
                  </div>
                </div>

                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {ROLES.map((r) => (
                    <StatCard
                      key={r.key}
                      title={`${r.label} Users`}
                      value={stats[r.key]}
                      icon={<Users className="h-5 w-5 text-brand" />}
                      iconBgClassName={r.color.split(' ')[0]}
                    />
                  ))}
                </section>

                <div className="mt-4">
                  <StatCard
                    title="Total Users"
                    value={totalUsers}
                    icon={<Shield className="h-5 w-5 text-brand" />}
                    iconBgClassName="bg-gray-100"
                  />
                </div>

                {/* Recent users per role */}
                <section className="mt-6 grid gap-4 xl:grid-cols-2">
                  {ROLES.map((r) => (
                    <div key={r.key} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-sm font-semibold text-gray-900">{r.label} Users</div>
                        <button
                          type="button"
                          onClick={() => { setActiveView('users'); setActiveRole(r.key); }}
                          className="text-xs font-semibold text-brand hover:text-brand/80"
                        >
                          View All →
                        </button>
                      </div>
                      {(roleUsers[r.key] ?? []).length === 0 ? (
                        <div className="py-8 text-center text-sm text-gray-400">No {r.label.toLowerCase()} users</div>
                      ) : (
                        <div className="space-y-2">
                          {(roleUsers[r.key] ?? []).slice(0, 3).map((u) => (
                            <div key={u.id} className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200">
                                <User className="h-4 w-4 text-gray-500" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-medium text-gray-900">{u.name}</div>
                                <div className="truncate text-xs text-gray-500">{u.email}</div>
                              </div>
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${r.color}`}>
                                {r.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </section>
              </>

            /* ── User Management ── */
            ) : activeView === 'users' ? (
              <>
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                    <div className="mt-1 text-sm text-gray-500">
                      Home <span className="text-gray-400">/</span> User Management
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={openCreate}
                    className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90"
                  >
                    <Plus className="h-4 w-4" />
                    Add User
                  </button>
                </div>

                {selfToggleToast ? (
                  <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                    You cannot deactivate your own account.
                  </div>
                ) : null}

                {/* Role tabs */}
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  {ROLES.map((r) => (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => setActiveRole(r.key)}
                      className={
                        activeRole === r.key
                          ? 'rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white'
                          : 'rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50'
                      }
                    >
                      {r.label} ({stats[r.key]})
                    </button>
                  ))}
                </div>

                {/* Search */}
                <div className="mb-4 flex max-w-sm items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2">
                  <Search className="h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => { setUserSearch(e.target.value); setUsersPage(1); }}
                    placeholder="Search by name or email…"
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
                  />
                </div>

                {usersError ? (
                  <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{usersError}</div>
                ) : null}

                {/* Table */}
                <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-gray-200 bg-gray-50">
                      <tr>
                        <th className="px-5 py-3 font-semibold text-gray-700">Name</th>
                        <th className="px-5 py-3 font-semibold text-gray-700">Email</th>
                        <th className="px-5 py-3 font-semibold text-gray-700">Status</th>
                        <th className="px-5 py-3 font-semibold text-gray-700">Created</th>
                        <th className="px-5 py-3 font-semibold text-gray-700 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersLoading ? (
                        <tr>
                          <td colSpan={5} className="px-5 py-8 text-center text-gray-400">Loading…</td>
                        </tr>
                      ) : filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-5 py-8 text-center text-gray-400">
                            {userSearch ? 'No matching users.' : 'No users found for this role.'}
                          </td>
                        </tr>
                      ) : (
                        pagedUsers.map((u) => (
                          <tr key={u.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
                                  {u.profile_photo ? (
                                    <img src={resolveAssetUrl(u.profile_photo) ?? ''} alt="" className="h-full w-full rounded-full object-cover" />
                                  ) : (
                                    <User className="h-4 w-4 text-gray-400" />
                                  )}
                                </div>
                                <span className="font-medium text-gray-900">{u.name}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3 text-gray-600">{u.email}</td>
                            <td className="px-5 py-3">
                              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                (u.status || 'active') === 'active'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {(u.status || 'active') === 'active' ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-gray-500">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                            <td className="px-5 py-3">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => openEdit(activeRole, u)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-brand"
                                  title="Edit"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  disabled={toggleLoading === u.id}
                                  onClick={() => handleToggleStatus(activeRole, u)}
                                  title={(u.status || 'active') === 'active' ? 'Deactivate' : 'Activate'}
                                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
                                    (u.status || 'active') === 'active' ? 'bg-emerald-500' : 'bg-gray-300'
                                  }`}
                                >
                                  <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                                      (u.status || 'active') === 'active' ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                                  />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  <Pagination total={filteredUsers.length} page={usersPage} onPage={setUsersPage} />
                </div>
              </>

            /* ── Profile ── */
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
                    if (!adminId) { setProfileError('Session not found. Please sign in again.'); return; }
                    setProfileSaving(true);
                    setProfileError(null);
                    setProfileSuccess(null);
                    try {
                      const fd = new FormData();
                      fd.append('id', String(adminId));
                      fd.append('superadmin_name', profileName.trim());
                      fd.append('superadmin_email', profileEmail.trim());
                      if (profilePhotoFile) fd.append('profile_photo', profilePhotoFile);

                      const res = await fetch(`${API}/superadmin/update_profile.php`, { method: 'POST', body: fd });
                      const data = (await res.json()) as {
                        ok?: boolean;
                        error?: string;
                        user?: { superadmin_name?: string; superadmin_email?: string; profile_photo?: string | null };
                      };
                      if (!res.ok || !data.ok || !data.user) {
                        setProfileError(data.error ?? 'Failed to update profile.');
                        return;
                      }
                      const user = data.user;
                      const nextName = user.superadmin_name ?? profileName.trim();
                      setAdminName(nextName);
                      setProfileName(nextName);
                      setProfileEmail(user.superadmin_email ?? profileEmail.trim());
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
                          <Shield className="h-10 w-10 text-gray-400" />
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
                        <div className="text-sm font-semibold text-gray-900">{adminName || 'Super Admin'}</div>
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
            ) : null}
          </main>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() => setModalOpen(false)}
            aria-label="Close"
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl border border-gray-100">
            <div className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {modalMode === 'create' ? 'Add New User' : 'Edit User'}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {modalMode === 'create'
                      ? `Create a new ${ROLES.find((r) => r.key === modalRole)?.label ?? ''} account.`
                      : 'Update user details. Leave password blank to keep unchanged.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-5 space-y-4">
                {modalMode === 'create' ? (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Role</label>
                    <select
                      value={modalRole}
                      onChange={(e) => setModalRole(e.target.value as RoleKey)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                    >
                      {ROLES.map((r) => (
                        <option key={r.key} value={r.key}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                ) : null}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={modalName}
                    onChange={(e) => setModalName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                    placeholder="Full name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={modalEmail}
                    onChange={(e) => setModalEmail(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                    placeholder="user@example.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Password{modalMode === 'edit' ? ' (leave blank to keep)' : ''}
                  </label>
                  <div className="relative">
                    <input
                      type={showModalPassword ? 'text' : 'password'}
                      value={modalPassword}
                      onChange={(e) => setModalPassword(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 pl-4 pr-11 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowModalPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      {showModalPassword ? <EyeOff className="w-4 h-4 text-gray-600" /> : <Eye className="w-4 h-4 text-gray-600" />}
                    </button>
                  </div>
                </div>

                {modalError ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{modalError}</div>
                ) : null}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={modalSaving || !modalName.trim() || !modalEmail.trim()}
                    onClick={handleModalSubmit}
                    className="flex-1 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand/90 disabled:bg-brand/60"
                  >
                    {modalSaving ? 'Saving…' : modalMode === 'create' ? 'Create User' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

    </div>
  );
}
