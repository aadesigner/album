import React, { useState } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Italic,
  MousePointerClick,
  Plus,
  Trash2,
  Type,
  Upload,
} from 'lucide-react';
import { ADMIN } from '@/components/layout/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { FontPicker } from '@/components/FontPicker';
import { Input } from '@/components/ui/input';
import { getAt, isBiText, isImgRef, type BiText, type ImgRef } from '@/lib/marketingPages';
import { uploadErrorMessage, uploadImageToApi } from '@/lib/uploadImage';
import { ACCEPT_SAFE_IMAGES } from '@/lib/acceptedImages';
import { usePageEditor } from './PageEditorContext';

const INK = ADMIN.ink;
const MUTED = ADMIN.muted;
const LINE = ADMIN.line;
const CARD = ADMIN.card;
const BG = ADMIN.bg;
const BLUSH = ADMIN.blush;
const SOFT = ADMIN.blushSoft;

function prettyPath(path: string): string {
  const last = path.split('.').pop() || path;
  const words = last
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .replace(/\d+/g, ' $&')
    .trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function PageInspector() {
  const editor = usePageEditor();
  const { getToken } = useAuth();
  const { lang } = useLanguage();
  const sq = lang === 'sq';
  const [uploading, setUploading] = useState(false);
  const path = editor.selected;
  const kind = editor.selectedKind;
  const value = path ? getAt(editor.content, path) : null;

  const kindLabel =
    kind === 'image' ? (sq ? 'Imazh' : 'Image')
      : kind === 'section' ? (sq ? 'Seksion' : 'Section')
        : kind === 'slider' ? (sq ? 'Lista' : 'List')
          : (sq ? 'Tekst' : 'Text');

  return (
    <div className="space-y-4">
      {!path && (
        <div
          className="rounded-2xl border px-4 py-8 text-center"
          style={{ borderColor: LINE, background: BG }}
        >
          <MousePointerClick size={22} className="mx-auto mb-3" style={{ color: BLUSH }} />
          <p className="text-[14px] font-semibold" style={{ color: INK }}>
            {sq ? 'Zgjidh një fushë' : 'Select a field'}
          </p>
          <p className="mt-1.5 text-[12px] leading-relaxed" style={{ color: MUTED }}>
            {sq
              ? 'Kliko një titull, paragraf, foto ose seksion në faqe. Shiriti, menuja dhe fundi janë të kyçur. SQ dhe EN ruhen së bashku. Asgjë nuk del live pa Ruaj.'
              : 'Click a headline, paragraph, image, or section on the page. The offer bar, nav, and footer stay locked. Albanian and English edit together. Nothing goes live until Save.'}
          </p>
        </div>
      )}

      {path && (
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            style={{ background: SOFT, color: INK }}
          >
            <Type size={10} /> {kindLabel}
          </span>
          <p className="truncate text-[13px] font-semibold" style={{ color: INK }} title={path}>
            {prettyPath(path)}
          </p>
        </div>
      )}

      {path && kind === 'section' && <SectionFields path={path} />}

      {path && (kind === 'text' || isBiText(value)) && <BiTextFields path={path} />}

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

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border px-3 py-3 space-y-2.5" style={{ borderColor: LINE, background: CARD }}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: MUTED }}>{title}</p>
      {children}
    </div>
  );
}

function SectionFields({ path }: { path: string }) {
  const editor = usePageEditor();
  const { lang } = useLanguage();
  const sq = lang === 'sq';
  const node = (getAt(editor.content, path) || {}) as { hidden?: boolean; space?: string };
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => editor.patch(`${path}.hidden`, !node.hidden)}
        className="inline-flex items-center gap-1.5 text-[12px] font-semibold rounded-full px-3 py-1.5 border"
        style={{
          color: node.hidden ? BLUSH : INK,
          borderColor: node.hidden ? BLUSH : LINE,
          background: node.hidden ? SOFT : 'transparent',
        }}
      >
        {node.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
        {node.hidden ? (sq ? 'I fshehur' : 'Hidden') : (sq ? 'I dukshëm' : 'Visible')}
      </button>
      <Card title={sq ? 'Hapësira e seksionit' : 'Section padding'}>
        <ChipRow
          value={node.space || 'md'}
          options={[
            { id: 'sm', label: sq ? 'E ngushtë' : 'Compact' },
            { id: 'md', label: sq ? 'Normale' : 'Normal' },
            { id: 'lg', label: sq ? 'E gjerë' : 'Roomy' },
          ]}
          onChange={(space) => editor.patch(`${path}.space`, space)}
        />
      </Card>
    </div>
  );
}

