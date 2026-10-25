import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { ADMIN } from '@/components/layout/AdminLayout';

const SIZE: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-3xl',
  full: 'max-w-[1180px]',
};

/**
 * Admin dialog with a sticky header + footer.
 * Scroll stays in the body so builder chrome / forms never cover Cancel / Save.
 */
export function AdminModal({
  title,
  subtitle,
  icon,
  onClose,
  footer,
  children,
  size = 'md',
  tall = false,
  closeOnEscape = true,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  onClose: () => void;
  footer?: React.ReactNode;
  children: React.ReactNode;
  size?: keyof typeof SIZE;
  /** Fill most of the viewport (layout builder). */
  tall?: boolean;
  closeOnEscape?: boolean;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose, closeOnEscape]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-5"
      style={{ background: 'rgba(20, 12, 16, 0.46)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className={`bg-white shadow-2xl w-full ${SIZE[size]} flex flex-col overflow-hidden`}
        style={{
          borderRadius: 20,
          maxHeight: tall ? 'min(94vh, 920px)' : 'min(90vh, 820px)',
          height: tall ? 'min(94vh, 920px)' : undefined,
          border: `1px solid ${ADMIN.line}`,
        }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header
          className="shrink-0 flex items-start gap-3 px-5 py-3.5"
          style={{ borderBottom: `1px solid ${ADMIN.line}`, background: ADMIN.card }}
        >
          {icon && (
            <div
              className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: ADMIN.blushSoft }}
            >
              {icon}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="font-serif text-lg font-semibold leading-tight" style={{ color: ADMIN.ink }}>
              {title}
            </h3>
            {subtitle && (
              <p className="text-[12px] mt-0.5 leading-snug" style={{ color: ADMIN.muted }}>{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg shrink-0 hover:bg-black/5"
            style={{ color: ADMIN.muted }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </header>
        <div className={`flex-1 min-h-0 overflow-x-hidden ${tall ? 'overflow-hidden flex flex-col' : 'overflow-y-auto'}`}>
          {children}
        </div>
        {footer && (
          <footer
            className="shrink-0 px-5 py-3.5 flex flex-wrap items-center gap-2"
            style={{ borderTop: `1px solid ${ADMIN.line}`, background: ADMIN.card }}
          >
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
