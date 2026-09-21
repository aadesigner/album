import React, { useState, useEffect } from 'react';
import { AdminLayout, ADMIN } from '@/components/layout/AdminLayout';
import {
  useListAdminUsers, useUpdateAdminUser, useDeleteAdminUser,
  useListAdminOrders, useUpdateAdminOrder,
  getListAdminUsersQueryKey, getGetAdminStatsQueryKey,
} from '@workspace/api-client-react-tsconfig';
import { format } from 'date-fns';
import { Search, UserPlus, Trash2, ShieldBan, ShieldCheck, RefreshCw, Images, Eye, ExternalLink, Download, X, Pencil, KeyRound, ShoppingBag, FolderOpen } from 'lucide-react';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

const BASE = (import.meta as any).env?.BASE_URL?.replace(/\/$/, '') || '';

/** pdfUrl is auth-gated — append access token so iframe/<a> work. */
function authedPdfUrl(pdfUrl: string, token: string | null): string {
  if (!pdfUrl) return pdfUrl;
  const withBase = pdfUrl.startsWith('http') ? pdfUrl : `${BASE}${pdfUrl.startsWith('/') ? '' : '/'}${pdfUrl}`;
  if (!token) return withBase;
  const join = withBase.includes('?') ? '&' : '?';
  return `${withBase}${join}token=${encodeURIComponent(token)}`;
}

/** Internal placeholder emails for phone-only accounts — never show as a real email. */
function isSyntheticPhoneEmail(email: string | null | undefined): boolean {
  return !!email && /@ph\.local$/i.test(email);
}

function displayEmail(email: string | null | undefined): string {
  if (!email || isSyntheticPhoneEmail(email)) return '';
  return email;
}

function displayContact(u: { phone?: string | null; email?: string | null }): string {
  if (u.phone) return u.phone;
  const email = displayEmail(u.email);
  return email || '—';
}

type UserFilter = 'all' | 'ordered' | 'not_ordered' | 'has_projects' | 'no_projects' | 'banned' | 'active' | 'admin' | 'user';

const USER_FILTERS: { id: UserFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'ordered', label: 'Ordered' },
  { id: 'not_ordered', label: 'Not ordered' },
  { id: 'has_projects', label: 'Has albums' },
  { id: 'no_projects', label: 'No albums' },
  { id: 'active', label: 'Active' },
  { id: 'banned', label: 'Banned' },
  { id: 'admin', label: 'Admins' },
  { id: 'user', label: 'Users' },
];

