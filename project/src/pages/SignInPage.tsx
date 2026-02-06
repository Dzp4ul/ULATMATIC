import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import logo from '../../Logo/406613648_313509771513180_7654072355038554241_n.png';

export default function SignInPage({ onNavigate }: { onNavigate: (to: string) => void }) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="min-h-screen grid lg:grid-cols-2">
        <div className="hidden lg:flex flex-col items-center text-center justify-center px-14 bg-brand border-r border-black/5">
          <div className="flex flex-col items-center mb-6">
            <img src={logo} alt="ULATMATIC logo" className="w-28 h-28 object-contain" />
            <h1 className="mt-6 text-3xl font-bold text-white">Barangay Bigte, Norzagaray, Bulacan</h1>
            <p className="mt-2 text-base text-white/80">ULATMATIC: Incident & Complaint Reporting System</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="mt-10 inline-flex bg-white hover:bg-white/90 text-brand font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Back to Home
          </button>
        </div>

        <div className="flex items-center justify-center px-4 py-10">
          <div className="w-full max-w-md">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">Sign In</h2>
              <p className="text-sm text-gray-600 mt-1">Welcome back.</p>
            </div>
            <form
              className="mt-8 space-y-5"
              onSubmit={async (e) => {
                e.preventDefault();
                setError(null);
                setSubmitting(true);
                try {
                  const tryLogin = async (endpoint: string) => {
                    const res = await fetch(endpoint, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        email,
                        password,
                      }),
                    });
                    const data = (await res.json()) as {
                      ok?: boolean;
                      error?: string;
                      user?: {
                        id: number;
                        role: 'SECRETARY' | 'RESIDENT' | 'CAPTAIN' | 'CHIEF' | 'PIO';
                        sec_name?: string;
                        sec_email?: string;
                        cap_name?: string;
                        cap_email?: string;
                        chief_name?: string;
                        chief_email?: string;
                        pio_name?: string;
                        pio_email?: string;
                        fname?: string;
                        midname?: string | null;
                        lname?: string | null;
                        email?: string;
                        sitio?: string;
                      };
                    };
                    return { res, data };
                  };

                  const secretaryAttempt = await tryLogin('http://localhost/ULATMATIC/api/secretary/login.php');
                  if (secretaryAttempt.res.ok && secretaryAttempt.data.ok && secretaryAttempt.data.user?.role === 'SECRETARY') {
                    localStorage.setItem('ulatmatic_secretary', JSON.stringify(secretaryAttempt.data.user));
                    localStorage.removeItem('ulatmatic_resident');
                    localStorage.removeItem('ulatmatic_captain');
                    localStorage.removeItem('ulatmatic_chief');
                    localStorage.removeItem('ulatmatic_pio');
                    onNavigate('/secretary');
                    return;
                  }

                  const captainAttempt = await tryLogin('http://localhost/ULATMATIC/api/captain/login.php');
                  if (captainAttempt.res.ok && captainAttempt.data.ok && captainAttempt.data.user?.role === 'CAPTAIN') {
                    localStorage.setItem('ulatmatic_captain', JSON.stringify(captainAttempt.data.user));
                    localStorage.removeItem('ulatmatic_secretary');
                    localStorage.removeItem('ulatmatic_resident');
                    localStorage.removeItem('ulatmatic_chief');
                    localStorage.removeItem('ulatmatic_pio');
                    onNavigate('/captain');
                    return;
                  }

                  const chiefAttempt = await tryLogin('http://localhost/ULATMATIC/api/chief/login.php');
                  if (chiefAttempt.res.ok && chiefAttempt.data.ok && chiefAttempt.data.user?.role === 'CHIEF') {
                    localStorage.setItem('ulatmatic_chief', JSON.stringify(chiefAttempt.data.user));
                    localStorage.removeItem('ulatmatic_secretary');
                    localStorage.removeItem('ulatmatic_captain');
                    localStorage.removeItem('ulatmatic_resident');
                    localStorage.removeItem('ulatmatic_pio');
                    onNavigate('/chief');
                    return;
                  }

                  const pioAttempt = await tryLogin('http://localhost/ULATMATIC/api/pio/login.php');
                  if (pioAttempt.res.ok && pioAttempt.data.ok && pioAttempt.data.user?.role === 'PIO') {
                    localStorage.setItem('ulatmatic_pio', JSON.stringify(pioAttempt.data.user));
                    localStorage.removeItem('ulatmatic_secretary');
                    localStorage.removeItem('ulatmatic_captain');
                    localStorage.removeItem('ulatmatic_chief');
                    localStorage.removeItem('ulatmatic_resident');
                    onNavigate('/pio');
                    return;
                  }

                  const residentAttempt = await tryLogin('http://localhost/ULATMATIC/api/resident/login.php');
                  if (residentAttempt.res.ok && residentAttempt.data.ok && residentAttempt.data.user?.role === 'RESIDENT') {
                    localStorage.setItem('ulatmatic_resident', JSON.stringify(residentAttempt.data.user));
                    localStorage.removeItem('ulatmatic_secretary');
                    localStorage.removeItem('ulatmatic_captain');
                    localStorage.removeItem('ulatmatic_chief');
                    localStorage.removeItem('ulatmatic_pio');
                    onNavigate('/resident');
                    return;
                  }

                  const msg =
                    residentAttempt.data.error ??
                    pioAttempt.data.error ??
                    chiefAttempt.data.error ??
                    captainAttempt.data.error ??
                    secretaryAttempt.data.error ??
                    'Login failed';
                  setError(msg);
                } catch {
                  setError('Network error. Please try again.');
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Email address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 pl-4 pr-11 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5 text-gray-600" /> : <Eye className="w-5 h-5 text-gray-600" />}
                  </button>
                </div>
              </div>

              {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-brand hover:bg-brand/90 disabled:bg-brand/60 text-white font-semibold py-3 rounded-lg shadow-sm transition-colors"
              >
                {submitting ? 'Signing In…' : 'Sign In'}
              </button>

              <div className="text-center text-sm text-gray-600">
                <button
                  type="button"
                  className="text-brand hover:text-brand/90 font-semibold"
                  onClick={() => onNavigate('/signup')}
                >
                  Don’t have an account? Sign Up
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
