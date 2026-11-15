/** Distinct status colors so admins can scan tables quickly. */

export const ORDER_STATUS_STYLE: Record<string, string> = {
  pending:   'bg-amber-50 text-amber-800 border-amber-200',
  confirmed: 'bg-sky-50 text-sky-800 border-sky-200',
  printing:  'bg-violet-50 text-violet-800 border-violet-200',
  shipped:   'bg-indigo-50 text-indigo-800 border-indigo-200',
  delivered: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
};

export const ORDER_STATUS_INLINE: Record<string, { bg: string; color: string; border: string }> = {
  pending:   { bg: '#FFFBEB', color: '#92400E', border: '#FDE68A' },
  confirmed: { bg: '#F0F9FF', color: '#075985', border: '#BAE6FD' },
  printing:  { bg: '#F5F3FF', color: '#5B21B6', border: '#DDD6FE' },
  shipped:   { bg: '#EEF2FF', color: '#3730A3', border: '#C7D2FE' },
  delivered: { bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0' },
  cancelled: { bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA' },
};

export function orderStatusClass(status: string): string {
  return ORDER_STATUS_STYLE[status] || 'bg-neutral-50 text-neutral-600 border-neutral-200';
}

export function orderStatusInline(status: string): { bg: string; color: string; border: string } {
  return ORDER_STATUS_INLINE[status] || { bg: '#F4F4F5', color: '#52525B', border: '#E4E4E7' };
}
