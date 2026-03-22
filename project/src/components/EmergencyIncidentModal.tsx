import { useState, useRef } from 'react';
import { X, Upload, AlertCircle, CheckCircle } from 'lucide-react';

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

export default function EmergencyIncidentModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [picture, setPicture] = useState<File | null>(null);
  const [picturePreview, setPicturePreview] = useState<string>('');
  const [name, setName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [sitio, setSitio] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      setPicture(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setPicturePreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!contactNumber.trim()) {
      setError('Contact number is required');
      return;
    }
    if (!sitio) {
      setError('Sitio is required');
      return;
    }
    if (!picture) {
      setError('Picture is required');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('contact_number', contactNumber.trim());
      formData.append('sitio', sitio);
      formData.append('description', description.trim());
      formData.append('evidence', picture);
      formData.append('incident_type', 'Emergency');
      formData.append('incident_category', 'Emergency Report');

      const response = await fetch('/api/incidents/emergency-submit.php', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!data.ok) {
        setError(data.error || 'Failed to submit report');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTrackingNumber(data.tracking_number);
      setLoading(false);

      // Auto close after 3 seconds
      setTimeout(() => {
        resetForm();
        onClose();
      }, 3000);
    } catch (err) {
      setError('Network error: ' + (err instanceof Error ? err.message : 'Unknown error'));
      setLoading(false);
    }
  };

  const resetForm = () => {
    setPicture(null);
    setPicturePreview('');
    setName('');
    setContactNumber('');
    setSitio('');
    setDescription('');
    setError('');
    setSuccess(false);
    setTrackingNumber('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Emergency Report</h2>
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {success ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">Report Submitted Successfully!</h3>
              <p className="text-sm text-gray-600 mb-4">
                Your emergency report has been received and is being reviewed by our team.
              </p>
              <p className="text-sm font-mono bg-gray-100 px-4 py-3 rounded inline-block">
                Tracking: {trackingNumber}
              </p>
              <p className="text-xs text-gray-500 mt-4">Closing in 3 seconds...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Picture Upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Picture <span className="text-red-500">*</span>
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-4 cursor-pointer hover:border-brand hover:bg-brand/5 transition-colors text-center"
                >
                  {picturePreview ? (
                    <img src={picturePreview} alt="Preview" className="w-full h-40 object-cover rounded" />
                  ) : (
                    <div className="py-6">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Click to upload a picture</p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePictureChange}
                  className="hidden"
                />
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Your Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              {/* Contact Number */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Contact Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="09XX-XXX-XXXX"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              {/* Sitio */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Sitio <span className="text-red-500">*</span>
                </label>
                <select
                  value={sitio}
                  onChange={(e) => setSitio(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  <option value="">Select sitio</option>
                  {SITIOS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Brief Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what happened in a few words..."
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand hover:bg-brand/90 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                {loading ? 'Submitting...' : 'Submit Emergency Report'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
