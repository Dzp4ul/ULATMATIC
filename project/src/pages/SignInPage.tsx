import { useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import logo from '../../Logo/406613648_313509771513180_7654072355038554241_n.png';

export default function SignInPage({ onNavigate }: { onNavigate: (to: string) => void }) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forgot password state
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<'email' | 'otp' | 'reset'>('email');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState(false);
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [forgotOtpExpiresAt, setForgotOtpExpiresAt] = useState<number | null>(null);
  const [forgotResendAvailableAt, setForgotResendAvailableAt] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!forgotOpen || forgotStep !== 'otp') return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [forgotOpen, forgotStep]);

  const forgotExpiresInSeconds = forgotOtpExpiresAt ? Math.max(0, Math.floor((forgotOtpExpiresAt - nowMs) / 1000)) : 0;
  const forgotResendInSeconds = forgotResendAvailableAt ? Math.max(0, Math.ceil((forgotResendAvailableAt - nowMs) / 1000)) : 0;
  const forgotOtpExpired = forgotStep === 'otp' && forgotExpiresInSeconds <= 0 && forgotOtpExpiresAt !== null;

  const formatSeconds = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/;
  const isPasswordValid = (value: string) => passwordPattern.test(value);

  const sendForgotOtp = async () => {
    setForgotError(null);
    setForgotSuccess(null);
    setForgotSubmitting(true);
    try {
      const res = await fetch('/api/shared/forgot_password.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok || !data.ok) {
        setForgotError(data.error ?? 'Failed to send OTP');
        return;
      }
      setForgotOtp('');
      setForgotOtpExpiresAt(Date.now() + 10 * 60 * 1000);
      setForgotResendAvailableAt(Date.now() + 30 * 1000);
      setForgotStep('otp');
      setForgotSuccess(data.message ?? 'OTP sent to your email');
    } catch {
      setForgotError('Network error. Please try again.');
    } finally {
      setForgotSubmitting(false);
    }
  };

  const verifyForgotOtpAndReset = async () => {
    setForgotError(null);
    setForgotSuccess(null);

    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError('Passwords do not match.');
      return;
    }

    if (!isPasswordValid(forgotNewPassword)) {
      setForgotError('Password must include uppercase, lowercase, number, and symbol.');
      return;
    }

    setForgotSubmitting(true);
    try {
      const res = await fetch('/api/shared/reset_password.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, otp: forgotOtp, new_password: forgotNewPassword }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok || !data.ok) {
        setForgotError(data.error ?? 'Password reset failed');
        return;
      }
      setForgotSuccess(data.message ?? 'Password reset successfully!');
      setForgotStep('email');
      setTimeout(() => {
        setForgotOpen(false);
        setForgotSuccess(null);
        setForgotEmail('');
        setForgotOtp('');
        setForgotNewPassword('');
        setForgotConfirmPassword('');
      }, 2000);
    } catch {
      setForgotError('Network error. Please try again.');
    } finally {
      setForgotSubmitting(false);
    }
  };

  const closeForgotModal = () => {
    setForgotOpen(false);
    setForgotStep('email');
    setForgotError(null);
    setForgotSuccess(null);
    setForgotEmail('');
    setForgotOtp('');
    setForgotNewPassword('');
    setForgotConfirmPassword('');
    setForgotOtpExpiresAt(null);
    setForgotResendAvailableAt(null);
  };

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
            <div className="mb-6 flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3 shadow-sm lg:hidden">
              <div className="flex min-w-0 items-center gap-3">
                <img src={logo} alt="ULATMATIC logo" className="h-9 w-9 object-contain" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-gray-900">ULATMATIC</div>
                  <div className="truncate text-xs text-gray-500">Barangay Bigte, Norzagaray</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('/')}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Home
              </button>
            </div>

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
                        role: 'SUPERADMIN' | 'SECRETARY' | 'RESIDENT' | 'CAPTAIN' | 'CHIEF' | 'PIO';
                        superadmin_name?: string;
                        superadmin_email?: string;
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

                  const superadminAttempt = await tryLogin('/api/superadmin/login.php');
                  if (superadminAttempt.res.ok && superadminAttempt.data.ok && superadminAttempt.data.user?.role === 'SUPERADMIN') {
                    localStorage.setItem('ulatmatic_superadmin', JSON.stringify(superadminAttempt.data.user));
                    localStorage.removeItem('ulatmatic_secretary');
                    localStorage.removeItem('ulatmatic_resident');
                    localStorage.removeItem('ulatmatic_captain');
                    localStorage.removeItem('ulatmatic_chief');
                    localStorage.removeItem('ulatmatic_pio');
                    onNavigate('/superadmin');
                    return;
                  }

                  const secretaryAttempt = await tryLogin('/api/secretary/login.php');
                  if (secretaryAttempt.res.ok && secretaryAttempt.data.ok && secretaryAttempt.data.user?.role === 'SECRETARY') {
                    localStorage.setItem('ulatmatic_secretary', JSON.stringify(secretaryAttempt.data.user));
                    localStorage.removeItem('ulatmatic_superadmin');
                    localStorage.removeItem('ulatmatic_resident');
                    localStorage.removeItem('ulatmatic_captain');
                    localStorage.removeItem('ulatmatic_chief');
                    localStorage.removeItem('ulatmatic_pio');
                    onNavigate('/secretary');
                    return;
                  }

                  const captainAttempt = await tryLogin('/api/captain/login.php');
                  if (captainAttempt.res.ok && captainAttempt.data.ok && captainAttempt.data.user?.role === 'CAPTAIN') {
                    localStorage.setItem('ulatmatic_captain', JSON.stringify(captainAttempt.data.user));
                    localStorage.removeItem('ulatmatic_superadmin');
                    localStorage.removeItem('ulatmatic_secretary');
                    localStorage.removeItem('ulatmatic_resident');
                    localStorage.removeItem('ulatmatic_chief');
                    localStorage.removeItem('ulatmatic_pio');
                    onNavigate('/captain');
                    return;
                  }

                  const chiefAttempt = await tryLogin('/api/chief/login.php');
                  if (chiefAttempt.res.ok && chiefAttempt.data.ok && chiefAttempt.data.user?.role === 'CHIEF') {
                    localStorage.setItem('ulatmatic_chief', JSON.stringify(chiefAttempt.data.user));
                    localStorage.removeItem('ulatmatic_superadmin');
                    localStorage.removeItem('ulatmatic_secretary');
                    localStorage.removeItem('ulatmatic_captain');
                    localStorage.removeItem('ulatmatic_resident');
                    localStorage.removeItem('ulatmatic_pio');
                    onNavigate('/chief');
                    return;
                  }

                  const pioAttempt = await tryLogin('/api/pio/login.php');
                  if (pioAttempt.res.ok && pioAttempt.data.ok && pioAttempt.data.user?.role === 'PIO') {
                    localStorage.setItem('ulatmatic_pio', JSON.stringify(pioAttempt.data.user));
                    localStorage.removeItem('ulatmatic_superadmin');
                    localStorage.removeItem('ulatmatic_secretary');
                    localStorage.removeItem('ulatmatic_captain');
                    localStorage.removeItem('ulatmatic_chief');
                    localStorage.removeItem('ulatmatic_resident');
                    onNavigate('/pio');
                    return;
                  }

                  const residentAttempt = await tryLogin('/api/resident/login.php');
                  if (residentAttempt.res.ok && residentAttempt.data.ok && residentAttempt.data.user?.role === 'RESIDENT') {
                    localStorage.setItem('ulatmatic_resident', JSON.stringify(residentAttempt.data.user));
                    localStorage.removeItem('ulatmatic_superadmin');
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

              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-sm font-semibold text-brand hover:text-brand/80 transition-colors"
                  onClick={() => setForgotOpen(true)}
                >
                  Forgot Password?
                </button>
              </div>

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

      {/* Forgot Password Modal */}
      {forgotOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={closeForgotModal}
            aria-label="Close"
          />

          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl border border-gray-100">
            <div className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {forgotStep === 'email' ? 'Forgot Password' : forgotStep === 'otp' ? 'Verify OTP & Reset' : 'Reset Password'}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {forgotStep === 'email'
                      ? 'Enter your email address to receive a password reset code.'
                      : 'Enter the OTP sent to your email and set a new password.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeForgotModal}
                  className="rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-600 hover:bg-gray-100"
                >
                  Close
                </button>
              </div>

              <div className="mt-5 space-y-4">
                {forgotStep === 'email' ? (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Email address</label>
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand"
                        placeholder="you@example.com"
                      />
                    </div>

                    {forgotError ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{forgotError}</div> : null}
                    {forgotSuccess ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{forgotSuccess}</div> : null}

                    <button
                      type="button"
                      disabled={forgotSubmitting || forgotEmail.trim() === ''}
                      onClick={sendForgotOtp}
                      className="w-full bg-brand hover:bg-brand/90 disabled:bg-brand/60 text-white font-semibold py-3 rounded-lg shadow-sm transition-colors"
                    >
                      {forgotSubmitting ? 'Sending…' : 'Send Reset Code'}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        {forgotOtpExpired ? (
                          <span className="text-red-600 font-semibold">Code expired</span>
                        ) : (
                          <span>
                            Expires in <span className="font-semibold">{formatSeconds(forgotExpiresInSeconds)}</span>
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={forgotSubmitting || forgotResendInSeconds > 0}
                        onClick={sendForgotOtp}
                        className="text-sm font-semibold text-brand hover:text-brand/90 disabled:text-gray-400"
                      >
                        {forgotResendInSeconds > 0 ? `Resend (${forgotResendInSeconds}s)` : 'Resend code'}
                      </button>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">OTP Code</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]{6}"
                        maxLength={6}
                        value={forgotOtp}
                        onChange={(e) => setForgotOtp(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand"
                        placeholder="Enter 6-digit OTP"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">New Password</label>
                      <div className="relative">
                        <input
                          type={showForgotPassword ? 'text' : 'password'}
                          value={forgotNewPassword}
                          onChange={(e) => setForgotNewPassword(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 pl-4 pr-11 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          aria-label={showForgotPassword ? 'Hide password' : 'Show password'}
                          onClick={() => setShowForgotPassword((v) => !v)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          {showForgotPassword ? <EyeOff className="w-5 h-5 text-gray-600" /> : <Eye className="w-5 h-5 text-gray-600" />}
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">Must include uppercase, lowercase, number, and symbol.</p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Confirm New Password</label>
                      <div className="relative">
                        <input
                          type={showForgotConfirmPassword ? 'text' : 'password'}
                          value={forgotConfirmPassword}
                          onChange={(e) => setForgotConfirmPassword(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 pl-4 pr-11 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          aria-label={showForgotConfirmPassword ? 'Hide password' : 'Show password'}
                          onClick={() => setShowForgotConfirmPassword((v) => !v)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          {showForgotConfirmPassword ? <EyeOff className="w-5 h-5 text-gray-600" /> : <Eye className="w-5 h-5 text-gray-600" />}
                        </button>
                      </div>
                    </div>

                    {forgotError ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{forgotError}</div> : null}
                    {forgotSuccess ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{forgotSuccess}</div> : null}

                    <button
                      type="button"
                      disabled={forgotSubmitting || forgotOtp.trim().length !== 6 || forgotOtpExpired || forgotNewPassword === '' || forgotConfirmPassword === ''}
                      onClick={verifyForgotOtpAndReset}
                      className="w-full bg-brand hover:bg-brand/90 disabled:bg-brand/60 text-white font-semibold py-3 rounded-lg shadow-sm transition-colors"
                    >
                      {forgotSubmitting ? 'Resetting…' : 'Reset Password'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setForgotStep('email');
                        setForgotError(null);
                        setForgotSuccess(null);
                      }}
                      className="w-full text-sm font-semibold text-gray-600 hover:text-gray-900 py-2"
                    >
                      ← Back to email
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
