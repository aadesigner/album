import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Plus, Trash2, Upload, Eye, EyeOff } from 'lucide-react';
import { ADMIN } from '@/components/layout/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { FontPicker } from '@/components/FontPicker';
import { Input } from '@/components/ui/input';
import { getAt, isBiText, isImgRef, type BiText, type ImgRef } from '@/lib/marketingPages';
import { uploadErrorMessage, uploadImageToApi } from '@/lib/uploadImage';
import { ACCEPT_SAFE_IMAGES } from '@/lib/acceptedImages';
import { usePageEditor } from './PageEditorContext';

export function PageInspector() {
  const editor = usePageEditor();
  const { getToken } = useAuth();
  const [uploading, setUploading] = useState(false);
  const path = editor.selected;
  const kind = editor.selectedKind;
  const value = path ? getAt(editor.content, path) : null;

  return (
    <div className="space-y-4">
      <p className="text-[10px] uppercase tracking-[0.16em] font-semibold" style={{ color: ADMIN.muted }}>
        Inspector
      </p>
      {!path && (
        <p className="text-[13px] leading-relaxed" style={{ color: ADMIN.muted }}>
          Click a headline, paragraph, image, or section in the page body. The offer bar, navigation, and footer are locked. Albanian and English edit together. Nothing goes live until Save.
        </p>
      )}
      {path && (
        <p className="text-[11px] font-mono break-all" style={{ color: ADMIN.muted }}>{path}</p>
      )}

      {path && kind === 'section' && (
        <SectionFields path={path} />
      )}

      {path && (kind === 'text' || isBiText(value)) && (
        <BiTextFields path={path} />
      )}

      {path && (kind === 'image' || isImgRef(value)) && (
        <ImageFields
          path={path}
          uploading={uploading}
          onUpload={async (file) => {
            setUploading(true);
            try {
              const url = await uploadImageToApi(file, getToken());
              editor.patch(path, { src: url } satisfies ImgRef);
            } catch (err) {
              window.alert(uploadErrorMessage(err, 'en'));
            } finally {
              setUploading(false);
            }
          }}
        />
      )}

      {path && kind === 'slider' && Array.isArray(value) && (
        <SliderFields path={path} items={value} />
      )}
    </div>
  );
}