const TRACK_STEPS: Array<NonNullable<BiText['tracking']>> = ['tighter', 'tight', 'normal', 'wide', 'wider', 'widest'];
const TRACK_LABEL: Record<string, string> = {
  tighter: 'Closer',
  tight: 'Tight',
  normal: 'Normal',
  wide: 'Wide',
  wider: 'Wider',
  widest: 'Widest',
};
const TRACK_SAMPLE: Record<string, string> = {
  tighter: '-0.05em',
  tight: '-0.02em',
  normal: '0',
  wide: '0.04em',
  wider: '0.08em',
  widest: '0.14em',
};

const COLORS = ['#1a1a1a', '#5c5248', '#8a7268', '#C45A78', '#6b3a48', '#ffffff'];

const SHADOW_OPTS: Array<{ id: '' | NonNullable<BiText['shadow']>; label: string; css: string }> = [
  { id: '', label: 'Auto', css: 'none' },
  { id: 'none', label: 'None', css: 'none' },
  { id: 'soft', label: 'Soft', css: '0 1px 1px rgba(20,12,16,0.28), 0 2px 8px rgba(20,12,16,0.16)' },
  { id: 'hard', label: 'Hard', css: '0 2px 0 rgba(20,12,16,0.45)' },
  { id: 'glow', label: 'Glow', css: '0 0 14px rgba(196,90,120,0.55), 0 1px 2px rgba(20,12,16,0.28)' },
];

