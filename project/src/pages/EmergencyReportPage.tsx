import { useState, useRef, useEffect } from 'react';
import { Camera, AlertCircle, CheckCircle, ArrowLeft, Smartphone, User, Phone, MapPin, FileText, Eye, Clock, Copy, Check } from 'lucide-react';
import { clearLastEmergencyTrackingNumber, getLastEmergencyTrackingNumber, saveLastEmergencyTrackingNumber } from '../utils/emergency-report-session';

const SITIOS = [
  'Ahunin',
  'Alinsangan',
  'Baltazar',
  'Biak na Bato',
  'Bria Phase 1',
  'Bria Phase2',
  'COC',
  'Calle Onse / Sampaguita',
  'Crusher Highway',
  'Inner Crusher',
  'Kadayunan',
  'Looban 1',
  'Looban 2',
  'Manggahan',
  'Nabus',
  'Old Barrio 2',
  'Old Barrio Ext',
  'Old Barrio NPC',
  'Poblacion',
  'RCD',
  'Riverside',
  'Settling',
  'Spar',
  'Upper',
];

interface IncidentData {
  id: number;
  tracking_number: string;
  incident_type: string;
  incident_category: string;
  sitio: string;
  description: string;
  status: string;
  created_at: string;
  viewed_by_chief: boolean;
  viewed_by_pio: boolean;
}