function SectionFields({ path }: { path: string }) {
  const editor = usePageEditor();
  const node = (getAt(editor.content, path) || {}) as { hidden?: boolean; space?: string };
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-[13px]" style={{ color: ADMIN.ink }}>
        <button
          type="button"
          onClick={() => editor.patch(`${path}.hidden`, !node.hidden)}
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold"
          style={{ color: node.hidden ? ADMIN.blush : ADMIN.ink }}
        >
          {node.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
          {node.hidden ? 'Hidden' : 'Visible'}
        </button>
      </label>
      <label className="block text-[11px] font-semibold uppercase tracking-wide" style={{ color: ADMIN.muted }}>Spacing</label>
      <div className="flex gap-1">
        {(['sm', 'md', 'lg'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => editor.patch(`${path}.space`, s)}
            className="px-2 py-1 rounded text-[11px] font-semibold uppercase border"
            style={{
              borderColor: node.space === s ? ADMIN.blush : ADMIN.line,
              background: node.space === s ? ADMIN.blushSoft : 'transparent',
            }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function BiTextFields({ path }: { path: string }) {
  const editor = usePageEditor();
  const raw = getAt(editor.content, path);
  const value: BiText = isBiText(raw) ? raw : { sq: '', en: '' };
  const set = (patch: Partial<BiText>) => editor.patch(path, { ...value, ...patch });
  const blankPair = !value.sq.trim() && !value.en.trim();
  return (
    <div className="space-y-3">
      {blankPair && (
        <p className="text-[12px] leading-relaxed" style={{ color: ADMIN.blush }}>
          Both languages are empty. Save will keep the current live text so the page cannot go blank.
        </p>
      )}
      <label className="block text-[11px] font-semibold uppercase tracking-wide" style={{ color: ADMIN.muted }}>Albanian</label>
      <textarea
        value={value.sq}
        onChange={(e) => set({ sq: e.target.value })}
        rows={3}
        className="w-full text-[13px] rounded-lg border px-2.5 py-2"
        style={{ borderColor: ADMIN.line, color: ADMIN.ink, background: ADMIN.bg }}
      />
      <label className="block text-[11px] font-semibold uppercase tracking-wide" style={{ color: ADMIN.muted }}>English</label>
      <textarea
        value={value.en}
        onChange={(e) => set({ en: e.target.value })}
        rows={3}
        className="w-full text-[13px] rounded-lg border px-2.5 py-2"
        style={{ borderColor: ADMIN.line, color: ADMIN.ink, background: ADMIN.bg }}
      />
      <label className="block text-[11px] font-semibold uppercase tracking-wide" style={{ color: ADMIN.muted }}>Font</label>
      <FontPicker tone="admin" value={value.font} onChange={(font) => set({ font })} />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: ADMIN.muted }}>Size</label>
          <select
            value={value.size || ''}
            onChange={(e) => set({ size: (e.target.value || undefined) as BiText['size'] })}
            className="w-full text-[12px] rounded-lg border px-2 py-1.5"
            style={{ borderColor: ADMIN.line }}
          >
            <option value="">Default</option>
            <option value="sm">Small</option>
            <option value="md">Medium</option>
            <option value="lg">Large</option>
            <option value="xl">XL</option>
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: ADMIN.muted }}>Align</label>
          <select
            value={value.align || ''}
            onChange={(e) => set({ align: (e.target.value || undefined) as BiText['align'] })}
            className="w-full text-[12px] rounded-lg border px-2 py-1.5"
            style={{ borderColor: ADMIN.line }}
          >
            <option value="">Default</option>
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </div>
      </div>
      <ChipRow
        label="Weight"
        value={value.weight || ''}
        options={[
          { id: '', label: 'Auto' },
          { id: 'normal', label: 'Regular' },
          { id: 'medium', label: 'Medium' },
          { id: 'semibold', label: 'Semibold' },
        ]}
        onChange={(weight) => set({ weight: (weight || undefined) as BiText['weight'] })}
      />
      <ChipRow
        label="Italic"
        value={value.italic || ''}
        options={[
          { id: '', label: 'Auto' },
          { id: 'off', label: 'Off' },
          { id: 'on', label: 'On' },
        ]}
        onChange={(italic) => set({ italic: (italic || undefined) as BiText['italic'] })}
      />
      <ChipRow
        label="Line height"
        value={value.leading || ''}
        options={[
          { id: '', label: 'Auto' },
          { id: 'tight', label: 'Tight' },
          { id: 'snug', label: 'Snug' },
          { id: 'normal', label: 'Normal' },
          { id: 'relaxed', label: 'Relaxed' },
        ]}
        onChange={(leading) => set({ leading: (leading || undefined) as BiText['leading'] })}
      />
      <ChipRow
        label="Tracking"
        value={value.tracking || ''}
        options={[
          { id: '', label: 'Auto' },
          { id: 'tight', label: 'Tight' },
          { id: 'normal', label: 'Normal' },
          { id: 'wide', label: 'Wide' },
        ]}
        onChange={(tracking) => set({ tracking: (tracking || undefined) as BiText['tracking'] })}
      />
      <ChipRow
        label="Box shadow"
        value={value.shadow || ''}
        options={[
          { id: '', label: 'Auto' },
          { id: 'none', label: 'None' },
          { id: 'soft', label: 'Soft' },
          { id: 'strong', label: 'Strong' },
        ]}
        onChange={(shadow) => set({ shadow: (shadow || undefined) as BiText['shadow'] })}
      />
    </div>
  );
}

function ChipRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ id: string; label: string }>;
  onChange: (id: string) => void;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: ADMIN.muted }}>{label}</p>
      <div className="flex flex-wrap gap-1">
        {options.map((opt) => {
          const on = value === opt.id;
          return (
            <button
              key={opt.id || 'auto'}
              type="button"
              onClick={() => onChange(opt.id)}
              className="px-2 py-1 rounded-full text-[11px] font-semibold border"
              style={{
                borderColor: on ? ADMIN.blush : ADMIN.line,
                background: on ? ADMIN.blushSoft : 'transparent',
                color: ADMIN.ink,
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ImageFields({
  path, uploading, onUpload,
}: {
  path: string;
  uploading: boolean;
  onUpload: (file: File) => void;
}) {
  const editor = usePageEditor();
  const raw = getAt(editor.content, path);
  const src = isImgRef(raw) ? raw.src : '';
  return (
    <div className="space-y-3">
      {src && <img src={src} alt="" className="w-full rounded-lg object-cover max-h-40" />}
      <Input
        value={src}
        onChange={(e) => editor.patch(path, { src: e.target.value.trim() })}
        placeholder="https://… or /api/uploads/files/…"
      />
      {!src.trim() && (
        <p className="text-[12px] leading-relaxed" style={{ color: ADMIN.blush }}>
          Empty image URL. Save will keep the current live image so the page cannot lose it.
        </p>
      )}
      <label className="inline-flex items-center gap-1.5 text-[12px] font-semibold cursor-pointer" style={{ color: ADMIN.blushDeep }}>
        <Upload size={13} /> {uploading ? 'Uploading…' : 'Upload image'}
        <input
          type="file"
          accept={ACCEPT_SAFE_IMAGES}
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(file);
            e.target.value = '';
          }}
        />
      </label>
    </div>
  );
}

function SliderFields({ path, items }: { path: string; items: unknown[] }) {
  const editor = usePageEditor();
  const move = (i: number, dir: number) => {
    const next = [...items];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    editor.patch(path, next);
  };
  const remove = (i: number) => {
    if (items.length <= 1) return;
    editor.patch(path, items.filter((_, idx) => idx !== i));
  };
  const add = () => {
    const last = items[items.length - 1];
    const clone = last && typeof last === 'object' ? JSON.parse(JSON.stringify(last)) : { sq: '', en: '' };
    editor.patch(path, [...items, clone]);
  };
  return (
    <div className="space-y-2">
      {items.map((_, i) => (
        <div key={i} className="flex items-center gap-1 rounded-lg border px-2 py-1.5" style={{ borderColor: ADMIN.line }}>
          <button type="button" className="text-[12px] flex-1 text-left" onClick={() => {
            const item = items[i];
            if (isBiText(item)) editor.select(`${path}.${i}`, 'text');
            else if (isImgRef(item)) editor.select(`${path}.${i}`, 'image');
            else editor.select(`${path}.${i}.label`, 'text');
          }}>
            Slide {i + 1}
          </button>
          <button type="button" onClick={() => move(i, -1)} disabled={i === 0}><ChevronUp size={13} /></button>
          <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1}><ChevronDown size={13} /></button>
          <button type="button" onClick={() => remove(i)} disabled={items.length <= 1}><Trash2 size={13} /></button>
        </div>
      ))}
      <button type="button" onClick={add} className="inline-flex items-center gap-1 text-[12px] font-semibold" style={{ color: ADMIN.blushDeep }}>
        <Plus size={13} /> Add item
      </button>
    </div>
  );
}