function BiTextFields({ path }: { path: string }) {
  const editor = usePageEditor();
  const { lang } = useLanguage();
  const sqUi = lang === 'sq';
  const raw = getAt(editor.content, path);
  const value: BiText = isBiText(raw) ? raw : { sq: '', en: '' };
  const set = (patch: Partial<BiText>) => editor.patch(path, { ...value, ...patch });
  const blankPair = !value.sq.trim() && !value.en.trim();
  const [copyLang, setCopyLang] = useState<'sq' | 'en'>(lang);
  const activeTrack = value.tracking ? TRACK_STEPS.indexOf(value.tracking) : -1;

  const nudgeTrack = (dir: -1 | 1) => {
    const i = activeTrack < 0 ? 2 : activeTrack;
    const next = TRACK_STEPS[Math.max(0, Math.min(TRACK_STEPS.length - 1, i + dir))];
    set({ tracking: next });
  };

  return (
    <div className="space-y-3">
      {blankPair && (
        <p className="text-[12px] leading-relaxed rounded-lg px-3 py-2" style={{ color: BLUSH, background: SOFT }}>
          {sqUi
            ? 'Të dy gjuhët janë bosh. Ruajtja mban tekstin aktual live që faqja të mos zbardhet.'
            : 'Both languages are empty. Save will keep the current live text so the page cannot go blank.'}
        </p>
      )}

      <Card title={sqUi ? 'Teksti' : 'Copy'}>
        <div className="flex rounded-lg p-0.5" style={{ background: BG, border: `1px solid ${LINE}` }}>
          {(['sq', 'en'] as const).map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => setCopyLang(code)}
              className="flex-1 rounded-md py-1 text-[11px] font-semibold"
              style={{
                background: copyLang === code ? CARD : 'transparent',
                color: copyLang === code ? INK : MUTED,
                boxShadow: copyLang === code ? '0 1px 2px rgba(40,16,28,0.08)' : 'none',
              }}
            >
              {code === 'sq' ? 'Shqip' : 'English'}
            </button>
          ))}
        </div>
        <textarea
          value={copyLang === 'sq' ? value.sq : value.en}
          onChange={(e) => set(copyLang === 'sq' ? { sq: e.target.value } : { en: e.target.value })}
          rows={4}
          className="w-full text-[13px] rounded-lg border px-2.5 py-2 leading-relaxed"
          style={{
            borderColor: LINE,
            color: INK,
            background: BG,
            fontFamily: value.font || undefined,
            letterSpacing: value.tracking ? TRACK_SAMPLE[value.tracking] : undefined,
            fontWeight: value.weight === 'bold' ? 700 : value.weight === 'semibold' ? 600 : value.weight === 'medium' ? 500 : undefined,
            fontStyle: value.italic === 'on' ? 'italic' : undefined,
            textTransform: value.transform === 'uppercase' || value.transform === 'lowercase' ? value.transform : undefined,
          }}
        />
        <p className="text-[10px]" style={{ color: MUTED }}>
          {copyLang === 'sq' ? (sqUi ? 'Gjuha tjetër: English' : 'Other language: English') : (sqUi ? 'Gjuha tjetër: Shqip' : 'Other language: Albanian')}
          {' · '}
          {(copyLang === 'sq' ? value.en : value.sq).slice(0, 48) || '—'}
        </p>
      </Card>

      <Card title={sqUi ? 'Tipografia' : 'Type'}>
        <FontPicker tone="admin" value={value.font} onChange={(font) => set({ font })} />
        <div className="flex items-center gap-1">
          <IconToggle
            title="Bold"
            on={value.weight === 'bold' || value.weight === 'semibold'}
            onClick={() => set({ weight: value.weight === 'bold' ? undefined : 'bold' })}
          >
            <Bold size={13} />
          </IconToggle>
          <IconToggle
            title="Italic"
            on={value.italic === 'on'}
            onClick={() => set({ italic: value.italic === 'on' ? 'off' : 'on' })}
          >
            <Italic size={13} />
          </IconToggle>
          <span className="w-px h-5 mx-1" style={{ background: LINE }} />
          {([
            ['left', AlignLeft],
            ['center', AlignCenter],
            ['right', AlignRight],
          ] as const).map(([id, Icon]) => (
            <IconToggle
              key={id}
              title={id}
              on={value.align === id}
              onClick={() => set({ align: value.align === id ? undefined : id })}
            >
              <Icon size={13} />
            </IconToggle>
          ))}
        </div>
        <ChipRow
          value={value.weight || ''}
          options={[
            { id: '', label: 'Auto' },
            { id: 'normal', label: 'Regular' },
            { id: 'medium', label: 'Medium' },
            { id: 'semibold', label: 'Semi' },
            { id: 'bold', label: 'Bold' },
          ]}
          onChange={(weight) => set({ weight: (weight || undefined) as BiText['weight'] })}
        />
        <ChipRow
          value={value.size || ''}
          options={[
            { id: '', label: 'Auto' },
            { id: 'sm', label: 'S' },
            { id: 'md', label: 'M' },
            { id: 'lg', label: 'L' },
            { id: 'xl', label: 'XL' },
          ]}
          onChange={(size) => set({ size: (size || undefined) as BiText['size'] })}
        />
        <div>
          <p className="text-[11px] font-semibold mb-1.5" style={{ color: MUTED }}>{sqUi ? 'Ngjyra' : 'Color'}</p>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => set({ color: undefined })}
              className="h-7 px-2 rounded-full text-[10px] font-semibold border"
              style={{
                borderColor: !value.color ? BLUSH : LINE,
                background: !value.color ? SOFT : 'transparent',
              }}
            >
              Auto
            </button>
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => set({ color: c })}
                className="h-7 w-7 rounded-full border"
                style={{
                  background: c,
                  borderColor: value.color === c ? BLUSH : 'rgba(0,0,0,0.12)',
                  boxShadow: value.color === c ? `0 0 0 2px ${SOFT}` : undefined,
                }}
                aria-label={c}
              />
            ))}
            <input
              type="color"
              value={/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.color || '') ? value.color! : '#1a1a1a'}
              onChange={(e) => set({ color: e.target.value })}
              className="h-7 w-8 cursor-pointer rounded border bg-transparent p-0"
              style={{ borderColor: LINE }}
              title={sqUi ? 'Ngjyrë tjetër' : 'Custom color'}
            />
          </div>
        </div>
      </Card>

      <Card title={sqUi ? 'Hapësira e shkronjave' : 'Spacing'}>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[11px] font-semibold" style={{ color: MUTED }}>
              {sqUi ? 'Gjerësia (AV)' : 'Tracking (AV)'}
            </p>
            <span className="text-[11px] font-semibold tabular-nums" style={{ color: INK }}>
              {value.tracking ? TRACK_LABEL[value.tracking] : 'Auto'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => nudgeTrack(-1)}
              className="h-8 w-8 rounded-lg border text-[16px] font-semibold"
              style={{ borderColor: LINE, color: INK }}
              aria-label={sqUi ? 'Më afër' : 'Closer'}
            >
              −
            </button>
            <div className="flex-1 h-1.5 rounded-full" style={{ background: LINE }}>
              <div
                className="h-1.5 rounded-full"
                style={{
                  width: `${((activeTrack < 0 ? 2 : activeTrack) / (TRACK_STEPS.length - 1)) * 100}%`,
                  background: BLUSH,
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => nudgeTrack(1)}
              className="h-8 w-8 rounded-lg border text-[16px] font-semibold"
              style={{ borderColor: LINE, color: INK }}
              aria-label={sqUi ? 'Më gjerë' : 'Wider'}
            >
              +
            </button>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1">
            {TRACK_STEPS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => set({ tracking: id })}
                className="rounded-lg border py-1.5 text-[10px] font-semibold"
                style={{
                  borderColor: value.tracking === id ? BLUSH : LINE,
                  background: value.tracking === id ? SOFT : BG,
                  letterSpacing: TRACK_SAMPLE[id],
                  color: INK,
                }}
              >
                {sqUi && id === 'tighter' ? 'Afër' : sqUi && id === 'widest' ? 'Më gjerë' : TRACK_LABEL[id]}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => set({ tracking: undefined })}
            className="mt-1.5 text-[11px] font-semibold"
            style={{ color: MUTED }}
          >
            {sqUi ? 'Auto (si në faqe)' : 'Auto (page default)'}
          </button>
        </div>
        <ChipRow
          value={value.leading || ''}
          options={[
            { id: '', label: 'Auto' },
            { id: 'tight', label: sqUi ? 'E ngjeshur' : 'Tight' },
            { id: 'snug', label: 'Snug' },
            { id: 'normal', label: sqUi ? 'Normale' : 'Normal' },
            { id: 'relaxed', label: sqUi ? 'E lirë' : 'Relaxed' },
          ]}
          onChange={(leading) => set({ leading: (leading || undefined) as BiText['leading'] })}
        />
      </Card>

      <Card title={sqUi ? 'Efekti' : 'Look'}>
        <p className="text-[11px] font-semibold" style={{ color: MUTED }}>
          {sqUi ? 'Hija e shkronjave' : 'Text shadow'}
        </p>
        <div className="grid grid-cols-5 gap-1">
          {SHADOW_OPTS.map((opt) => {
            const on = (value.shadow || '') === opt.id;
            return (
              <button
                key={opt.id || 'auto'}
                type="button"
                onClick={() => set({ shadow: (opt.id || undefined) as BiText['shadow'] })}
                className="rounded-lg border py-2 px-1"
                style={{
                  borderColor: on ? BLUSH : LINE,
                  background: on ? SOFT : BG,
                }}
              >
                <span
                  className="block font-serif text-[15px] font-semibold"
                  style={{ color: INK, textShadow: opt.css === 'none' ? undefined : opt.css }}
                >
                  Aa
                </span>
                <span className="block text-[9px] font-semibold mt-0.5" style={{ color: MUTED }}>{opt.label}</span>
              </button>
            );
          })}
        </div>
        <ChipRow
          value={value.transform || ''}
          options={[
            { id: '', label: 'Auto' },
            { id: 'none', label: 'As written' },
            { id: 'uppercase', label: 'UPPER' },
            { id: 'lowercase', label: 'lower' },
          ]}
          onChange={(transform) => set({ transform: (transform || undefined) as BiText['transform'] })}
        />
        <ChipRow
          value={value.dim || ''}
          options={[
            { id: '', label: 'Auto' },
            { id: 'off', label: '100%' },
            { id: 'soft', label: '78%' },
            { id: 'faint', label: '52%' },
          ]}
          onChange={(dim) => set({ dim: (dim || undefined) as BiText['dim'] })}
        />
      </Card>
    </div>
  );
}

