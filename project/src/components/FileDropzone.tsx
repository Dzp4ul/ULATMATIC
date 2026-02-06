import { useState, type RefObject } from 'react';
import { FileUp } from 'lucide-react';

export function FileDropzone({
  label,
  file,
  previewUrl,
  accept,
  required,
  inputRef,
  onChange,
  onClear,
}: {
  label: string;
  file: File | null;
  previewUrl: string | null;
  accept: string;
  required: boolean;
  inputRef: RefObject<HTMLInputElement>;
  onChange: (file: File | null) => void;
  onClear: () => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const hasPreview = Boolean(file || previewUrl);
  const displayName = file?.name ?? 'Current file';

  const setFileToInput = (nextFile: File) => {
    if (!inputRef.current) return;
    const dt = new DataTransfer();
    dt.items.add(nextFile);
    inputRef.current.files = dt.files;
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
          onChange(nextFile);
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
            onChange(nextFile);
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
    </div>
  );
}
