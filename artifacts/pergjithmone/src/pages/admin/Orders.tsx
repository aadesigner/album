import React, { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useListAdminOrders, useUpdateAdminOrder } from '@workspace/api-client-react';
import { format } from 'date-fns';
import { RefreshCw, Eye, FileX, ExternalLink, X, Download, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';

const BASE = (import.meta as any).env?.BASE_URL?.replace(/\/$/, '') || '';

const STATUSES = ['all', 'pending', 'confirmed', 'printing', 'shipped', 'delivered', 'cancelled'] as const;

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

// ── PDF Viewer Modal ──────────────────────────────────────────────────────────
function PdfViewerModal({ url, orderId, onClose }: { url: string; orderId: number; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/80" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-rose-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center">
            <Eye size={13} className="text-rose-600" />
          </div>
          <span className="font-semibold text-sm text-neutral-700">PDF Preview — Order #{orderId}</span>
        </div>
        <div className="flex items-center gap-2">
          <a href={url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-medium transition-colors">
            <ExternalLink size={12} /> Open in tab
          </a>
          <a href={url} download
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-100 text-neutral-600 hover:bg-neutral-200 text-xs font-medium transition-colors">
            <Download size={12} /> Download
          </a>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-rose-50 text-neutral-400 hover:text-rose-500 transition-colors">
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
            <Button type="submit" disabled={saving} className="flex-1 bg-rose-500 hover:bg-rose-600 text-white">
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
        <div className="text-4xl mb-3">🗑️</div>
        <h3 className="font-serif text-lg font-semibold mb-2">Delete PDF?</h3>
        <p className="text-sm text-neutral-500 mb-5">
          This removes the generated PDF from Order #{orderId} and resets the project to draft. The user would need to regenerate.
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

export default function AdminOrders() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pdfModal, setPdfModal] = useState<{ url: string; orderId: number } | null>(null);
  const [deletePdf, setDeletePdf] = useState<{ orderId: number } | null>(null);
  const [deletingPdfId, setDeletingPdfId] = useState<number | null>(null);
  const [noteTarget, setNoteTarget] = useState<{ orderId: number; note: string } | null>(null);

  const { data: ordersData, isLoading, refetch } = useListAdminOrders({
    page: 1,
    limit: 100,
    status: statusFilter === 'all' ? undefined : statusFilter,
  });
  const updateOrder = useUpdateAdminOrder();
  const queryClient = useQueryClient();

  const orders = (ordersData as any)?.data || [];
  const total = (ordersData as any)?.total || 0;

  const handleStatusChange = async (orderId: number, status: string) => {
    await updateOrder.mutateAsync({ orderId, data: { status: status as any } });
    refetch();
  };

  const handleDeletePdf = async () => {
    if (!deletePdf) return;
    setDeletingPdfId(deletePdf.orderId);
    try {
      const token = localStorage.getItem('pergjithmone_access_token') || sessionStorage.getItem('pergjithmone_access_token');
      await fetch(`${BASE}/api/admin/orders/${deletePdf.orderId}/pdf`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });
      setDeletePdf(null);
      refetch();
    } finally { setDeletingPdfId(null); }
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
      {noteTarget && (
        <AdminNoteModal
          orderId={noteTarget.orderId}
          initialNote={noteTarget.note}
          onClose={() => setNoteTarget(null)}
          onSaved={() => refetch()}
        />
      )}

      <div className="p-5 md:p-8 max-w-screen-xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <p className="text-xs text-rose-400 font-medium uppercase tracking-widest mb-1">🛍️ Order Management</p>
          <h1 className="text-3xl font-serif font-bold text-neutral-900">Orders</h1>
          <p className="text-sm text-neutral-400 mt-1">{total} total orders</p>
        </div>

        {/* Status tabs */}
        <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
          {STATUSES.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                statusFilter === s
                  ? 'bg-rose-500 text-white border-rose-500 shadow-sm shadow-rose-200'
                  : 'bg-white text-neutral-500 border-rose-100 hover:border-rose-300 hover:text-rose-600'
              }`}
            >
              {s === 'all' ? '✨ All' : `${STATUS_EMOJI[s]} ${s.charAt(0).toUpperCase() + s.slice(1)}`}
            </button>
          ))}
          <button onClick={() => refetch()} className="ml-auto p-2.5 rounded-xl border border-rose-100 hover:bg-rose-50 text-rose-300 hover:text-rose-500 transition-colors shrink-0">
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-rose-50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-rose-50">
                  {['#', 'Customer', 'Album', 'Pages', 'Amount', 'Date', 'PDF', 'Status', 'Note', 'Admin Note'].map(h => (
                    <th key={h} className="px-4 py-3.5 text-left text-[10px] font-semibold text-neutral-300 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-rose-50/70">
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}><td colSpan={10} className="px-4 py-4"><div className="h-4 bg-rose-50 rounded animate-pulse" /></td></tr>
                  ))
                ) : !orders.length ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-16 text-center">
                      <div className="text-4xl mb-2">🌸</div>
                      <p className="text-neutral-300 text-sm">No orders yet</p>
                    </td>
                  </tr>
                ) : (
                  orders.map((o: any) => (
                    <tr key={o.id} className="hover:bg-rose-50/30 transition-colors">
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
                              onClick={() => setPdfModal({ url: o.pdfUrl, orderId: o.id })}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-violet-50 text-violet-600 rounded-lg text-[10px] font-semibold hover:bg-violet-100 transition-colors"
                              title="View PDF"
                            >
                              <Eye size={10} /> View
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
                          <span className="text-[10px] text-neutral-300 italic">No PDF</span>
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
                            <option key={s} value={s}>{STATUS_EMOJI[s]} {s.charAt(0).toUpperCase() + s.slice(1)}</option>
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
