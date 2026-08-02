import React, { useState, useRef, useEffect } from 'react';

export const COUNTRY_CODES = [
  // Priority
  { code: '+355', iso: 'al', name: 'Shqipëri' },
  { code: '+383', iso: 'xk', name: 'Kosovë' },
  // Divider
  { code: '', iso: '', name: '', divider: true },
  // Rest alphabetically
  { code: '+43',  iso: 'at', name: 'Austria' },
  { code: '+32',  iso: 'be', name: 'Belgium' },
  { code: '+387', iso: 'ba', name: 'Bosnia' },
  { code: '+359', iso: 'bg', name: 'Bulgaria' },
  { code: '+385', iso: 'hr', name: 'Croatia' },
  { code: '+357', iso: 'cy', name: 'Cyprus' },
  { code: '+420', iso: 'cz', name: 'Czech Rep.' },
  { code: '+45',  iso: 'dk', name: 'Denmark' },
  { code: '+358', iso: 'fi', name: 'Finland' },
  { code: '+33',  iso: 'fr', name: 'France' },
  { code: '+49',  iso: 'de', name: 'Germany' },
  { code: '+30',  iso: 'gr', name: 'Greece' },
  { code: '+36',  iso: 'hu', name: 'Hungary' },
  { code: '+353', iso: 'ie', name: 'Ireland' },
  { code: '+39',  iso: 'it', name: 'Italy' },
  { code: '+389', iso: 'mk', name: 'N. Macedonia' },
  { code: '+373', iso: 'md', name: 'Moldova' },
  { code: '+382', iso: 'me', name: 'Montenegro' },
  { code: '+31',  iso: 'nl', name: 'Netherlands' },
  { code: '+47',  iso: 'no', name: 'Norway' },
  { code: '+48',  iso: 'pl', name: 'Poland' },
  { code: '+351', iso: 'pt', name: 'Portugal' },
  { code: '+40',  iso: 'ro', name: 'Romania' },
  { code: '+381', iso: 'rs', name: 'Serbia' },
  { code: '+421', iso: 'sk', name: 'Slovakia' },
  { code: '+386', iso: 'si', name: 'Slovenia' },
  { code: '+34',  iso: 'es', name: 'Spain' },
  { code: '+46',  iso: 'se', name: 'Sweden' },
  { code: '+41',  iso: 'ch', name: 'Switzerland' },
  { code: '+90',  iso: 'tr', name: 'Turkey' },
  { code: '+380', iso: 'ua', name: 'Ukraine' },
  { code: '+44',  iso: 'gb', name: 'UK' },
  { code: '+1',   iso: 'us', name: 'USA / Canada' },
  { code: '+971', iso: 'ae', name: 'UAE' },
  { code: '+966', iso: 'sa', name: 'Saudi Arabia' },
];

function flagUrl(iso: string) {
  return `https://flagcdn.com/20x15/${iso}.png`;
}

interface PhoneInputProps {
  value: string;
  onChange: (fullPhone: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function PhoneInput({ value: _value, onChange, disabled, placeholder = '6X XXX XXXX' }: PhoneInputProps) {
  const [countryCode, setCountryCode] = useState('+355');
  const [number, setNumber] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const emit = (cc: string, num: string) => {
    const digits = num.replace(/\D/g, '');
    onChange(digits ? `${cc}${digits}` : '');
  };

  const selected = COUNTRY_CODES.find(c => c.code === countryCode) ?? COUNTRY_CODES[0];

  const pick = (c: typeof COUNTRY_CODES[0]) => {
    setCountryCode(c.code);
    emit(c.code, number);
    setOpen(false);
  };

  return (
    <div
      ref={wrapRef}
      className={`relative flex h-12 rounded-xl border border-input bg-background overflow-visible transition-shadow focus-within:ring-2 focus-within:ring-ring ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
    >
      {/* ── Trigger ── */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="shrink-0 flex items-center gap-1.5 bg-muted/40 border-r border-input px-3 rounded-l-xl focus:outline-none cursor-pointer hover:bg-muted/60 transition-colors"
        style={{ minWidth: 82 }}
        tabIndex={0}
      >
        <img
          src={flagUrl(selected.iso)}
          alt={selected.name}
          style={{ width: 20, height: 15, objectFit: 'cover', borderRadius: 2, display: 'block', flexShrink: 0 }}
        />
        <span className="text-sm font-medium text-foreground">{selected.code}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0, opacity: 0.4 }}>
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* ── Number input ── */}
      <input
        type="tel"
        inputMode="numeric"
        value={number}
        onChange={e => { const v = e.target.value.replace(/\D/g, ''); setNumber(v); emit(countryCode, v); }}
        disabled={disabled}
        placeholder={placeholder}
        className="flex-1 px-3 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground rounded-r-xl"
      />

      {/* ── Dropdown ── */}
      {open && (
        <div
          className="absolute left-0 z-50 mt-1 bg-white rounded-xl border border-neutral-200 shadow-xl overflow-hidden"
          style={{ top: '100%', minWidth: 210, maxHeight: 280, overflowY: 'auto' }}
        >
          {COUNTRY_CODES.map((c, i) => {
            if (c.divider) return (
              <div key={i} style={{ height: 1, background: '#e5e7eb', margin: '4px 0' }} />
            );
            const active = c.code === countryCode;
            return (
              <button
                key={c.code + c.name}
                type="button"
                onClick={() => pick(c)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-neutral-50 active:bg-neutral-100"
                style={{ background: active ? '#f4f4f5' : undefined }}
              >
                <img
                  src={flagUrl(c.iso)}
                  alt={c.name}
                  style={{ width: 20, height: 15, objectFit: 'cover', borderRadius: 2, flexShrink: 0, display: 'block' }}
                />
                <span className="flex-1 text-neutral-700 truncate">{c.name}</span>
                <span className="text-neutral-400 text-xs font-mono shrink-0">{c.code}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
