import { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import logo from '../../Logo/406613648_313509771513180_7654072355038554241_n.png';
import { FileDropzone } from '../components/FileDropzone';

export default function SignUpPage({ onNavigate }: { onNavigate: (to: string) => void }) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fname, setFname] = useState('');
  const [midname, setMidname] = useState('');
  const [lname, setLname] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('');
  const [sitio, setSitio] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpExpiresAt, setOtpExpiresAt] = useState<number | null>(null);
  const [resendAvailableAt, setResendAvailableAt] = useState<number | null>(null);
  const [otpNotice, setOtpNotice] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [idFrontFile, setIdFrontFile] = useState<File | null>(null);
  const [idBackFile, setIdBackFile] = useState<File | null>(null);
  const [idFrontPreviewUrl, setIdFrontPreviewUrl] = useState<string | null>(null);
  const [idBackPreviewUrl, setIdBackPreviewUrl] = useState<string | null>(null);
  const idFrontInputRef = useRef<HTMLInputElement>(null);
  const idBackInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!idFrontFile || !idFrontFile.type.startsWith('image/')) {
      setIdFrontPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(idFrontFile);
    setIdFrontPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [idFrontFile]);

  useEffect(() => {
    if (!idBackFile || !idBackFile.type.startsWith('image/')) {
      setIdBackPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(idBackFile);
    setIdBackPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [idBackFile]);

  useEffect(() => {
    if (!otpModalOpen) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [otpModalOpen]);

  const expiresInSeconds = otpExpiresAt ? Math.max(0, Math.floor((otpExpiresAt - nowMs) / 1000)) : 0;
  const resendInSeconds = resendAvailableAt ? Math.max(0, Math.ceil((resendAvailableAt - nowMs) / 1000)) : 0;
  const otpExpired = otpSent && expiresInSeconds <= 0;
  const phonePattern = /^9\d{8}$/;
  const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/;
  const isPhoneValid = (value: string) => phonePattern.test(value.trim());
  const isPasswordValid = (value: string) => passwordPattern.test(value);
  const passwordScore = (() => {
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    return score;
  })();
  const strengthSteps = [
    { label: 'Very Weak', barClass: 'bg-red-500', textClass: 'text-red-500', width: '15%' },
    { label: 'Weak', barClass: 'bg-orange-500', textClass: 'text-orange-500', width: '30%' },
    { label: 'Fair', barClass: 'bg-amber-500', textClass: 'text-amber-600', width: '50%' },
    { label: 'Good', barClass: 'bg-yellow-500', textClass: 'text-yellow-600', width: '65%' },
    { label: 'Strong', barClass: 'bg-lime-500', textClass: 'text-lime-600', width: '80%' },
    { label: 'Very Strong', barClass: 'bg-emerald-600', textClass: 'text-emerald-600', width: '100%' },
  ];
  const strengthIndex = Math.min(passwordScore, strengthSteps.length - 1);
  const strength = strengthSteps[strengthIndex];

  const formatSeconds = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const submitResidentRegistration = async () => {
    const normalizedPhone = phone.trim();
    if (!isPhoneValid(normalizedPhone)) {
      setError('Phone number must be +63 followed by 9 digits.');
      return false;
    }

    if (!isPasswordValid(password)) {
      setError('Password must include uppercase, lowercase, number, and symbol.');
      return false;
    }

    if (!gender) {
      setError('Please select a gender.');
      return false;
    }

    if (!idFrontFile || !idBackFile) {
      setError('Please upload both front and back ID images.');
      return false;
    }

    if (password.trim() === '' || password !== confirmPassword) {
      setError('Passwords do not match.');
      return false;
    }

    const form = new FormData();
    form.append('fname', fname);
    form.append('midname', midname);
    form.append('lname', lname);
    form.append('email', email);
    form.append('phone', `+63${normalizedPhone}`);
    form.append('gender', gender);
    form.append('sitio', sitio);
    form.append('user_pass', password);
    form.append('front_id', idFrontFile);
    form.append('back_id', idBackFile);

    const res = await fetch('http://localhost/ULATMATIC/api/resident/register.php', {
      method: 'POST',
      body: form,
    });

    const data = (await res.json()) as { ok?: boolean; error?: string; message?: string };
    if (!res.ok || !data.ok) {
      setError(data.error ?? 'Registration failed');
      return false;
    }

    setSuccess(data.message ?? 'Registration submitted for approval');
    return true;
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
          <p className="text-white/85 leading-relaxed max-w-lg">
            Create an account to file reports and track the progress of your concerns.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="mt-10 inline-flex bg-white hover:bg-white/90 text-brand font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Back to Home
          </button>
        </div>

        <div className="flex items-center justify-center px-4 py-10">
          <div className="w-full max-w-xl">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">Sign Up</h2>
              <p className="text-sm text-gray-600 mt-1">Please fill out the details below.</p>
            </div>

            <form
              className="mt-8 space-y-5"
              onSubmit={async (e) => {
                e.preventDefault();
                if (submitting) return;

                setError(null);
                setOtpNotice(null);
                setSuccess(null);

                if (!isPhoneValid(phone)) {
                  setError('Phone number must be +63 followed by 9 digits.');
                  return;
                }

                if (!isPasswordValid(password)) {
                  setError('Password must include uppercase, lowercase, number, and symbol.');
                  return;
                }

                if (password !== confirmPassword) {
                  setError('Passwords do not match.');
                  return;
                }

                if (!gender) {
                  setError('Please select a gender.');
                  return;
                }

                if (!idFrontFile || !idBackFile) {
                  setError('Please upload both front and back ID images.');
                  return;
                }
                setSubmitting(true);
                try {
                  if (!otpVerified) {
                    if (!otpSent || otpExpired) {
                      const res = await fetch('http://localhost/ULATMATIC/api/shared/send_otp.php', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ email }),
                      });

                      const data = (await res.json()) as { ok?: boolean; error?: string };
                      if (!res.ok || !data.ok) {
                        setError(data.error ?? 'Failed to send OTP');
                        return;
                      }

                      setOtp('');
                      setOtpSent(true);
                      setOtpExpiresAt(Date.now() + 10 * 60 * 1000);
                      setResendAvailableAt(Date.now() + 30 * 1000);
                    }

                    setOtpModalOpen(true);
                    return;
                  }

                  const ok = await submitResidentRegistration();
                  if (ok) {
                    onNavigate('/signin');
                  }
                } catch {
                  setError('Network error. Please try again.');
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">First name</label>
                  <input
                    type="text"
                    required
                    value={fname}
                    onChange={(e) => setFname(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand"
                    placeholder="Juan"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Middle name (optional)</label>
                  <input
                    type="text"
                    value={midname}
                    onChange={(e) => setMidname(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand"
                    placeholder="Santos"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Last name</label>
                  <input
                    type="text"
                    required
                    value={lname}
                    onChange={(e) => setLname(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand"
                    placeholder="Dela Cruz"
                  />
                </div>
              </div>

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
                <label className="block text-sm font-semibold text-gray-700 mb-1">Phone number</label>
                <div className="flex rounded-lg border border-gray-300 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand">
                  <span className="inline-flex items-center rounded-l-lg border-r border-gray-300 bg-gray-50 px-3 text-sm font-semibold text-gray-500">
                    +63
                  </span>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
                      setPhone(digits);
                    }}
                    inputMode="numeric"
                    className="w-full rounded-r-lg px-4 py-2.5 focus:outline-none"
                    placeholder="9XXXXXXXXX"
                    maxLength={9}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">Format: +63 followed by 9 digits.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Gender</label>
                <select
                  required
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  <option value="" disabled>Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {success ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}
              {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  required
                  value={sitio}
                  onChange={(e) => setSitio(e.target.value)}
                  placeholder="Enter your address"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
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
                  <p className="mt-1 text-xs text-gray-500">Must include uppercase, lowercase, number, and symbol.</p>
                  <div className="mt-2">
                    <div className="h-1.5 w-full rounded-full bg-gray-200">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-300 ${strength.barClass}`}
                        style={{ width: password.length ? strength.width : '0%' }}
                      />
                    </div>
                    <div className={`mt-1 text-right text-xs font-semibold ${strength.textClass}`}>
                      {password.length ? strength.label : ''}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Confirm password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 pl-4 pr-11 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5 text-gray-600" /> : <Eye className="w-5 h-5 text-gray-600" />}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <FileDropzone
                    label="Upload ID (front)"
                    file={idFrontFile}
                    previewUrl={idFrontPreviewUrl}
                    accept="image/*,.pdf"
                    required
                    inputRef={idFrontInputRef}
                    onChange={setIdFrontFile}
                    onClear={() => {
                      setIdFrontFile(null);
                      if (idFrontInputRef.current) idFrontInputRef.current.value = '';
                    }}
                  />
                  <FileDropzone
                    label="Upload ID (back)"
                    file={idBackFile}
                    previewUrl={idBackPreviewUrl}
                    accept="image/*,.pdf"
                    required
                    inputRef={idBackInputRef}
                    onChange={setIdBackFile}
                    onClear={() => {
                      setIdBackFile(null);
                      if (idBackInputRef.current) idBackInputRef.current.value = '';
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Upload any valid ID or document proving you live in Bigte, Norzagaray, Bulacan.
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-brand hover:bg-brand/90 disabled:bg-brand/60 text-white font-semibold py-3 rounded-lg shadow-sm transition-colors"
              >
                {otpVerified ? 'Continue' : 'Create Account'}
              </button>

              <div className="text-center text-sm text-gray-600">
                <button
                  type="button"
                  className="text-brand hover:text-brand/90 font-semibold"
                  onClick={() => onNavigate('/signin')}
                >
                  Already have an account? Sign In
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {otpModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              setOtpModalOpen(false);
              setOtpNotice(null);
            }}
            aria-label="Close"
          />

          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl border border-gray-100">
            <div className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Verify your email</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Enter the 6-digit code sent to <span className="font-semibold">{email}</span>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setOtpModalOpen(false);
                    setOtpNotice(null);
                  }}
                  className="rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-600 hover:bg-gray-100"
                >
                  Close
                </button>
              </div>

              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    {otpExpired ? (
                      <span className="text-red-600 font-semibold">Code expired</span>
                    ) : (
                      <span>
                        Expires in <span className="font-semibold">{formatSeconds(expiresInSeconds)}</span>
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={submitting || resendInSeconds > 0}
                    onClick={async () => {
                      if (submitting) return;
                      setError(null);
                      setOtpNotice(null);
                      setSubmitting(true);
                      try {
                        const res = await fetch('http://localhost/ULATMATIC/api/shared/send_otp.php', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({ email }),
                        });

                        const data = (await res.json()) as { ok?: boolean; error?: string };
                        if (!res.ok || !data.ok) {
                          setError(data.error ?? 'Failed to resend OTP');
                          return;
                        }

                        setOtp('');
                        setOtpSent(true);
                        setOtpExpiresAt(Date.now() + 10 * 60 * 1000);
                        setResendAvailableAt(Date.now() + 30 * 1000);
                        setOtpNotice('A new code has been sent.');
                      } catch {
                        setError('Network error. Please try again.');
                      } finally {
                        setSubmitting(false);
                      }
                    }}
                    className="text-sm font-semibold text-brand hover:text-brand/90 disabled:text-gray-400"
                  >
                    {resendInSeconds > 0 ? `Resend (${resendInSeconds}s)` : 'Resend code'}
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">OTP</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand"
                    placeholder="Enter 6-digit OTP"
                  />
                </div>

                {otpNotice ? <div className="rounded-lg border border-brand/20 bg-brand/5 px-4 py-3 text-sm text-brand">{otpNotice}</div> : null}
                {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

                <button
                  type="button"
                  disabled={submitting || otp.trim().length !== 6 || otpExpired}
                  onClick={async () => {
                    if (submitting) return;
                    setError(null);
                    setOtpNotice(null);
                    setSubmitting(true);
                    try {
                      const res = await fetch('http://localhost/ULATMATIC/api/shared/verify_otp.php', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ email, otp }),
                      });

                      const data = (await res.json()) as { ok?: boolean; error?: string };
                      if (!res.ok || !data.ok) {
                        setError(data.error ?? 'OTP verification failed');
                        return;
                      }

                      setOtpVerified(true);
                      setOtpModalOpen(false);
                      setOtpNotice(null);
                    } catch {
                      setError('Network error. Please try again.');
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                  className="w-full bg-brand hover:bg-brand/90 disabled:bg-brand/60 text-white font-semibold py-3 rounded-lg shadow-sm transition-colors"
                >
                  Verify
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