function IconToggle({
  on, onClick, title, children,
}: {
  on: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="h-8 w-8 inline-flex items-center justify-center rounded-lg border"
      style={{
        borderColor: on ? BLUSH : LINE,
        background: on ? SOFT : 'transparent',
        color: INK,
      }}
    >
      {children}
    </button>
  );
}

function ChipRow({
  value,
  options,
  onChange,
}: {
  value: string;
  options: Array<{ id: string; label: string }>;
  onChange: (id: string) => void;
}) {
  return (
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
              borderColor: on ? BLUSH : LINE,
              background: on ? SOFT : 'transparent',
              color: INK,
            }}
          >
            {opt.label}
          </button>
        );
      })}
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
  const { lang } = useLanguage();
  const sq = lang === 'sq';
  const raw = getAt(editor.content, path);
  const src = isImgRef(raw) ? raw.src : '';
  return (
    <div className="space-y-3">
      {src && (
        <div className="rounded-xl overflow-hidden border" style={{ borderColor: LINE }}>
          <img src={src} alt="" className="w-full object-cover max-h-44" />
        </div>
      )}
      <Input
        value={src}
        onChange={(e) => editor.patch(path, { src: e.target.value.trim() })}
        placeholder="https://… or /api/uploads/files/…"
      />
      {!src.trim() && (
        <p className="text-[12px] leading-relaxed" style={{ color: BLUSH }}>
          {sq
            ? 'URL bosh. Ruajtja mban imazhin aktual live.'
            : 'Empty image URL. Save will keep the current live image.'}
        </p>
      )}
      <label
        className="inline-flex items-center gap-1.5 text-[12px] font-semibold cursor-pointer rounded-full px-3 py-1.5 border"
        style={{ color: ADMIN.blushDeep, borderColor: LINE }}
      >
        <Upload size={13} /> {uploading ? (sq ? 'Duke ngarkuar…' : 'Uploading…') : (sq ? 'Ngarko foto' : 'Upload image')}
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
  const { lang } = useLanguage();
  const sq = lang === 'sq';
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
        <div key={i} className="flex items-center gap-1 rounded-xl border px-2 py-1.5" style={{ borderColor: LINE }}>
          <button type="button" className="text-[12px] flex-1 text-left font-medium" onClick={() => {
            const item = items[i];
            if (isBiText(item)) editor.select(`${path}.${i}`, 'text');
            else if (isImgRef(item)) editor.select(`${path}.${i}`, 'image');
            else editor.select(`${path}.${i}.label`, 'text');
          }}>
            {sq ? `Artikulli ${i + 1}` : `Item ${i + 1}`}
          </button>
          <button type="button" onClick={() => move(i, -1)} disabled={i === 0}><ChevronUp size={13} /></button>
          <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1}><ChevronDown size={13} /></button>
          <button type="button" onClick={() => remove(i)} disabled={items.length <= 1}><Trash2 size={13} /></button>
        </div>
      ))}
      <button type="button" onClick={add} className="inline-flex items-center gap-1 text-[12px] font-semibold" style={{ color: ADMIN.blushDeep }}>
        <Plus size={13} /> {sq ? 'Shto' : 'Add item'}
      </button>
    </div>
  );
}
