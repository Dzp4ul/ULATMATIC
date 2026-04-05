import { useEffect, useRef, useState, useCallback } from 'react';
import { Eye, EyeOff, Camera, RotateCcw, X } from 'lucide-react';
import logo from '../../Logo/406613648_313509771513180_7654072355038554241_n.png';
import { FileDropzone } from '../components/FileDropzone';

type SignUpErrorField = 'phone' | 'password' | 'confirmPassword' | 'gender' | 'idUpload' | 'selfie' | 'form' | 'otp';
type ApiResponsePayload = {
  ok?: boolean;
  error?: string;
  message?: string;
  upload_max_filesize?: string;
  post_max_size?: string;
  recommended_client_limit_bytes?: number;
};

export default function SignUpPage({ onNavigate }: { onNavigate: (to: string) => void }) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fname, setFname] = useState('');
  const [midname, setMidname] = useState('');
  const [lname, setLname] = useState('');
  const [suffix, setSuffix] = useState('');
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
  const [errorField, setErrorField] = useState<SignUpErrorField | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [idFrontFile, setIdFrontFile] = useState<File | null>(null);
  const [idBackFile, setIdBackFile] = useState<File | null>(null);
  const [idFrontPreviewUrl, setIdFrontPreviewUrl] = useState<string | null>(null);
  const [idBackPreviewUrl, setIdBackPreviewUrl] = useState<string | null>(null);
  const idFrontInputRef = useRef<HTMLInputElement>(null);
  const idBackInputRef = useRef<HTMLInputElement>(null);
  const appIdUploadLimitMB = 5;
  const [idUploadLimitMB, setIdUploadLimitMB] = useState<number>(appIdUploadLimitMB);
  const [idUploadLimitNotice, setIdUploadLimitNotice] = useState<string | null>(null);

  // Selfie camera state
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreviewUrl, setSelfiePreviewUrl] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

  // Selfie preview URL
  useEffect(() => {
    if (!selfieFile) {
      setSelfiePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(selfieFile);
    setSelfiePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selfieFile]);

  // Camera stream management
  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
  }, [cameraStream]);

  const startCamera = useCallback(async (facing: 'user' | 'environment' = 'user') => {
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setFieldError('selfie', 'Unable to access camera. Please allow camera permissions.');
      setCameraOpen(false);
    }
  }, [stopCamera]);

  useEffect(() => {
    if (cameraOpen) {
      startCamera(facingMode);
    } else {
      stopCamera();
    }
    return () => {
      // cleanup on unmount
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraOpen, facingMode]);

  // Stop camera on component unmount
  useEffect(() => {
    return () => {
      // Stop all tracks when component unmounts
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const captureSelfie = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Mirror for front camera
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);
    
    // Compress to fit the active upload limit.
    let quality = 0.9;
    const maxSize = idUploadLimitMB * 1024 * 1024;
    
    const tryCompress = (q: number) => {
      canvas.toBlob((blob) => {
        if (blob) {
          if (blob.size > maxSize && q > 0.3) {
            // Try with lower quality
            tryCompress(q - 0.1);
          } else {
            const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });
            setSelfieFile(file);
            setCameraOpen(false);
            stopCamera();
          }
        }
      }, 'image/jpeg', q);
    };
    
    tryCompress(quality);
  };

  useEffect(() => {
    if (!otpModalOpen) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [otpModalOpen]);

  const expiresInSeconds = otpExpiresAt ? Math.max(0, Math.floor((otpExpiresAt - nowMs) / 1000)) : 0;
  const resendInSeconds = resendAvailableAt ? Math.max(0, Math.ceil((resendAvailableAt - nowMs) / 1000)) : 0;
  const otpExpired = otpSent && expiresInSeconds <= 0;
  const phonePattern = /^9\d{9}$/;
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
  const idUploadLimitLabel = idUploadLimitMB >= appIdUploadLimitMB ? '5' : idUploadLimitMB.toFixed(1);

  const formatSeconds = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const setFieldError = (field: SignUpErrorField, message: string) => {
    setErrorField(field);
    setError(message);
  };

  const clearErrorForField = (field: SignUpErrorField) => {
    if (errorField === field) {
      setErrorField(null);
      setError(null);
    }
  };

  const parseApiPayload = async (res: Response): Promise<ApiResponsePayload> => {
    const raw = await res.text();
    if (!raw.trim()) {
      return {};
    }

    try {
      return JSON.parse(raw) as ApiResponsePayload;
    } catch {
      const plain = raw
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 220);
      return { ok: false, error: plain || `Request failed (HTTP ${res.status})` };
    }
  };

  useEffect(() => {
    let cancelled = false;

    const syncUploadLimit = async () => {
      try {
        const res = await fetch('/api/shared/upload_limits.php', { method: 'GET' });
        const raw = await res.text();
        let data: ApiResponsePayload = {};
        if (raw.trim()) {
          try {
            data = JSON.parse(raw) as ApiResponsePayload;
          } catch {
            data = {};
          }
        }

        if (!res.ok || !data.ok || cancelled) {
          return;
        }

        const recommendedBytes = Number(data.recommended_client_limit_bytes ?? 0);
        if (!Number.isFinite(recommendedBytes) || recommendedBytes <= 0) {
          return;
        }

        const recommendedMB = Math.max(0.5, Math.floor((recommendedBytes / (1024 * 1024)) * 10) / 10);
        const effectiveLimitMB = Math.min(appIdUploadLimitMB, recommendedMB);

        setIdUploadLimitMB(effectiveLimitMB);
        if (effectiveLimitMB < appIdUploadLimitMB) {
          const serverLimitLabel = (data.upload_max_filesize ?? `${effectiveLimitMB.toFixed(1)}MB`).toString();
          setIdUploadLimitNotice(`Server upload limit is currently ${serverLimitLabel} per file, so images are auto-compressed to fit.`);
        } else {
          setIdUploadLimitNotice(null);
        }
      } catch {
        // Keep default client-side limit when endpoint is unavailable.
      }
    };

    syncUploadLimit();
    return () => {
      cancelled = true;
    };
  }, [appIdUploadLimitMB]);

  const submitResidentRegistration = async () => {
    const normalizedPhone = phone.trim();
    if (!isPhoneValid(normalizedPhone)) {
      setFieldError('phone', 'Phone number must start with 9 and be 10 digits.');
      return false;
    }

    if (!isPasswordValid(password)) {
      setFieldError('password', 'Password must include uppercase, lowercase, number, and symbol.');
      return false;
    }

    if (password.trim() === '' || password !== confirmPassword) {
      setFieldError('confirmPassword', 'Passwords do not match.');
      return false;
    }

    if (!gender) {
      setFieldError('gender', 'Please select a gender.');
      return false;
    }

    if (!idFrontFile || !idBackFile) {
      setFieldError('idUpload', 'Please upload both front and back ID images.');
      return false;
    }

    if (!selfieFile) {
      setFieldError('selfie', 'Please take a selfie for face verification.');
      return false;
    }

    const form = new FormData();
    form.append('fname', fname);
    form.append('midname', midname);
    form.append('lname', lname);
    form.append('suffix', suffix);
    form.append('email', email);
    form.append('phone', `+63${normalizedPhone}`);
    form.append('gender', gender);
    form.append('sitio', sitio);
    form.append('user_pass', password);
    form.append('front_id', idFrontFile);
    form.append('back_id', idBackFile);
    form.append('selfie', selfieFile);

    const res = await fetch('/api/resident/register.php', {
      method: 'POST',
      body: form,
    });

    const data = await parseApiPayload(res);
    if (!res.ok || !data.ok) {
      setFieldError('form', data.error ?? `Registration failed (HTTP ${res.status})`);
      return false;
    }

    setSuccess(data.message ?? 'Registration submitted for approval');
    return true;
  };

  return (
    <div className="bg-gray-50">
      <div className="lg:grid lg:grid-cols-2 lg:h-screen">
        <div className="hidden lg:flex flex-col items-center text-center justify-center px-14 bg-brand border-r border-black/5 sticky top-0 h-screen">
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

        <div className="flex items-start justify-center px-4 py-10 lg:h-screen lg:overflow-y-auto">
          <div className="w-full max-w-2xl">
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
              <h2 className="text-2xl font-bold text-gray-900">Sign Up</h2>
              <p className="text-sm text-gray-600 mt-1">Please fill out the details below.</p>
            </div>

            <form
              className="mt-8 space-y-5"
              onSubmit={async (e) => {
                e.preventDefault();
                if (submitting) return;

                setError(null);
                setErrorField(null);
                setOtpNotice(null);
                setSuccess(null);

                if (!isPhoneValid(phone)) {
                  setFieldError('phone', 'Phone number must start with 9 and be 10 digits.');
                  return;
                }

                if (!isPasswordValid(password)) {
                  setFieldError('password', 'Password must include uppercase, lowercase, number, and symbol.');
                  return;
                }

                if (password !== confirmPassword) {
                  setFieldError('confirmPassword', 'Passwords do not match.');
                  return;
                }

                if (!gender) {
                  setFieldError('gender', 'Please select a gender.');
                  return;
                }

                if (!idFrontFile || !idBackFile) {
                  setFieldError('idUpload', 'Please upload both front and back ID images.');
                  return;
                }

                if (!selfieFile) {
                  setFieldError('selfie', 'Please take a selfie for face verification.');
                  return;
                }
                setSubmitting(true);
                try {
                  if (!otpVerified) {
                    if (!otpSent || otpExpired) {
                      const res = await fetch('/api/shared/send_otp.php', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ email }),
                      });

                      const data = await parseApiPayload(res);
                      if (!res.ok || !data.ok) {
                        setFieldError('form', data.error ?? `Failed to send OTP (HTTP ${res.status})`);
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
                  setFieldError('form', 'Network error. Please try again.');
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Suffix (optional)</label>
                  <select
                    value={suffix}
                    onChange={(e) => setSuffix(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand"
                  >
                    <option value="">None</option>
                    <option value="Jr.">Jr.</option>
                    <option value="Sr.">Sr.</option>
                    <option value="II">II</option>
                    <option value="III">III</option>
                    <option value="IV">IV</option>
                    <option value="V">V</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Email address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    clearErrorForField('form');
                  }}
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
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setPhone(digits);
                      clearErrorForField('phone');
                    }}
                    inputMode="numeric"
                    className="w-full rounded-r-lg px-4 py-2.5 focus:outline-none"
                    placeholder="9XXXXXXXXX"
                    maxLength={10}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">Format: +63 9XXXXXXXXX (10 digits starting with 9).</p>
                {error && errorField === 'phone' ? <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Gender</label>
                <select
                  required
                  value={gender}
                  onChange={(e) => {
                    setGender(e.target.value);
                    clearErrorForField('gender');
                  }}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  <option value="" disabled>Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
                {error && errorField === 'gender' ? <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
              </div>

              {success ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}

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
                      onChange={(e) => {
                        setPassword(e.target.value);
                        clearErrorForField('password');
                      }}
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
                  {error && errorField === 'password' ? <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Confirm password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        clearErrorForField('confirmPassword');
                      }}
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
                  {error && errorField === 'confirmPassword' ? <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
                </div>
              </div>

              <div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <FileDropzone
                    label="Upload ID (front)"
                    file={idFrontFile}
                    previewUrl={idFrontPreviewUrl}
                    accept="image/*,.pdf"
                    maxSizeMB={idUploadLimitMB}
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
                    maxSizeMB={idUploadLimitMB}
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
                  Upload any valid ID or document proving you live in Bigte, Norzagaray, Bulacan. Maximum {idUploadLimitLabel}MB per file.
                </p>
                {idUploadLimitNotice ? <p className="text-xs text-amber-700 mt-1">{idUploadLimitNotice}</p> : null}
                {error && errorField === 'idUpload' ? <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
              </div>

              {/* Selfie capture section */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Take a Selfie (Face Verification)</label>
                {selfiePreviewUrl ? (
                  <div className="relative rounded-xl border-2 border-dashed border-gray-300 p-4 bg-white">
                    <div className="flex flex-col items-center gap-3">
                      <img
                        src={selfiePreviewUrl}
                        alt="Selfie preview"
                        className="w-40 h-40 rounded-full object-cover border-4 border-brand/20"
                      />
                      <p className="text-sm font-medium text-gray-700">Selfie captured</p>
                      <button
                        type="button"
                        onClick={() => {
                          setSelfieFile(null);
                          clearErrorForField('selfie');
                          setCameraOpen(true);
                        }}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-brand hover:text-brand/80"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Retake Selfie
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      clearErrorForField('selfie');
                      setCameraOpen(true);
                    }}
                    className="w-full flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-gray-300 hover:border-brand/50 p-6 bg-white transition-colors"
                  >
                    <div className="w-16 h-16 rounded-full bg-brand/10 flex items-center justify-center">
                      <Camera className="w-8 h-8 text-brand" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-gray-700">Take a Selfie</p>
                      <p className="text-xs text-gray-500 mt-1">Click to open camera and capture your face</p>
                    </div>
                  </button>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Your selfie will be used for face verification during account approval.
                </p>
                {error && errorField === 'selfie' ? <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
              </div>

              <canvas ref={canvasRef} className="hidden" />

              {error && (errorField === 'form' || errorField === 'otp' || errorField === null) ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
              ) : null}

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
                      setErrorField(null);
                      setOtpNotice(null);
                      setSubmitting(true);
                      try {
                        const res = await fetch('/api/shared/send_otp.php', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({ email }),
                        });

                        const data = await parseApiPayload(res);
                        if (!res.ok || !data.ok) {
                          setFieldError('otp', data.error ?? `Failed to resend OTP (HTTP ${res.status})`);
                          return;
                        }

                        setOtp('');
                        setOtpSent(true);
                        setOtpExpiresAt(Date.now() + 10 * 60 * 1000);
                        setResendAvailableAt(Date.now() + 30 * 1000);
                        setOtpNotice('A new code has been sent.');
                      } catch {
                        setFieldError('otp', 'Network error. Please try again.');
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
                {error && errorField === 'otp' ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

                <button
                  type="button"
                  disabled={submitting || otp.trim().length !== 6 || otpExpired}
                  onClick={async () => {
                    if (submitting) return;
                    setError(null);
                    setErrorField(null);
                    setOtpNotice(null);
                    setSubmitting(true);
                    try {
                      const res = await fetch('/api/shared/verify_otp.php', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ email, otp }),
                      });

                      const data = await parseApiPayload(res);
                      if (!res.ok || !data.ok) {
                        setFieldError('otp', data.error ?? `OTP verification failed (HTTP ${res.status})`);
                        return;
                      }

                      setOtpVerified(true);
                      setOtpModalOpen(false);
                      setOtpNotice(null);
                    } catch {
                      setFieldError('otp', 'Network error. Please try again.');
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

      {/* Camera Modal */}
      {cameraOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            onClick={() => {
              setCameraOpen(false);
              stopCamera();
            }}
            aria-label="Close camera"
          />
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Take a Selfie</h3>
              <button
                type="button"
                onClick={() => {
                  setCameraOpen(false);
                  stopCamera();
                }}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative bg-black aspect-[4/3] overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />
              {/* Face guide overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-60 rounded-full border-4 border-white/50 border-dashed" />
              </div>
              <p className="absolute bottom-3 left-0 right-0 text-center text-white/80 text-sm font-medium drop-shadow-lg">
                Position your face inside the oval
              </p>
            </div>
            <div className="flex items-center justify-center gap-4 p-5">
              <button
                type="button"
                onClick={() => setFacingMode((f) => (f === 'user' ? 'environment' : 'user'))}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Flip
              </button>
              <button
                type="button"
                onClick={captureSelfie}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-brand text-white font-semibold hover:bg-brand/90 transition-colors shadow-sm"
              >
                <Camera className="w-5 h-5" />
                Capture
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
