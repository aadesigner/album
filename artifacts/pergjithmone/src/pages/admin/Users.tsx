import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import {
  useListAdminUsers, useUpdateAdminUser, useDeleteAdminUser,
  useListAdminOrders, useUpdateAdminOrder,
  getListAdminUsersQueryKey,
} from '@workspace/api-client-react-tsconfig';
import { format } from 'date-fns';
import { Search, UserPlus, Trash2, ShieldBan, ShieldCheck, RefreshCw, Images, Eye, ExternalLink, Download, X, Pencil } from 'lucide-react';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQueryClient } from '@tanstack/react-query';

const BASE = (import.meta as any).env?.BASE_URL?.replace(/\/$/, '') || '';

// ── Create user modal ─────────────────────────────────────────────────────────
function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  // Regular members are identified by phone (matching public sign-up); admins created
  // here don't need a public phone number, so they're identified by email instead.
  const [form, setForm] = useState({ phone: '', email: '', name: '', password: '', role: 'user' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isAdmin = form.role === 'admin';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('pergjithmone_access_token') || sessionStorage.getItem('pergjithmone_access_token');
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
          <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center">
            <UserPlus size={16} className="text-rose-600" />
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
            <Button type="submit" disabled={loading} className="flex-1 bg-rose-500 hover:bg-rose-600 text-white">
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
    email: targetUser.email || '',
    phone: targetUser.phone || '',
    adminNote: targetUser.adminNote || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const updateUser = useUpdateAdminUser();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await updateUser.mutateAsync({
        userId: targetUser.id,
        data: {
          name: form.name,
          email: form.email,
          phone: form.phone || null,
          adminNote: form.adminNote,
        } as any,
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center">
            <Pencil size={16} className="text-rose-600" />
          </div>
          <h3 className="font-serif text-lg font-semibold">Edit User</h3>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide block mb-1.5">Full Name</label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Doe" />
          </div>
          <div>
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide block mb-1.5">Email</label>
            <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@example.com" />
          </div>
          <div>
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide block mb-1.5">Numri i Telefonit</label>
            <PhoneInput value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} />
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
          {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-rose-500 hover:bg-rose-600 text-white">
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
  pending:   'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
  printing:  'bg-violet-50 text-violet-700 border-violet-200',
  shipped:   'bg-cyan-50 text-cyan-700 border-cyan-200',
  delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-red-50 text-red-500 border-red-200',
};

const STATUS_EMOJI: Record<string, string> = {
  pending: '⏳', confirmed: '✅', printing: '🖨️', shipped: '📦', delivered: '🎉', cancelled: '❌',
};

// ── User albums/orders modal ────────────────────────────────────────────────
function UserAlbumsModal({ userId, userName, onClose }: { userId: number; userName: string; onClose: () => void }) {
  const { data, isLoading, refetch } = useListAdminOrders({ page: 1, limit: 100, userId } as any);
  const updateOrder = useUpdateAdminOrder();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const orders = (data as any)?.data || [];

  const handleStatusChange = async (orderId: number, status: string) => {
    await updateOrder.mutateAsync({ orderId, data: { status: status as any } });
    refetch();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-rose-50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center">
              <Images size={15} className="text-rose-600" />
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
              <div className="text-4xl mb-2">🌸</div>
              <p className="text-neutral-300 text-sm">No albums ordered yet</p>
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
                            onClick={() => setPdfUrl(o.pdfUrl)}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-violet-50 text-violet-600 rounded-lg text-[10px] font-semibold hover:bg-violet-100 transition-colors"
                            title="View PDF"
                          >
                            <Eye size={10} /> View
                          </button>
                          <a
                            href={o.pdfUrl} download
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
                          <option key={s} value={s}>{STATUS_EMOJI[s]} {s.charAt(0).toUpperCase() + s.slice(1)}</option>
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

export default function AdminUsers() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [banningId, setBanningId] = useState<number | null>(null);
  const [albumsTarget, setAlbumsTarget] = useState<{ id: number; name: string } | null>(null);
  const [editTarget, setEditTarget] = useState<{ id: number; name: string | null; email: string; phone: string | null; adminNote?: string | null } | null>(null);

  const queryClient = useQueryClient();
  const { data: usersData, isLoading, refetch } = useListAdminUsers({ page: 1, limit: 50, search: debouncedSearch || undefined });
  const updateUser = useUpdateAdminUser();
  const deleteUser = useDeleteAdminUser();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const handleBan = async (userId: number, currentBanned: boolean) => {
    setBanningId(userId);
    try {
      await updateUser.mutateAsync({ userId, data: { isBanned: !currentBanned } as any });
      refetch();
    } finally { setBanningId(null); }
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

      <div className="p-5 md:p-8 max-w-screen-xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <p className="text-xs text-rose-400 font-medium uppercase tracking-widest mb-1">👥 User Management</p>
          <h1 className="text-3xl font-serif font-bold text-neutral-900">Members</h1>
          <p className="text-sm text-neutral-400 mt-1">{total} registered users</p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-5">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-rose-300" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="pl-9 border-rose-100 focus:border-rose-300 focus:ring-rose-200 rounded-xl"
            />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => refetch()} className="p-2.5 rounded-xl border border-rose-100 hover:bg-rose-50 text-rose-300 hover:text-rose-500 transition-colors">
              <RefreshCw size={14} />
            </button>
            <Button onClick={() => setShowCreate(true)} className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl gap-2 shadow-sm shadow-rose-200">
              <UserPlus size={14} /> New User
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-rose-50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-rose-50">
                  {['User', 'Joined', 'Last Login', 'Activity', 'Role', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-[10px] font-semibold text-neutral-300 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-rose-50/70">
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={7} className="px-5 py-4">
                        <div className="h-4 bg-rose-50 rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : !users.length ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-14 text-center">
                      <div className="text-4xl mb-2">🌸</div>
                      <p className="text-neutral-300 text-sm">No users found</p>
                    </td>
                  </tr>
                ) : (
                  users.map((u: any) => {
                    const initials = (u.name || u.email).split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
                    return (
                      <tr key={u.id} className={`hover:bg-rose-50/30 transition-colors ${u.isBanned ? 'opacity-60' : ''}`}>
                        {/* User */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                              style={{ background: u.isBanned ? '#d1d5db' : 'linear-gradient(135deg, #f43f5e 0%, #e879f9 100%)' }}>
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-neutral-700 text-xs truncate">{u.name || '—'}</p>
                              <p className="text-[10px] text-neutral-400 truncate max-w-[160px]">{(u as any).phone || u.email || '—'}</p>
                            </div>
                          </div>
                        </td>

                        {/* Joined */}
                        <td className="px-5 py-3.5 text-xs text-neutral-400 whitespace-nowrap">
                          {format(new Date(u.createdAt), 'MMM d, yyyy')}
                        </td>

                        {/* Last Login */}
                        <td className="px-5 py-3.5 text-xs text-neutral-400 whitespace-nowrap">
                          {(u as any).lastLoginAt ? (
                            <>
                              {format(new Date((u as any).lastLoginAt), 'MMM d, yyyy')}
                              <p className="text-[9px] text-neutral-300">{format(new Date((u as any).lastLoginAt), 'HH:mm')}</p>
                            </>
                          ) : (
                            <span className="text-neutral-300 italic">Never</span>
                          )}
                        </td>

                        {/* Activity */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3 text-xs text-neutral-400">
                            <span title="Orders">🛍️ {u.orderCount ?? 0}</span>
                            <span title="Projects">📷 {u.projectCount ?? 0}</span>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="px-5 py-3.5">
                          <select
                            value={u.role}
                            onChange={e => handleRoleChange(u.id, e.target.value)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-rose-300 ${
                              u.role === 'admin' ? 'bg-violet-100 text-violet-700' : 'bg-neutral-100 text-neutral-500'
                            }`}
                          >
                            <option value="user">👤 User</option>
                            <option value="admin">👑 Admin</option>
                          </select>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-3.5">
                          <button
                            onClick={() => handleBan(u.id, u.isBanned)}
                            disabled={banningId === u.id}
                            title={u.isBanned ? 'Click to unban' : 'Click to ban'}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-semibold transition-all border ${
                              u.isBanned
                                ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
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
                              onClick={() => setAlbumsTarget({ id: u.id, name: u.name || u.email })}
                              className="p-2 rounded-xl text-neutral-300 hover:bg-violet-50 hover:text-violet-500 transition-colors"
                              title="View albums & orders"
                            >
                              <Images size={14} />
                            </button>
                            <button
                              onClick={() => setEditTarget({ id: u.id, name: u.name, email: u.email, phone: (u as any).phone, adminNote: (u as any).adminNote })}
                              className={`p-2 rounded-xl transition-colors relative ${(u as any).adminNote ? 'text-amber-500 hover:bg-amber-50' : 'text-neutral-300 hover:bg-blue-50 hover:text-blue-500'}`}
                              title={(u as any).adminNote ? 'Edit user (has admin note)' : 'Edit user'}
                            >
                              <Pencil size={14} />
                              {(u as any).adminNote && (
                                <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400" />
                              )}
                            </button>
                            <button
                              onClick={() => setDeleteTarget({ id: u.id, name: u.name || u.email })}
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
