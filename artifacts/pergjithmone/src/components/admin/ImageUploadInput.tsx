import React, { useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Upload, X, Loader2 } from 'lucide-react';
import { compressImageFile } from '@/lib/imageCompression';

const BASE = (import.meta as any).env?.BASE_URL?.replace(/\/$/, '') || '';

/**
 * Reusable cover-image uploader for admin forms (categories, templates, layouts).
 * Uploads the selected file to /api/uploads/image and reports back the resulting URL.
 */
export function ImageUploadInput({
  value,
  onChange,
  label = 'Cover Image',
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}) {
  const { getToken } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    setError('');
    try {
      const compressed = await compressImageFile(file);
      const token = getToken();
      const fd = new FormData();
      fd.append('file', compressed);
      const r = await fetch(`${BASE}/api/uploads/image`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
        body: fd,
      });
      if (!r.ok) {
        const msg = await r.text().catch(() => '');
        throw new Error(msg || 'Upload failed');
      }
      const data = await r.json();
      if (data.url) onChange(data.url);
    } catch (e: any) {
      setError(e?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide block mb-1.5">{label}</label>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
      {value ? (
        <div className="relative w-full h-32 rounded-lg overflow-hidden border border-input group">
          <img src={value} alt="Cover" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="px-3 py-1.5 rounded-lg bg-white/90 text-xs font-medium hover:bg-white"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              className="p-1.5 rounded-lg bg-white/90 hover:bg-white text-red-500"
              title="Remove"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full h-32 rounded-lg border-2 border-dashed border-input flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:border-rose-300 hover:text-rose-500 transition-colors disabled:opacity-60"
        >
          {uploading ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
          <span className="text-xs font-medium">{uploading ? 'Uploading…' : 'Click to upload'}</span>
        </button>
      )}
      {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
    </div>
  );
}