function csvEscape(value: unknown): string {
  const s = value == null ? '' : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadUsersCsv(rows: any[], filter: UserFilter) {
  const headers = [
    'id', 'name', 'phone', 'email', 'role', 'status',
    'orders', 'albums', 'joined', 'last_login', 'admin_note',
  ];
  const lines = [
    headers.join(','),
    ...rows.map((u) => [
      u.id,
      u.name || '',
      u.phone || '',
      displayEmail(u.email),
      u.role || '',
      u.isBanned ? 'banned' : 'active',
      u.orderCount ?? 0,
      u.projectCount ?? 0,
      u.createdAt ? format(new Date(u.createdAt), 'yyyy-MM-dd HH:mm') : '',
      u.lastLoginAt ? format(new Date(u.lastLoginAt), 'yyyy-MM-dd HH:mm') : '',
      u.adminNote || '',
    ].map(csvEscape).join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = format(new Date(), 'yyyy-MM-dd');
  a.href = url;
  a.download = `users-${filter === 'all' ? 'all' : filter}-${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ── Create user modal ─────────────────────────────────────────────────────────
function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  // Regular members are identified by phone (matching public sign-up); admins created
  // here don't need a public phone number, so they're identified by email instead.
  const { getToken } = useAuth();
  const [form, setForm] = useState({ phone: '', email: '', name: '', password: '', role: 'user' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isAdmin = form.role === 'admin';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const token = getToken();
      const r = await fetch(`${BASE}/api/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        credentials: 'include',
        body: JSON.stringify(
          isAdmin
            ? { email: form.email, name: form.name, password: form.password, role: form.role }
            : { phone: form.phone, name: form.name, password: form.password, role: form.role },
        ),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error || 'Failed to create user'); return; }
      onCreated();
      onClose();
    } catch { setError('Network error'); } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-2xl flex items-center justify-center" style={{ background: ADMIN.blushSoft }}>
            <UserPlus size={16} style={{ color: ADMIN.blushDeep }} />
          </div>
          <h3 className="font-serif text-lg font-semibold">Create User</h3>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide block mb-1.5">Role</label>
            <select
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {isAdmin ? (
            <div>
              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide block mb-1.5">Email *</label>
              <Input type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="admin@example.com" />
              <p className="text-[11px] text-neutral-400 mt-1">Admins sign in with email instead of a phone number.</p>
            </div>
          ) : (
            <div>
              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide block mb-1.5">Numri i Telefonit *</label>
              <PhoneInput value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} />
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide block mb-1.5">Full Name</label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Doe" />
          </div>
          <div>
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide block mb-1.5">Password *</label>
            <Input type="password" required value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 6 characters" minLength={6} />
          </div>
          {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={loading} className="flex-1 text-white hover:opacity-90 rounded-2xl" style={{ background: ADMIN.blush }}>
              {loading ? 'Creating…' : 'Create User'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Edit user modal ───────────────────────────────────────────────────────────
function EditUserModal({ targetUser, onClose, onSaved }: {
  targetUser: { id: number; name: string | null; email: string; phone: string | null; adminNote?: string | null };
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: targetUser.name || '',
    email: displayEmail(targetUser.email),
    phone: targetUser.phone || '',
    adminNote: targetUser.adminNote || '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const updateUser = useUpdateAdminUser();
  const hadSyntheticEmail = isSyntheticPhoneEmail(targetUser.email);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const password = form.password.trim();
      if (password || form.confirmPassword) {
        if (password.length < 8) {
          setError('Password must be at least 8 characters');
          setLoading(false);
          return;
        }
        if (password !== form.confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }
      }
      const email = form.email.trim();
      const data: Record<string, unknown> = {
        name: form.name,
        phone: form.phone || null,
        adminNote: form.adminNote,
      };
      // Don't push empty/synthetic email updates for phone-only accounts.
      if (email) {
        data.email = email;
      } else if (!hadSyntheticEmail && targetUser.email) {
        // Clearing a real email isn't supported without a phone — keep current.
      }
      if (password) data.password = password;

      await updateUser.mutateAsync({
        userId: targetUser.id,
        data: data as any,
      });
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.data?.error || err?.message || 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-2xl flex items-center justify-center" style={{ background: ADMIN.blushSoft }}>
            <Pencil size={16} style={{ color: ADMIN.blushDeep }} />
          </div>
          <h3 className="font-serif text-lg font-semibold">Edit User</h3>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide block mb-1.5">Full Name</label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Doe" autoComplete="off" />
          </div>
          <div>
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide block mb-1.5">Numri i Telefonit</label>
            <PhoneInput value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} />
          </div>
          <div>
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide block mb-1.5">Email <span className="font-normal text-neutral-400 normal-case">(optional)</span></label>
            <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Leave empty for phone-only accounts" autoComplete="off" />
            {hadSyntheticEmail && !form.email && (
              <p className="text-[11px] text-neutral-400 mt-1">This member signed up with phone — no email on file.</p>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
              🔒 Admin Note <span className="text-[9px] font-normal text-neutral-400 normal-case tracking-normal">(only visible to admins)</span>
            </label>
            <textarea
              value={form.adminNote}
              onChange={e => setForm(f => ({ ...f, adminNote: e.target.value }))}
              placeholder="e.g. changed name per request on WhatsApp, PDF re-uploaded manually…"
              rows={3}
              className="w-full rounded-lg border border-input bg-amber-50/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none"
            />
          </div>

          <div className="rounded-xl border border-neutral-200 bg-neutral-50/80 p-3.5 space-y-3">
            <div className="flex items-center gap-2">
              <KeyRound size={14} className="text-neutral-500" />
              <p className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">Set new password</p>
            </div>
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              Optional. Leave blank to keep the current password. Setting a new one signs the user out everywhere.
            </p>
            <div>
              <label className="text-xs font-medium text-neutral-500 block mb-1.5">New password</label>
              <Input
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Min 8 characters"
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500 block mb-1.5">Confirm password</label>
              <Input
                type="password"
                value={form.confirmPassword}
                onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                placeholder="Repeat new password"
                minLength={8}
                autoComplete="new-password"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={loading} className="flex-1 text-white hover:opacity-90 rounded-2xl" style={{ background: ADMIN.blush }}>
              {loading ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

const STATUSES = ['pending', 'confirmed', 'printing', 'shipped', 'delivered', 'cancelled'] as const;

const STATUS_STYLE: Record<string, string> = {
  pending:   'bg-amber-50 text-amber-800 border-amber-200',
  confirmed: 'bg-sky-50 text-sky-800 border-sky-200',
  printing:  'bg-[#F3E4E6] text-[#A85C66] border-[#E8C9CD]',
  shipped:   'bg-teal-50 text-teal-800 border-teal-200',
  delivered: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
};

// ── User albums/orders modal ────────────────────────────────────────────────
function UserAlbumsModal({ userId, userName, onClose }: { userId: number; userName: string; onClose: () => void }) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading, refetch } = useListAdminOrders({ page: 1, limit: 100, userId } as any);
  const updateOrder = useUpdateAdminOrder();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const orders = (data as any)?.data || [];

  const handleStatusChange = async (orderId: number, status: string) => {
    await updateOrder.mutateAsync({ orderId, data: { status: status as any } });
    await Promise.all([
      refetch(),
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] }),
      queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() }),
    ]);
  };

  const openPdf = (raw: string) => {
    setPdfUrl(authedPdfUrl(raw, getToken()));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-rose-50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-2xl flex items-center justify-center" style={{ background: ADMIN.blushSoft }}>
              <Images size={15} style={{ color: ADMIN.blushDeep }} />
            </div>
            <div>
              <h3 className="font-serif text-lg font-semibold leading-tight">{userName}'s Albums</h3>
              <p className="text-xs text-neutral-400">{orders.length} order{orders.length === 1 ? '' : 's'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-rose-50 text-neutral-400 hover:text-rose-500 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 bg-rose-50 rounded-xl animate-pulse" />)}
            </div>
          ) : !orders.length ? (
            <div className="py-16 text-center">
              <p className="text-sm" style={{ color: ADMIN.muted }}>No albums ordered yet</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-rose-50 sticky top-0 bg-white">
                  {['#', 'Album', 'Pages', 'Amount', 'Date', 'PDF', 'Status'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-neutral-300 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-rose-50/70">
                {orders.map((o: any) => (
                  <tr key={o.id} className="hover:bg-rose-50/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-neutral-400">#{o.id}</td>
                    <td className="px-4 py-3 text-xs text-neutral-500 max-w-[140px] truncate">{o.projectTitle || `Proj #${o.projectId}`}</td>
                    <td className="px-4 py-3 text-xs text-neutral-400 text-center">{o.projectPageCount ?? '—'}</td>
                    <td className="px-4 py-3 font-semibold text-neutral-700 text-xs whitespace-nowrap">{Number(o.priceLek).toLocaleString()} L</td>
                    <td className="px-4 py-3 text-xs text-neutral-400 whitespace-nowrap">{format(new Date(o.createdAt), 'MMM d, yy')}</td>
                    <td className="px-4 py-3">
                      {o.pdfUrl ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => openPdf(o.pdfUrl)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-semibold transition-opacity hover:opacity-80"
                            style={{ background: ADMIN.blushSoft, color: ADMIN.blushDeep }}
                            title="View PDF"
                          >
                            <Eye size={10} /> View
                          </button>
                          <a
                            href={authedPdfUrl(o.pdfUrl, getToken())} download
                            className="p-1.5 rounded-lg text-neutral-300 hover:bg-rose-50 hover:text-rose-500 transition-colors"
                            title="Download PDF"
                          >
                            <Download size={12} />
                          </a>
                        </div>
                      ) : (
                        <span className="text-[10px] text-neutral-300 italic">No PDF</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={o.status}
                        onChange={e => handleStatusChange(o.id, e.target.value)}
                        className={`px-2.5 py-1.5 rounded-full text-[10px] font-semibold border cursor-pointer focus:outline-none focus:ring-1 focus:ring-rose-300 ${STATUS_STYLE[o.status] || 'bg-neutral-50 text-neutral-500 border-neutral-200'}`}
                      >
                        {STATUSES.map(s => (
                          <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {pdfUrl && (
          <div className="fixed inset-0 z-[60] flex flex-col bg-black/80" onClick={e => e.target === e.currentTarget && setPdfUrl(null)}>
            <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-rose-100">
              <span className="font-semibold text-sm text-neutral-700">PDF Preview</span>
              <div className="flex items-center gap-2">
                <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-medium transition-colors">
                  <ExternalLink size={12} /> Open in tab
                </a>
                <a href={pdfUrl} download
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-100 text-neutral-600 hover:bg-neutral-200 text-xs font-medium transition-colors">
                  <Download size={12} /> Download
                </a>
                <button onClick={() => setPdfUrl(null)} className="p-1.5 rounded-lg hover:bg-rose-50 text-neutral-400 hover:text-rose-500 transition-colors">
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe src={pdfUrl} className="w-full h-full border-0" title="Order PDF" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Delete confirm ────────────────────────────────────────────────────────────
function DeleteConfirm({ userName, onConfirm, onCancel, loading }: { userName: string; onConfirm: () => void; onCancel: () => void; loading: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-6 text-center">
        <div className="text-4xl mb-3">⚠️</div>
        <h3 className="font-serif text-lg font-semibold mb-2">Delete User?</h3>
        <p className="text-sm text-neutral-500 mb-5">
          This will permanently delete <strong>{userName}</strong> and all their data. This cannot be undone.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
          <Button onClick={onConfirm} disabled={loading} className="flex-1 bg-red-500 hover:bg-red-600 text-white">
            {loading ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Ban / unban confirm — ban requires typing BAN so it isn't one-click ───────
function BanConfirm({
  userName,
  currentlyBanned,
  onConfirm,
  onCancel,
  loading,
  error,
}: {
  userName: string;
  currentlyBanned: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
  error?: string | null;
}) {
  const [typed, setTyped] = useState('');
  const banPhrase = 'BAN';
  const canBan = typed.trim().toUpperCase() === banPhrase;

  if (currentlyBanned) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => e.target === e.currentTarget && onCancel()}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center" role="dialog" aria-modal="true" aria-labelledby="unban-title">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <ShieldCheck size={22} />
          </div>
          <h3 id="unban-title" className="font-serif text-lg font-semibold mb-2">Restore access?</h3>
          <p className="text-sm text-neutral-500 mb-5">
            <strong>{userName}</strong> will be able to sign in and use the app again.
          </p>
          {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onCancel} disabled={loading} className="flex-1">Cancel</Button>
            <Button onClick={onConfirm} disabled={loading} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">
              {loading ? 'Restoring…' : 'Unban user'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" role="dialog" aria-modal="true" aria-labelledby="ban-title">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
            <ShieldBan size={22} />
          </div>
          <h3 id="ban-title" className="font-serif text-lg font-semibold mb-2">Ban this user?</h3>
          <p className="text-sm text-neutral-500 mb-4">
            <strong>{userName}</strong> will be signed out immediately and blocked from logging in until you unban them.
          </p>
        </div>
        <label className="block text-left text-xs font-medium text-neutral-600 mb-1.5">
          Type <span className="font-mono font-bold text-red-600">{banPhrase}</span> to confirm
        </label>
        <Input
          value={typed}
          onChange={e => setTyped(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && canBan && !loading) onConfirm(); }}
          placeholder={banPhrase}
          autoFocus
          autoComplete="off"
          spellCheck={false}
          className="mb-3 font-mono tracking-widest uppercase border-red-100 focus:border-red-300 focus:ring-red-200"
        />
        {error && <p className="mb-4 text-sm text-red-600 text-left">{error}</p>}
        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel} disabled={loading} className="flex-1">Cancel</Button>
          <Button
            onClick={onConfirm}
            disabled={!canBan || loading}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white disabled:opacity-40"
          >
            {loading ? 'Banning…' : 'Ban user'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AdminUsers() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filter, setFilter] = useState<UserFilter>('all');
  const [exporting, setExporting] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [banTarget, setBanTarget] = useState<{ id: number; name: string; isBanned: boolean } | null>(null);
  const [banningId, setBanningId] = useState<number | null>(null);
  const [banError, setBanError] = useState<string | null>(null);
  const [albumsTarget, setAlbumsTarget] = useState<{ id: number; name: string } | null>(null);
  const [editTarget, setEditTarget] = useState<{ id: number; name: string | null; email: string; phone: string | null; adminNote?: string | null } | null>(null);

  const { user: me, getToken } = useAuth();
  const queryClient = useQueryClient();
  const { data: usersData, isLoading, refetch } = useListAdminUsers({
    page: 1,
    limit: 50,
    search: debouncedSearch || undefined,
    filter: filter === 'all' ? undefined : filter,
  });
  const updateUser = useUpdateAdminUser();
  const deleteUser = useDeleteAdminUser();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const token = getToken();
      const params = new URLSearchParams({ page: '1', limit: '5000' });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (filter !== 'all') params.set('filter', filter);
      const r = await fetch(`${BASE}/api/admin/users?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });
      if (!r.ok) throw new Error('Export failed');
      const data = await r.json();
      const rows = Array.isArray(data?.data) ? data.data : [];
      downloadUsersCsv(rows, filter);
    } catch {
      window.alert('Could not export users. Try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleBanConfirm = async () => {
    if (!banTarget) return;
    setBanningId(banTarget.id);
    setBanError(null);
    try {
      await updateUser.mutateAsync({
        userId: banTarget.id,
        data: { isBanned: !banTarget.isBanned },
      });
      await queryClient.invalidateQueries({ queryKey: getListAdminUsersQueryKey() });
      setBanTarget(null);
      await refetch();
    } catch (err: any) {
      const msg =
        err?.data?.error ||
        err?.message ||
        (banTarget.isBanned ? 'Failed to unban user.' : 'Failed to ban user.');
      setBanError(typeof msg === 'string' ? msg : 'Request failed.');
    } finally {
      setBanningId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      await deleteUser.mutateAsync({ userId: deleteTarget.id });
      setDeleteTarget(null);
      refetch();
    } finally { setDeletingId(null); }
  };

  const handleRoleChange = async (userId: number, role: string) => {
    await updateUser.mutateAsync({ userId, data: { role: role as any } });
    refetch();
  };

  const users = (usersData as any)?.data || [];
  const total = (usersData as any)?.total || 0;

  return (
    <AdminLayout>
      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} onCreated={refetch} />}
      {albumsTarget && (
        <UserAlbumsModal userId={albumsTarget.id} userName={albumsTarget.name} onClose={() => setAlbumsTarget(null)} />
      )}
      {editTarget && (
        <EditUserModal targetUser={editTarget} onClose={() => setEditTarget(null)} onSaved={refetch} />
      )}
      {deleteTarget && (
        <DeleteConfirm
          userName={deleteTarget.name}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deletingId === deleteTarget.id}
        />
      )}
      {banTarget && (
        <BanConfirm
          userName={banTarget.name}
          currentlyBanned={banTarget.isBanned}
          onConfirm={handleBanConfirm}
          onCancel={() => { setBanTarget(null); setBanError(null); }}
          loading={banningId === banTarget.id}
          error={banError}
        />
      )}

      <div className="p-4 sm:p-5 md:p-8 max-w-screen-xl mx-auto">
        <div className="mb-6">
          <p className="text-[10px] font-semibold tracking-[0.18em] uppercase mb-1.5" style={{ color: ADMIN.blush }}>
            Community
          </p>
          <h1 className="text-3xl font-serif font-semibold mb-1" style={{ color: ADMIN.ink }}>Members</h1>
          <p className="text-sm" style={{ color: ADMIN.muted }}>
            {total} {filter === 'all' ? 'registered' : `matching "${USER_FILTERS.find(f => f.id === filter)?.label}"`}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {USER_FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className="px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors"
                style={{
                  borderColor: active ? ADMIN.blush : ADMIN.line,
                  background: active ? ADMIN.blushSoft : ADMIN.card,
                  color: active ? ADMIN.blushDeep : ADMIN.muted,
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-5">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: ADMIN.blush }} />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, phone, or email…"
              className="pl-9 rounded-2xl"
              style={{ borderColor: ADMIN.line }}
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting || isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-2xl border text-xs font-medium transition-colors disabled:opacity-50"
              style={{ borderColor: ADMIN.line, color: ADMIN.ink, background: ADMIN.card }}
              title="Download CSV of the current filter"
            >
              {exporting ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
              Export CSV
            </button>
            <button onClick={() => refetch()} className="p-2.5 rounded-2xl border transition-colors"
              style={{ borderColor: ADMIN.line, color: ADMIN.muted }}>
              <RefreshCw size={14} />
            </button>
            <Button onClick={() => setShowCreate(true)} className="rounded-2xl gap-2 text-white hover:opacity-90"
              style={{ background: ADMIN.blush }}>
              <UserPlus size={14} /> New User
            </Button>
          </div>
        </div>

        <div className="rounded-2xl shadow-sm overflow-hidden" style={{ background: ADMIN.card, border: `1px solid ${ADMIN.line}` }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: `1px solid ${ADMIN.line}` }}>
                  {['User', 'Joined', 'Last Login', 'Activity', 'Role', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 sm:px-5 py-3.5 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: ADMIN.muted }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={7} className="px-5 py-4">
                        <div className="h-4 rounded animate-pulse" style={{ background: ADMIN.blushSoft }} />
                      </td>
                    </tr>
                  ))
                ) : !users.length ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-14 text-center">
                      <p className="text-sm" style={{ color: ADMIN.muted }}>No users found</p>
                    </td>
                  </tr>
                ) : (
                  users.map((u: any) => {
                    const contact = displayContact(u);
                    const initials = (u.name || contact || '?').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
                    return (
                      <tr key={u.id} className={`transition-colors hover:bg-[#FBF7F5] ${u.isBanned ? 'opacity-60' : ''}`} style={{ borderTop: `1px solid ${ADMIN.line}` }}>
                        {/* User */}
                        <td className="px-4 sm:px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0"
                              style={{ background: u.isBanned ? '#E5E0E0' : ADMIN.blushSoft, color: u.isBanned ? '#9CA3AF' : ADMIN.blushDeep }}>
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-neutral-700 text-xs truncate">{u.name || '—'}</p>
                              <p className="text-[10px] text-neutral-400 truncate max-w-[160px]">{contact}</p>
                            </div>
                          </div>
                        </td>

                        {/* Joined */}
                        <td className="px-5 py-3.5 text-xs text-neutral-400 whitespace-nowrap">
                          {format(new Date(u.createdAt), 'MMM d, yyyy')}
                        </td>

                        {/* Last Login */}
                        <td className="px-5 py-3.5 text-xs text-neutral-400 whitespace-nowrap">
                          {u.lastLoginAt ? (
                            <>
                              {format(new Date(u.lastLoginAt), 'MMM d, yyyy')}
                              <p className="text-[9px] text-neutral-300">{format(new Date(u.lastLoginAt), 'HH:mm')}</p>
                            </>
                          ) : (
                            <span className="text-neutral-300 italic" title="No recorded login since tracking began">Never</span>
                          )}
                        </td>

                        {/* Activity */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3 text-xs" style={{ color: ADMIN.muted }}>
                            <span className="inline-flex items-center gap-1" title="Orders">
                              <ShoppingBag size={11} /> {u.orderCount ?? 0}
                            </span>
                            <span className="inline-flex items-center gap-1" title="Projects">
                              <FolderOpen size={11} /> {u.projectCount ?? 0}
                            </span>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="px-5 py-3.5">
                          <select
                            value={u.role}
                            onChange={e => handleRoleChange(u.id, e.target.value)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#C97B84] ${
                              u.role === 'admin' ? 'bg-[#F3E4E6] text-[#A85C66]' : 'bg-neutral-100 text-neutral-500'
                            }`}
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-3.5">
                          <button
                            onClick={() => {
                              if (me?.id === u.id && !u.isBanned) return;
                              setBanError(null);
                              setBanTarget({
                                id: u.id,
                                name: u.name || contact || `User #${u.id}`,
                                isBanned: !!u.isBanned,
                              });
                            }}
                            disabled={banningId === u.id || (me?.id === u.id && !u.isBanned)}
                            title={
                              me?.id === u.id && !u.isBanned
                                ? 'You cannot ban your own account'
                                : u.isBanned
                                  ? 'Click to unban'
                                  : 'Click to ban'
                            }
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-semibold transition-all border ${
                              u.isBanned
                                ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                                : me?.id === u.id
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200 opacity-60 cursor-not-allowed'
                                  : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200'
                            }`}
                          >
                            {banningId === u.id ? '…' : u.isBanned ? (
                              <><ShieldBan size={10} /> Banned</>
                            ) : (
                              <><ShieldCheck size={10} /> Active</>
                            )}
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setAlbumsTarget({ id: u.id, name: u.name || contact })}
                              className="p-2 rounded-xl transition-colors hover:bg-[#F3E4E6]"
                              style={{ color: ADMIN.muted }}
                              title="View albums & orders"
                            >
                              <Images size={14} />
                            </button>
                            <button
                              onClick={() => setEditTarget({ id: u.id, name: u.name, email: u.email, phone: u.phone ?? null, adminNote: u.adminNote })}
                              className={`p-2 rounded-xl transition-colors relative ${u.adminNote ? 'text-amber-500 hover:bg-amber-50' : 'hover:bg-[#F3E4E6]'}`}
                              style={u.adminNote ? undefined : { color: ADMIN.muted }}
                              title={u.adminNote ? 'Edit user (has admin note)' : 'Edit user'}
                            >
                              <Pencil size={14} />
                              {u.adminNote && (
                                <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400" />
                              )}
                            </button>
                            <button
                              onClick={() => setDeleteTarget({ id: u.id, name: u.name || contact })}
                              className="p-2 rounded-xl text-neutral-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                              title="Delete user"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}
