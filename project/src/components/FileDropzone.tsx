import { useState, useRef, useEffect, type RefObject } from 'react';
import { FileUp, Camera, X, RotateCcw } from 'lucide-react';
import { compressImage } from '../utils/imageCompression';

export function FileDropzone({
  label,
  file,
  previewUrl,
  accept,
  required,
  inputRef,
  onChange,
  onClear,
  maxSizeMB = 5,
  enableCamera = false,
}: {
  label: string;
  file: File | null;
  previewUrl: string | null;
  accept: string;
  required: boolean;
  inputRef: RefObject<HTMLInputElement>;
  onChange: (file: File | null) => void;
  onClear: () => void;
  maxSizeMB?: number;
  enableCamera?: boolean;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hasPreview = Boolean(file || previewUrl);
  const displayName = file?.name ?? 'Current file';
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  const isImageAccept = accept.includes('image');

  const setFileToInput = (nextFile: File) => {
    if (!inputRef.current) return;
    const dt = new DataTransfer();
    dt.items.add(nextFile);
    inputRef.current.files = dt.files;
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
  };

  const startCamera = async (facing: 'user' | 'environment' = 'environment') => {
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setError('Unable to access camera. Please allow camera permissions.');
      setCameraOpen(false);
    }
  };

  useEffect(() => {
    if (cameraOpen) {
      startCamera(facingMode);
    } else {
      stopCamera();
    }
    return () => stopCamera();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraOpen, facingMode]);

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    
    let quality = 0.9;
    const maxSize = maxSizeMB * 1024 * 1024;
    
    const tryCompress = (q: number) => {
      canvas.toBlob((blob) => {
        if (blob) {
          if (blob.size > maxSize && q > 0.3) {
            tryCompress(q - 0.1);
          } else {
            const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
            onChange(file);
            setCameraOpen(false);
            stopCamera();
          }
        }
      }, 'image/jpeg', q);
    };
    
    tryCompress(quality);
  };

  const validateAndSetFile = async (nextFile: File | null) => {
    if (!nextFile) {
      setError(null);
      onChange(null);
      return;
    }

    // Check if it's an image
    const isImage = nextFile.type.startsWith('image/');
    
    if (nextFile.size > maxSizeBytes) {
      if (isImage) {
        // Try to compress the image
        setError('Compressing image...');
        try {
          const compressed = await compressImage(nextFile, maxSizeMB);
          if (compressed.size > maxSizeBytes) {
            const fileSizeMB = (compressed.size / (1024 * 1024)).toFixed(2);
            setError(`File size (${fileSizeMB}MB) still exceeds ${maxSizeMB}MB after compression. Please choose a smaller image.`);
            if (inputRef.current) inputRef.current.value = '';
            onChange(null);
          } else {
            setError(null);
            onChange(compressed);
          }
        } catch (err) {
          const fileSizeMB = (nextFile.size / (1024 * 1024)).toFixed(2);
          setError(`File size (${fileSizeMB}MB) exceeds ${maxSizeMB}MB and compression failed. Please choose a smaller image.`);
          if (inputRef.current) inputRef.current.value = '';
          onChange(null);
        }
      } else {
        const fileSizeMB = (nextFile.size / (1024 * 1024)).toFixed(2);
        setError(`File size (${fileSizeMB}MB) exceeds ${maxSizeMB}MB limit. Please choose a smaller file.`);
        if (inputRef.current) inputRef.current.value = '';
        onChange(null);
      }
      return;
    }

    setError(null);
    onChange(nextFile);
  };

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>

      <div
        className={`relative rounded-xl border-2 border-dashed p-4 transition-colors bg-white ${
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(false);
          const nextFile = e.dataTransfer.files?.[0];
          if (!nextFile) return;
          setFileToInput(nextFile);
          validateAndSetFile(nextFile);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          required={required}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          onChange={(e) => {
            const nextFile = e.target.files?.[0] ?? null;
            validateAndSetFile(nextFile);
          }}
        />

        {hasPreview ? (
          <div className="space-y-3">
            {previewUrl ? (
              <div className="w-full h-40 rounded-lg overflow-hidden bg-gray-50 border border-gray-200">
                <img src={previewUrl} alt={`${label} preview`} className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="w-full h-40 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center">
                <div className="text-center">
                  <FileUp className="w-10 h-10 text-gray-500 mx-auto" />
                  <p className="mt-2 text-sm font-semibold text-gray-700">{displayName}</p>
                  <p className="mt-1 text-xs text-gray-500">Click to replace</p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
                <p className="text-xs text-gray-500">Click box to replace</p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onClear();
                }}
                className="text-sm font-semibold text-red-600 hover:text-red-700"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <div className="py-10 text-center">
            <FileUp className="w-12 h-12 text-blue-600 mx-auto" />
            <p className="mt-3 text-sm font-semibold text-gray-900">Select Files to Upload</p>
            <p className="mt-1 text-xs text-gray-500">or drag and drop</p>
          </div>
        )}
      </div>
      {error && (
        <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}
      {enableCamera && isImageAccept && !hasPreview && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            setCameraOpen(true);
          }}
          className="mt-3 w-full flex items-center justify-center gap-2 rounded-lg border border-brand/30 bg-brand/5 px-4 py-2.5 text-sm font-semibold text-brand hover:bg-brand/10 transition-colors"
        >
          <Camera className="w-4 h-4" />
          Take Photo with Camera
        </button>
      )}

      {/* Camera Modal */}
      {cameraOpen && (
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
              <h3 className="text-lg font-bold text-gray-900">Take Photo</h3>
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
                className="w-full h-full object-cover"
              />
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
                onClick={capturePhoto}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-brand text-white font-semibold hover:bg-brand/90 transition-colors shadow-sm"
              >
                <Camera className="w-5 h-5" />
                Capture
              </button>
            </div>
          </div>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