export default function EmergencyReportPage({ onNavigate }: { onNavigate: (to: string) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [picture, setPicture] = useState<string>('');
  const [cameraActive, setCameraActive] = useState(false);
  const [name, setName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [sitio, setSitio] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; contactNumber?: string; sitio?: string; picture?: string }>({});
  const [success, setSuccess] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingCopied, setTrackingCopied] = useState(false);
  const [incidentData, setIncidentData] = useState<IncidentData | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const copyFeedbackTimeoutRef = useRef<number | null>(null);
  const restoredFromStorageRef = useRef(false);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (copyFeedbackTimeoutRef.current !== null) {
        window.clearTimeout(copyFeedbackTimeoutRef.current);
      }
    };
  }, [stream]);

  useEffect(() => {
    if (restoredFromStorageRef.current) return;
    restoredFromStorageRef.current = true;

    const lastTrackingNumber = getLastEmergencyTrackingNumber();
    if (!lastTrackingNumber) return;

    setSuccess(true);
    setTrackingNumber(lastTrackingNumber);
    setupPolling(lastTrackingNumber);
  }, []);

  // Connect stream to video element when both are available
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, cameraActive]);

  const fetchIncidentData = async (tracking: string) => {
    try {
      const response = await fetch('/api/incidents/track.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tracking_number: tracking }),
      });

      const data = await response.json();
      if (data.ok && data.incident) {
        setIncidentData(data.incident);
      }
      // Silently fail on polling errors - incident may not be indexed yet
    } catch (err) {
      // Network error - silently continue polling
      console.error('Polling error:', err);
    }
  };

  const setupPolling = (tracking: string) => {
    // Fetch immediately
    fetchIncidentData(tracking);

    // Then poll every 3 seconds
    pollIntervalRef.current = setInterval(() => {
      fetchIncidentData(tracking);
    }, 3000);
  };

  const handlePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setPicture(event.target?.result as string);
        setError('');
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      setStream(mediaStream);
      setCameraActive(true);
      setError('');
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setError('Camera access denied or not available');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  };

  const takePicture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (context && video.videoWidth > 0 && video.videoHeight > 0) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);

      const imageData = canvas.toDataURL('image/jpeg', 0.95);
      setPicture(imageData);
      stopCamera();
    }
  };

  const retakePicture = () => {
    setPicture('');
    startCamera();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    const errors: { name?: string; contactNumber?: string; sitio?: string; picture?: string } = {};

    if (!name.trim()) errors.name = 'Name is required';
    if (!contactNumber.trim()) errors.contactNumber = 'Contact number is required';
    if (!sitio) errors.sitio = 'Sitio is required';
    if (!picture) errors.picture = 'Picture is required';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);

    try {
      // Convert base64 data URL to blob
      const parts = picture.split(',');
      const base64 = parts[1];
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('contact_number', contactNumber.trim());
      formData.append('sitio', sitio);
      formData.append('description', description.trim());
      formData.append('incident_type', 'Emergency');
      formData.append('incident_category', 'Emergency Report');
      formData.append('evidence', blob, 'photo.jpg');

      const result = await fetch('/api/incidents/emergency-submit.php', {
        method: 'POST',
        body: formData,
      });

      if (!result.ok) {
        setError('Server error: ' + result.status + ' ' + result.statusText);
        setLoading(false);
        return;
      }

      const text = await result.text();
      if (!text) {
        setError('Server returned empty response');
        setLoading(false);
        return;
      }

      const data = JSON.parse(text);

      if (!data.ok) {
        setError(data.error || 'Failed to submit report');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTrackingNumber(data.tracking_number);
      saveLastEmergencyTrackingNumber(data.tracking_number);
      setLoading(false);

      // Start polling for real-time updates
      setupPolling(data.tracking_number);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError('Error: ' + errorMsg);
      setLoading(false);
    }
  };

  const resetForm = () => {
    setPicture('');
    setName('');
    setContactNumber('');
    setSitio('');
    setDescription('');
    setError('');
    setSuccess(false);
    setTrackingNumber('');
  };

  const startNewEmergencyReport = () => {
    clearLastEmergencyTrackingNumber();
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setIncidentData(null);
    setSuccess(false);
    setTrackingNumber('');
    setTrackingCopied(false);
  };

  const handleCopyTrackingNumber = async () => {
    if (!trackingNumber) return;

    try {
      if (navigator.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(trackingNumber);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = trackingNumber;
        textArea.setAttribute('readonly', '');
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }

      setTrackingCopied(true);
      if (copyFeedbackTimeoutRef.current !== null) {
        window.clearTimeout(copyFeedbackTimeoutRef.current);
      }
      copyFeedbackTimeoutRef.current = window.setTimeout(() => {
        setTrackingCopied(false);
      }, 1800);
    } catch {
      setError('Unable to copy tracking number. Please copy it manually.');
    }
  };

  const normalizedIncidentStatus = (incidentData?.status ?? '').trim().toUpperCase();
  const viewedByChief = Boolean(incidentData?.viewed_by_chief);
  const viewedByPio = Boolean(incidentData?.viewed_by_pio);
  const viewedByOfficial = viewedByChief || viewedByPio;
  const isResolved = normalizedIncidentStatus === 'RESOLVED';
  const isTransferred = normalizedIncidentStatus === 'TRANSFERRED';
  const isOngoingStatus = ['IN_PROGRESS', 'ONGOING', 'ON_GOING', 'ON GOING'].includes(normalizedIncidentStatus);
  const hasBeenViewedStep = viewedByOfficial || isOngoingStatus || isResolved || isTransferred;
  const isOnGoingStep = isOngoingStatus || isResolved;
  const statusDisplayLabel = normalizedIncidentStatus === 'IN_PROGRESS' ? 'ON GOING' : (incidentData?.status ?? '');

  let viewedStatusLabel = 'Pending view by Chief or PIO';
  if (viewedByChief && viewedByPio) {
    viewedStatusLabel = 'Viewed by Chief and PIO';
  } else if (viewedByChief) {
    viewedStatusLabel = 'Viewed by Chief';
  } else if (viewedByPio) {
    viewedStatusLabel = 'Viewed by PIO';
  } else if (hasBeenViewedStep) {
    viewedStatusLabel = 'Viewed by barangay officials';
  }

  if (success) {
    return (
      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="sticky top-0 bg-brand/95 backdrop-blur border-b border-brand/20 z-50 shadow-lg">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <button
              onClick={() => {
                setSuccess(false);
                setTrackingCopied(false);
                if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                onNavigate('/');
              }}
              className="flex items-center gap-2 text-white hover:text-white/80 transition-colors font-semibold"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Home</span>
            </button>
            <h1 className="text-lg font-bold text-white">Track Your Report</h1>
            <div className="w-20"></div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-2xl mx-auto px-4 py-12">
          {/* Success Card */}
          <div className="bg-gradient-to-br from-green-50 to-white rounded-2xl shadow-lg p-8 border border-green-200 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Report Submitted!</h2>
                <p className="text-sm text-gray-600 mt-1">Your emergency report has been successfully sent to our team</p>
              </div>
            </div>

            {/* Tracking Number */}
            <div className="bg-white border-2 border-brand rounded-lg p-6 mb-6">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-sm text-gray-600">Your Tracking Number</p>
                <button
                  type="button"
                  onClick={handleCopyTrackingNumber}
                  className="inline-flex items-center gap-1.5 rounded-md border border-brand/30 bg-brand/5 px-2.5 py-1.5 text-xs font-semibold text-brand transition hover:bg-brand/10"
                  aria-label="Copy tracking number"
                >
                  {trackingCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {trackingCopied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p className="text-3xl font-bold font-mono text-brand break-all">{trackingNumber}</p>
            </div>

            <button
              type="button"
              onClick={startNewEmergencyReport}
              className="mb-6 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              Submit Another Emergency Report
            </button>

            {/* Status Timeline */}
            {incidentData && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Reported Status */}
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                      <p className="font-semibold text-gray-900">Report Submitted</p>
                    </div>
                    <p className="text-xs text-gray-600">
                      {new Date(incidentData.created_at).toLocaleString()}
                    </p>
                  </div>

                  {/* Viewed Status */}
                  <div className={`rounded-lg p-4 border-2 transition-all ${
                    hasBeenViewedStep
                      ? 'bg-green-50 border-green-200'
                      : 'bg-gray-50 border-gray-200 opacity-50'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Eye className={`w-4 h-4 ${hasBeenViewedStep ? 'text-green-600' : 'text-gray-400'}`} />
                      <p className="font-semibold text-gray-900">Your Report is Viewed</p>
                    </div>
                    <p className="text-xs text-gray-600">
                      {viewedStatusLabel}
                    </p>
                  </div>

                  {/* On Going */}
                  <div className={`rounded-lg p-4 border-2 transition-all ${
                    isOnGoingStep
                      ? 'bg-green-50 border-green-200'
                      : 'bg-gray-50 border-gray-200 opacity-50'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className={`w-4 h-4 ${isOnGoingStep ? 'text-green-600' : 'text-gray-400'}`} />
                      <p className="font-semibold text-gray-900">On Going</p>
                    </div>
                    <p className="text-xs text-gray-600">
                      {isResolved ? 'Processing completed' : isOnGoingStep ? 'Team is handling your report' : 'Waiting to be viewed'}
                    </p>
                  </div>

                  {/* Resolved */}
                  <div className={`rounded-lg p-4 border-2 transition-all ${
                    isResolved
                      ? 'bg-green-50 border-green-200'
                      : 'bg-gray-50 border-gray-200 opacity-50'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className={`w-4 h-4 ${isResolved ? 'text-green-600' : 'text-gray-400'}`} />
                      <p className="font-semibold text-gray-900">Resolved</p>
                    </div>
                    <p className="text-xs text-gray-600">
                      {isResolved ? 'Report resolved' : 'Pending resolution'}
                    </p>
                  </div>
                </div>
                {/* Details */}
                <div className="bg-gray-50 rounded-lg p-6 mt-6">
                  <h3 className="font-bold text-gray-900 mb-4">Report Details</h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-gray-600">Category</p>
                      <p className="font-semibold text-gray-900">{incidentData.incident_category}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Location</p>
                      <p className="font-semibold text-gray-900">{incidentData.sitio}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Status</p>
                      <p className="font-semibold text-gray-900">{statusDisplayLabel}</p>
                    </div>
                    {incidentData.description && (
                      <div>
                        <p className="text-gray-600">Description</p>
                        <p className="text-gray-900">{incidentData.description}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Live Update Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                  <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-blue-900 text-sm">Real-Time Updates</p>
                    <p className="text-xs text-blue-700 mt-1">This page updates every 3 seconds to show viewed, on going, and resolved progress</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-white to-gray-50">
      {/* Header */}
      <div className="sticky top-0 bg-brand/95 backdrop-blur border-b border-brand/20 z-50 shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => onNavigate('/')}
            className="flex items-center gap-2 text-white hover:text-white/80 transition-colors font-semibold"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          <h1 className="text-lg font-bold text-white">Emergency Report</h1>
          <div className="w-20"></div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-red-50 via-red-50/50 to-white/50 py-12 border-b border-red-100/50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="inline-block mb-3">
            <span className="bg-red-100 text-red-700 text-xs font-bold px-3 py-1 rounded-full">URGENT REPORT</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Report Incidents Fast</h2>
          <p className="text-gray-700 max-w-2xl">
            Help our barangay respond quickly to emergencies. Take a photo and fill in basic details. Your report goes directly to the Chief and PIO.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-700 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Camera Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-gray-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center">
              <Smartphone className="w-6 h-6 text-brand" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Step 1: Capture Photo</h3>
              <p className="text-sm text-gray-600">Take a photo of the incident</p>
            </div>
          </div>

          {!picture ? (
            <>
              {cameraActive ? (
                <div className="space-y-4">
                  <div className="relative bg-black rounded-xl overflow-hidden w-full shadow-2xl">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-auto object-cover"
                    />
                  </div>
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={takePicture}
                      className="flex-1 bg-gradient-to-r from-brand to-brand/90 hover:shadow-lg text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all"
                    >
                      <Camera className="w-5 h-5" />
                      Take Photo
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-4 rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="w-full bg-gradient-to-b from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-150 rounded-xl p-12 text-center transition-all border-2 border-dashed border-gray-300"
                  >
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-brand/10 flex items-center justify-center">
                        <Camera className="w-8 h-8 text-brand" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-gray-900">Capture Photo</p>
                        <p className="text-sm text-gray-600 mt-1">Click to open camera</p>
                      </div>
                    </div>
                  </button>
                  {fieldErrors.picture && (
                    <p className="text-sm text-red-600 mt-2">{fieldErrors.picture}</p>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <img src={picture} alt="Captured" className="w-full rounded-xl border-2 border-gray-300 shadow-lg" />
              <button
                type="button"
                onClick={retakePicture}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition-colors"
              >
                Retake Photo
              </button>
            </div>
          )}
        </div>

        {/* Form Card */}
        {picture && (
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Step 2: Fill Details</h3>
                <p className="text-sm text-gray-600">Provide your information</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-600" />
                    Your Name <span className="text-red-500">*</span>
                  </div>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all"
                />
                {fieldErrors.name && (
                  <p className="text-sm text-red-600 mt-2">{fieldErrors.name}</p>
                )}
              </div>

              {/* Contact Number */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-600" />
                    Contact Number <span className="text-red-500">*</span>
                  </div>
                </label>
                <input
                  type="tel"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="09XX-XXX-XXXX"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all"
                />
                {fieldErrors.contactNumber && (
                  <p className="text-sm text-red-600 mt-2">{fieldErrors.contactNumber}</p>
                )}
              </div>

              {/* Sitio */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-600" />
                    Sitio <span className="text-red-500">*</span>
                  </div>
                </label>
                <select
                  value={sitio}
                  onChange={(e) => setSitio(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all"
                >
                  <option value="">Select sitio</option>
                  {SITIOS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                {fieldErrors.sitio && (
                  <p className="text-sm text-red-600 mt-2">{fieldErrors.sitio}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-600" />
                    Brief Description
                  </div>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what happened..."
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all resize-none"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-brand to-brand/90 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Submit Emergency Report
                  </>
                )}
              </button>

              <p className="text-xs text-gray-500 text-center pt-2">
                ✓ Your report will be sent directly to the Chief and PIO
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
