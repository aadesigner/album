import React, { useState } from 'react';
import { AdminLayout, ADMIN } from '@/components/layout/AdminLayout';
import { useListAdminOrders, useUpdateAdminOrder, getListAdminOrdersQueryKey, getGetAdminStatsQueryKey } from '@workspace/api-client-react-tsconfig';
import { format } from 'date-fns';
import { RefreshCw, Eye, FileX, ExternalLink, X, Download, StickyNote, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const BASE = (import.meta as any).env?.BASE_URL?.replace(/\/$/, '') || '';

const STATUSES = ['all', 'pending', 'confirmed', 'printing', 'shipped', 'delivered', 'cancelled'] as const;

const STATUS_STYLE: Record<string, string> = {
  pending:   'bg-amber-50 text-amber-800 border-amber-200',
  confirmed: 'bg-sky-50 text-sky-800 border-sky-200',
  printing:  'bg-[#F3E4E6] text-[#A85C66] border-[#E8C9CD]',
  shipped:   'bg-teal-50 text-teal-800 border-teal-200',
  delivered: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
};

function statusLabel(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── PDF Viewer Modal ──────────────────────────────────────────────────────────
function PdfViewerModal({ url, orderId, onClose }: { url: string; orderId: number; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/80" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="flex items-center justify-between px-4 sm:px-5 py-3 bg-white" style={{ borderBottom: `1px solid ${ADMIN.line}` }}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0" style={{ background: ADMIN.blushSoft }}>
            <Eye size={13} style={{ color: ADMIN.blushDeep }} />
          </div>
          <span className="font-serif font-semibold text-sm truncate" style={{ color: ADMIN.ink }}>PDF — Order #{orderId}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a href={url} target="_blank" rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors"
            style={{ background: ADMIN.blushSoft, color: ADMIN.blushDeep }}>
            <ExternalLink size={12} /> Open
          </a>
          <a href={url} download
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-100 text-neutral-600 hover:bg-neutral-200 text-xs font-medium transition-colors">
            <Download size={12} />
          </a>
          <button onClick={onClose} className="p-1.5 rounded-xl transition-colors" style={{ color: ADMIN.muted }}>
            <X size={16} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <iframe src={url} className="w-full h-full border-0" title={`Order #${orderId} PDF`} />
      </div>
    </div>
  );
}

/** pdfUrl is an auth-gated API path — append access token so iframe/<a> work. */
function authedPdfUrl(pdfUrl: string, token: string | null): string {
  if (!pdfUrl) return pdfUrl;
  const withBase = pdfUrl.startsWith('http') ? pdfUrl : `${BASE}${pdfUrl.startsWith('/') ? '' : '/'}${pdfUrl}`;
  if (!token) return withBase;
  const join = withBase.includes('?') ? '&' : '?';
  return `${withBase}${join}token=${encodeURIComponent(token)}`;
}

function withCacheBust(url: string): string {
  const join = url.includes('?') ? '&' : '?';
  return `${url}${join}t=${Date.now()}`;
}

// ── Admin note modal ──────────────────────────────────────────────────────────
function AdminNoteModal({ orderId, initialNote, onClose, onSaved }: {
  orderId: number; initialNote: string; onClose: () => void; onSaved: (note: string) => void;
}) {
  const [note, setNote] = useState(initialNote);
  const [saving, setSaving] = useState(false);
  const updateOrder = useUpdateAdminOrder();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateOrder.mutateAsync({ orderId, data: { adminNote: note } as any });
      onSaved(note);
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center">
            <StickyNote size={15} className="text-amber-600" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-semibold leading-tight">Admin Note</h3>
            <p className="text-[11px] text-neutral-400">Order #{orderId} · only visible to admins</p>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <textarea
            autoFocus
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="e.g. customer requested a reprint, called about shipping delay…"
            rows={5}
            className="w-full rounded-lg border border-input bg-amber-50/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none"
          />
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={saving} className="flex-1 text-white hover:opacity-90 rounded-2xl" style={{ background: ADMIN.blush }}>
              {saving ? 'Saving…' : 'Save Note'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete PDF confirm ────────────────────────────────────────────────────────
function DeletePdfConfirm({ orderId, onConfirm, onCancel, loading }: {
  orderId: number; onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-6 text-center">
        <h3 className="font-serif text-lg font-semibold mb-2">Delete PDF?</h3>
        <p className="text-sm text-neutral-500 mb-5">
          This removes the generated PDF from Order #{orderId}. The order stays registered; you can regenerate the PDF afterward.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
          <Button onClick={onConfirm} disabled={loading} className="flex-1 bg-red-500 hover:bg-red-600 text-white">
            {loading ? 'Deleting…' : 'Delete PDF'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Delete order confirm (permanent) ──────────────────────────────────────────
function DeleteOrderConfirm({ orderId, customer, album, onConfirm, onCancel, loading }: {
  orderId: number; customer: string; album: string;
  onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
            <Trash2 size={16} className="text-red-600" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-semibold leading-tight">Delete order?</h3>
            <p className="text-[11px] text-neutral-400">Order #{orderId} · permanent</p>
          </div>
        </div>
        <p className="text-sm text-neutral-600 mb-3">
          This permanently removes the order for <strong>{customer}</strong>
          {album ? <> — <em>{album}</em></> : null}. It cannot be undone.
        </p>
        <ul className="text-[12px] text-neutral-500 mb-5 space-y-1 list-disc pl-4">
          <li>Order is deleted from the database</li>
          <li>Print PDF (if any) is removed</li>
          <li>Album is unlocked back to draft so the customer can edit again</li>
        </ul>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1" disabled={loading}>Cancel</Button>
          <Button type="button" onClick={onConfirm} disabled={loading} className="flex-1 bg-red-500 hover:bg-red-600 text-white">
            {loading ? 'Deleting…' : 'Delete forever'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AdminOrders() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pdfModal, setPdfModal] = useState<{ url: string; orderId: number } | null>(null);
  const [deletePdf, setDeletePdf] = useState<{ orderId: number } | null>(null);
  const [deletingPdfId, setDeletingPdfId] = useState<number | null>(null);
  const [deleteOrder, setDeleteOrder] = useState<{ orderId: number; customer: string; album: string } | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<number | null>(null);
  const [noteTarget, setNoteTarget] = useState<{ orderId: number; note: string } | null>(null);

  const { data: ordersData, isLoading, refetch } = useListAdminOrders({
    page: 1,
    limit: 100,
    status: statusFilter === 'all' ? undefined : statusFilter,
  }, {
    query: {
      // New WhatsApp orders must show up immediately when opening this page —
      // the global 5min staleTime was hiding fresh checkouts.
      staleTime: 0,
      refetchOnMount: 'always',
      refetchOnWindowFocus: true,
    },
  } as any);
  const updateOrder = useUpdateAdminOrder();
  const queryClient = useQueryClient();
  const [regenId, setRegenId] = useState<number | null>(null);
  const [viewPrepId, setViewPrepId] = useState<number | null>(null);

  const orders = (ordersData as any)?.data || [];
  const total = (ordersData as any)?.total || 0;

  const handleStatusChange = async (orderId: number, status: string) => {
    await updateOrder.mutateAsync({ orderId, data: { status: status as any } });
    await Promise.all([
      refetch(),
      // Dashboard uses ['admin-stats', range] — not the OpenAPI key.
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] }),
      queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() }),
    ]);
  };

  const handleDeletePdf = async () => {
    if (!deletePdf) return;
    setDeletingPdfId(deletePdf.orderId);
    try {
      const token = getToken();
      await fetch(`${BASE}/api/admin/orders/${deletePdf.orderId}/pdf`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });
      setDeletePdf(null);
      refetch();
    } finally { setDeletingPdfId(null); }
  };

  const handleDeleteOrder = async () => {
    if (!deleteOrder) return;
    setDeletingOrderId(deleteOrder.orderId);
    try {
      const token = getToken();
      const res = await fetch(`${BASE}/api/admin/orders/${deleteOrder.orderId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast({
          title: 'Could not delete order',
          description: (body as any)?.error || 'Something went wrong',
          variant: 'destructive',
        });
        return;
      }
      setDeleteOrder(null);
      toast({ title: 'Order deleted' });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListAdminOrdersQueryKey() }),
        queryClient.invalidateQueries({ queryKey: ['admin-stats'] }),
        queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() }),
      ]);
      refetch();
    } finally {
      setDeletingOrderId(null);
    }
  };

  /** Poll until print PDF is ready, then open the viewer. */
  const waitForPdfAndOpen = async (orderId: number, projectId: number) => {
    const token = getToken();
    for (let i = 0; i < 90; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      try {
        const stRes = await fetch(`${BASE}/api/projects/${projectId}/pdf-status`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: 'include',
        });
        if (!stRes.ok) continue;
        const body = await stRes.json() as { status?: string; pdfUrl?: string | null };
        if (body.status === 'ready' && body.pdfUrl) {
          setPdfModal({
            url: withCacheBust(authedPdfUrl(body.pdfUrl, token)),
            orderId,
          });
          refetch();
          return true;
        }
      } catch {
        // keep polling
      }
    }
    return false;
  };

  /** Regenerate from current album pages, then open at print size. */
  const handleViewFreshPdf = async (order: { id: number; projectId: number; pdfUrl?: string | null }) => {
    setViewPrepId(order.id);
    try {
      const token = getToken();
      const res = await fetch(`${BASE}/api/admin/orders/${order.id}/regenerate-pdf`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        // Fall back to whatever file already exists if regenerate is capped.
        if (order.pdfUrl) {
          setPdfModal({
            url: withCacheBust(authedPdfUrl(order.pdfUrl, token)),
            orderId: order.id,
          });
          toast({
            title: 'Opening existing PDF',
            description: (body as any)?.error || 'Could not queue a fresh render',
          });
          return;
        }
        toast({
          title: 'PDF unavailable',
          description: (body as any)?.error || 'Failed to queue PDF',
          variant: 'destructive',
        });
        return;
      }
      toast({ title: 'Rendering print PDF…', description: 'Opening when ready (300 DPI, book size).' });
      const ok = await waitForPdfAndOpen(order.id, order.projectId);
      if (!ok) {
        toast({
          title: 'Still generating',
          description: 'Refresh the list in a moment and try View again.',
          variant: 'destructive',
        });
        refetch();
      }
    } finally {
      setViewPrepId(null);
    }
  };

  const handleRegenPdf = async (orderId: number, projectId?: number) => {
    setRegenId(orderId);
    try {
      const token = getToken();
      const res = await fetch(`${BASE}/api/admin/orders/${orderId}/regenerate-pdf`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast({
          title: 'Failed to queue PDF',
          description: (body as any)?.error || 'Try again shortly',
          variant: 'destructive',
        });
        return;
      }
      if (projectId) {
        toast({ title: 'Rendering print PDF…' });
        const ok = await waitForPdfAndOpen(orderId, projectId);
        if (!ok) {
          toast({ title: 'Still generating', description: 'Check back in a moment.' });
          refetch();
        }
      } else {
        setTimeout(() => refetch(), 2500);
        setTimeout(() => refetch(), 8000);
      }
    } finally { setRegenId(null); }
  };

  return (
    <AdminLayout>
      {pdfModal && <PdfViewerModal url={pdfModal.url} orderId={pdfModal.orderId} onClose={() => setPdfModal(null)} />}
      {deletePdf && (
        <DeletePdfConfirm
          orderId={deletePdf.orderId}
          onConfirm={handleDeletePdf}
          onCancel={() => setDeletePdf(null)}
          loading={deletingPdfId === deletePdf.orderId}
        />
      )}
      {deleteOrder && (
        <DeleteOrderConfirm
          orderId={deleteOrder.orderId}
          customer={deleteOrder.customer}
          album={deleteOrder.album}
          onConfirm={handleDeleteOrder}
          onCancel={() => setDeleteOrder(null)}
          loading={deletingOrderId === deleteOrder.orderId}
        />
      )}
      {noteTarget && (
        <AdminNoteModal
          orderId={noteTarget.orderId}
          initialNote={noteTarget.note}
          onClose={() => setNoteTarget(null)}
          onSaved={() => refetch()}
        />
      )}

      <div className="p-4 sm:p-5 md:p-8 max-w-screen-xl mx-auto">
        <div className="mb-6">
          <p className="text-[10px] font-semibold tracking-[0.18em] uppercase mb-1.5" style={{ color: ADMIN.blush }}>
            Fulfillment
          </p>
          <h1 className="text-3xl font-serif font-semibold mb-1" style={{ color: ADMIN.ink }}>Orders</h1>
          <p className="text-sm" style={{ color: ADMIN.muted }}>{total} total</p>
        </div>

        <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1 -mx-1 px-1">
          {STATUSES.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="px-3.5 sm:px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all border"
              style={
                statusFilter === s
                  ? { background: ADMIN.blush, color: '#fff', borderColor: ADMIN.blush }
                  : { background: ADMIN.card, color: ADMIN.muted, borderColor: ADMIN.line }
              }
            >
              {s === 'all' ? 'All' : statusLabel(s)}
            </button>
          ))}
          <button onClick={() => refetch()} className="ml-auto p-2.5 rounded-2xl border transition-colors shrink-0"
            style={{ borderColor: ADMIN.line, color: ADMIN.muted }}>
            <RefreshCw size={14} />
          </button>
        </div>

        <div className="rounded-2xl shadow-sm overflow-hidden" style={{ background: ADMIN.card, border: `1px solid ${ADMIN.line}` }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: `1px solid ${ADMIN.line}` }}>
                  {['#', 'Customer', 'Album', 'Pages', 'Amount', 'Date', 'PDF', 'Status', 'Note', 'Admin Note', ''].map(h => (
                    <th key={h || 'actions'} className="px-3 sm:px-4 py-3.5 text-left text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: ADMIN.muted }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}><td colSpan={11} className="px-4 py-4"><div className="h-4 rounded animate-pulse" style={{ background: ADMIN.blushSoft }} /></td></tr>
                  ))
                ) : !orders.length ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-16 text-center">
                      <p className="text-sm" style={{ color: ADMIN.muted }}>No orders yet</p>
                    </td>
                  </tr>
                ) : (
                  orders.map((o: any) => (
                    <tr key={o.id} className="transition-colors hover:bg-[#FBF7F5]" style={{ borderTop: `1px solid ${ADMIN.line}` }}>
                      {/* ID */}
                      <td className="px-4 py-3.5 font-mono text-xs text-neutral-400">#{o.id}</td>

                      {/* Customer */}
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-neutral-700 text-xs">{o.userName || 'Guest'}</p>
                        <p className="text-[10px] text-neutral-400 truncate max-w-[140px]">{(o as any).userPhone || '—'}</p>
                      </td>

                      {/* Album */}
                      <td className="px-4 py-3.5 text-xs text-neutral-500 max-w-[120px] truncate">
                        {o.projectTitle || `Proj #${o.projectId}`}
                      </td>

                      {/* Pages */}
                      <td className="px-4 py-3.5 text-xs text-neutral-400 text-center">{o.projectPageCount ?? '—'}</td>

                      {/* Amount */}
                      <td className="px-4 py-3.5 font-semibold text-neutral-700 text-xs whitespace-nowrap">
                        {Number(o.priceLek).toLocaleString()} L
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3.5 text-xs text-neutral-400 whitespace-nowrap">
                        {format(new Date(o.createdAt), 'MMM d, yy')}
                        <p className="text-[9px] text-neutral-300">{format(new Date(o.createdAt), 'HH:mm')}</p>
                      </td>

                      {/* PDF */}
                      <td className="px-4 py-3.5">
                        {o.pdfUrl ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleViewFreshPdf(o)}
                              disabled={viewPrepId === o.id || regenId === o.id}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
                              style={{ background: ADMIN.blushSoft, color: ADMIN.blushDeep }}
                              title="Re-render at print size from the current album, then view"
                            >
                              <Eye size={10} /> {viewPrepId === o.id ? 'Rendering…' : 'View'}
                            </button>
                            <button
                              onClick={() => setDeletePdf({ orderId: o.id })}
                              className="p-1.5 rounded-lg text-neutral-300 hover:bg-red-50 hover:text-red-400 transition-colors"
                              title="Delete PDF"
                            >
                              <FileX size={12} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleRegenPdf(o.id, o.projectId)}
                            disabled={regenId === o.id || viewPrepId === o.id}
                            className="px-2.5 py-1.5 rounded-lg text-[10px] font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                            title="Queue print PDF generation"
                          >
                            {regenId === o.id ? 'Rendering…' : 'Generate PDF'}
                          </button>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <select
                          value={o.status}
                          onChange={e => handleStatusChange(o.id, e.target.value)}
                          className={`px-2.5 py-1.5 rounded-full text-[10px] font-semibold border cursor-pointer focus:outline-none focus:ring-1 focus:ring-rose-300 ${STATUS_STYLE[o.status] || 'bg-neutral-50 text-neutral-500 border-neutral-200'}`}
                        >
                          {STATUSES.slice(1).map(s => (
                            <option key={s} value={s}>{statusLabel(s)}</option>
                          ))}
                        </select>
                      </td>

                      {/* Customer note */}
                      <td className="px-4 py-3.5 text-[10px] text-neutral-400 max-w-[100px] truncate" title={o.notes || ''}>
                        {o.notes || '—'}
                      </td>

                      {/* Admin note (admin-only) */}
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => setNoteTarget({ orderId: o.id, note: (o as any).adminNote || '' })}
                          className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium max-w-[130px] transition-colors ${
                            (o as any).adminNote
                              ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                              : 'text-neutral-300 hover:bg-rose-50 hover:text-rose-400'
                          }`}
                          title={(o as any).adminNote || 'Add admin note'}
                        >
                          <StickyNote size={11} className="shrink-0" />
                          <span className="truncate">{(o as any).adminNote || 'Add note'}</span>
                        </button>
                      </td>

                      {/* Delete order */}
                      <td className="px-3 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => setDeleteOrder({
                            orderId: o.id,
                            customer: o.userName || (o as any).userPhone || 'Guest',
                            album: o.projectTitle || `Proj #${o.projectId}`,
                          })}
                          disabled={deletingOrderId === o.id}
                          className="p-2 rounded-xl text-neutral-300 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                          title="Delete order permanently"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
