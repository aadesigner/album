import React, { useMemo } from 'react';
import { AdminLayout, ADMIN } from '@/components/layout/AdminLayout';
import { useGetAdminStats, useListAdminOrders, useUpdateAdminOrder, getGetAdminStatsQueryKey } from '@workspace/api-client-react-tsconfig';
import { useQueryClient } from '@tanstack/react-query';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend,
} from 'recharts';
import { format, parseISO, subDays } from 'date-fns';
import { TrendingUp, Users, ShoppingBag, CreditCard, Eye, MessageCircle, UserPlus, FolderOpen, Printer, Truck } from 'lucide-react';
import { Link } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-800',
  confirmed: 'bg-sky-50 text-sky-800',
  printing: 'bg-[#F3E4E6] text-[#A85C66]',
  shipped: 'bg-teal-50 text-teal-800',
  delivered: 'bg-emerald-50 text-emerald-800',
  cancelled: 'bg-red-50 text-red-700',
};

function StatCard({ label, value, icon, accent, sub }: { label: string; value: string | number; icon: React.ReactNode; accent: string; sub?: string }) {
  return (
    <div className="rounded-2xl shadow-sm overflow-hidden" style={{ background: ADMIN.card, border: `1px solid ${ADMIN.line}` }}>
      <div className="h-1" style={{ background: accent }} />
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: ADMIN.muted }}>{label}</p>
          <div style={{ color: accent, opacity: 0.7 }}>{icon}</div>
        </div>
        <p className="text-2xl font-serif font-semibold" style={{ color: ADMIN.ink }}>{value}</p>
        {sub && <p className="text-xs mt-1" style={{ color: ADMIN.muted }}>{sub}</p>}
      </div>
    </div>
  );
}

// Fill missing dates in chart data with zeros
function fillDates(rawData: any[], days = 30) {
  const map: Record<string, any> = {};
  for (const r of rawData) map[r.date] = r;
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = format(subDays(new Date(), i), 'yyyy-MM-dd');
    result.push({
      date: d,
      label: format(subDays(new Date(), i), 'MMM d'),
      visitors: Number(map[d]?.visitors || 0),
      wp_clicks: Number(map[d]?.wp_clicks || 0),
      registrations: 0,
    });
  }
  return result;
}

function fillRegDates(rawData: any[], combined: any[]) {
  const map: Record<string, number> = {};
  for (const r of rawData) map[r.date] = Number(r.registrations || 0);
  return combined.map(d => ({ ...d, registrations: map[d.date] || 0 }));
}

// ── Pending for Printing widget ──────────────────────────────────────────────
// New orders land here (default status "pending") as soon as a customer sends
// their album via WhatsApp. Admin marks them "Shipped" once printed & sent.
function PendingPrintingWidget() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading, refetch } = useListAdminOrders(
    { page: 1, limit: 50, status: 'pending' },
    { query: { staleTime: 0, refetchOnMount: 'always', refetchInterval: 30_000 } } as any,
  );
  const updateOrder = useUpdateAdminOrder();
  const [shippingId, setShippingId] = React.useState<number | null>(null);

  const orders = (data as any)?.data || [];

  const handleShip = async (orderId: number) => {
    setShippingId(orderId);
    try {
      await updateOrder.mutateAsync({ orderId, data: { status: 'shipped' as any } });
      refetch();
      // Refresh earned / revenue cards immediately after shipping.
      await queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
    } finally { setShippingId(null); }
  };

  const pdfHref = (pdfUrl: string) => {
    const token = getToken();
    if (!token || !pdfUrl) return pdfUrl;
    const join = pdfUrl.includes('?') ? '&' : '?';
    return `${pdfUrl}${join}token=${encodeURIComponent(token)}`;
  };

  return (
    <div className="rounded-2xl shadow-sm overflow-hidden mb-7" style={{ background: ADMIN.card, border: `1px solid ${ADMIN.line}` }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-5 py-4" style={{ borderBottom: `1px solid ${ADMIN.line}`, background: ADMIN.blushSoft }}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0" style={{ background: '#FFF' }}>
            <Printer size={15} style={{ color: ADMIN.blushDeep }} />
          </div>
          <div className="min-w-0">
            <h2 className="font-serif font-semibold" style={{ color: ADMIN.ink }}>Pending for printing</h2>
            <p className="text-xs truncate" style={{ color: ADMIN.muted }}>WhatsApp orders waiting to print & ship</p>
          </div>
        </div>
        <Link href="/heyadmin/porosi" className="text-xs font-medium whitespace-nowrap self-start sm:self-auto" style={{ color: ADMIN.blushDeep }}>
          View all →
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-amber-50/70">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}><td className="px-5 py-4"><div className="h-4 bg-amber-50 rounded animate-pulse" /></td></tr>
              ))
            ) : !orders.length ? (
              <tr><td className="px-5 py-8 text-center text-sm" style={{ color: ADMIN.muted }}>Nothing pending — all caught up</td></tr>
            ) : (
              orders.map((o: any) => (
                <tr key={o.id} className="hover:bg-amber-50/30 transition-colors">
                  <td className="px-5 py-3 font-mono text-xs text-neutral-400 whitespace-nowrap">#{o.id}</td>
                  <td className="px-5 py-3">
                    <p className="font-medium text-neutral-700 text-xs">{o.userName || 'Guest'}</p>
                    <p className="text-neutral-400 text-[10px]">{o.userPhone || '—'}</p>
                  </td>
                  <td className="px-5 py-3 text-neutral-500 text-xs truncate max-w-[160px]">{o.projectTitle || `Proj #${o.projectId}`}</td>
                  <td className="px-5 py-3 text-xs text-neutral-400 whitespace-nowrap">
                    {format(new Date(o.createdAt), 'MMM d, HH:mm')}
                  </td>
                  <td className="px-5 py-3 font-semibold text-neutral-700 text-xs whitespace-nowrap">{Number(o.priceLek).toLocaleString()} L</td>
                  <td className="px-5 py-3">
                    {o.pdfUrl ? (
                      <a href={pdfHref(o.pdfUrl)} target="_blank" rel="noopener noreferrer" className="text-[10px] font-semibold hover:underline" style={{ color: ADMIN.blushDeep }}>View PDF</a>
                    ) : (
                      <span className="text-[10px] text-neutral-300 italic">No PDF</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleShip(o.id)}
                      disabled={shippingId === o.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-semibold border transition-colors disabled:opacity-50 hover:opacity-90"
                      style={{ background: ADMIN.blushSoft, color: ADMIN.blushDeep, borderColor: '#E8C9CD' }}
                    >
                      <Truck size={11} /> {shippingId === o.id ? 'Marking…' : 'Mark Shipped'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { data: stats, isLoading } = useGetAdminStats();
  const s = stats as any;

  const chartData = useMemo(() => {
    const base = fillDates(s?.chartData || [], 30);
    return fillRegDates(s?.regChartData || [], base);
  }, [s?.chartData, s?.regChartData]);

  const today = format(new Date(), 'EEEE, MMM d yyyy');

  return (
    <AdminLayout>
      <div className="p-5 md:p-8 max-w-screen-xl mx-auto">

        {/* Header */}
        <div className="mb-7">
          <p className="text-[10px] font-semibold tracking-[0.18em] uppercase mb-1.5" style={{ color: ADMIN.blush }}>
            Overview
          </p>
          <h1 className="text-3xl font-serif font-semibold mb-1" style={{ color: ADMIN.ink }}>
            Hello
          </h1>
          <p className="text-sm" style={{ color: ADMIN.muted }}>{today}</p>
        </div>

        {/* Stat Cards */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-7">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ background: ADMIN.blushSoft }} />
            ))}
          </div>
        ) : (
          <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-7">
            <StatCard label="Visitors Today" value={s?.visitorsToday ?? 0} icon={<Eye size={18} />} accent={ADMIN.blush} />
            <StatCard label="Visitors Week" value={s?.visitorsWeek ?? 0} icon={<Eye size={18} />} accent="#D4A5A5" />
            <StatCard label="Users Total" value={s?.totalUsers ?? 0} icon={<Users size={18} />} accent="#8FA8A3" sub={`+${s?.usersToday ?? 0} today`} />
            <StatCard label="Orders / Month" value={s?.ordersThisMonth ?? 0} icon={<ShoppingBag size={18} />} accent="#C4A574" />
            <StatCard
              label="Earned"
              value={`${Number(s?.earned ?? s?.revenue ?? 0).toLocaleString()} L`}
              icon={<CreditCard size={18} />}
              accent="#0F766E"
              sub={`${Number(s?.earnedMonth ?? 0).toLocaleString()} L this month · shipped/delivered`}
            />
            <StatCard label="WA Clicks" value={s?.wpClicksTotal ?? 0} icon={<MessageCircle size={18} />} accent="#7BAF8E" sub="all time" />
          </div>
          <p className="text-[11px] -mt-4 mb-7" style={{ color: ADMIN.muted }}>
            Pipeline (non-cancelled) this month: {Number(s?.revenueMonth ?? 0).toLocaleString()} L · all-time {Number(s?.revenue ?? 0).toLocaleString()} L.
            Earned counts only after an order is marked shipped or delivered.
          </p>
          </>
        )}

        {/* Pending for printing */}
        <PendingPrintingWidget />

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-7">
          {/* Visitor area chart */}
          <div className="lg:col-span-2 rounded-2xl shadow-sm p-4 sm:p-5" style={{ background: ADMIN.card, border: `1px solid ${ADMIN.line}` }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-serif font-semibold" style={{ color: ADMIN.ink }}>Visitor trend</h2>
                <p className="text-xs" style={{ color: ADMIN.muted }}>Visitors + WhatsApp clicks · 30 days</p>
              </div>
              <TrendingUp size={16} style={{ color: ADMIN.blush }} />
            </div>
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                <defs>
                  <linearGradient id="gVisitors" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={ADMIN.blush} stopOpacity={0.22} />
                    <stop offset="95%" stopColor={ADMIN.blush} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gWp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7BAF8E" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#7BAF8E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={ADMIN.line} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#c4b8ba' }} axisLine={false} tickLine={false} interval={4} />
                <YAxis tick={{ fontSize: 9, fill: '#c4b8ba' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: `1px solid ${ADMIN.line}`, borderRadius: 12, fontSize: 12 }}
                  labelStyle={{ color: ADMIN.muted, marginBottom: 4 }}
                />
                <Area type="monotone" dataKey="visitors" name="Visitors" stroke={ADMIN.blush} strokeWidth={2} fill="url(#gVisitors)" dot={false} />
                <Area type="monotone" dataKey="wp_clicks" name="WA Clicks" stroke="#7BAF8E" strokeWidth={2} fill="url(#gWp)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Registrations bar */}
          <div className="rounded-2xl shadow-sm p-4 sm:p-5" style={{ background: ADMIN.card, border: `1px solid ${ADMIN.line}` }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-serif font-semibold" style={{ color: ADMIN.ink }}>Registrations</h2>
                <p className="text-xs" style={{ color: ADMIN.muted }}>New members · 30 days</p>
              </div>
              <UserPlus size={16} style={{ color: ADMIN.blush }} />
            </div>
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={ADMIN.line} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#c4b8ba' }} axisLine={false} tickLine={false} interval={6} />
                <YAxis tick={{ fontSize: 9, fill: '#c4b8ba' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: `1px solid ${ADMIN.line}`, borderRadius: 12, fontSize: 12 }}
                />
                <Bar dataKey="registrations" name="New users" fill={ADMIN.blush} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bottom row: Recent orders + Recent users */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Recent orders */}
          <div className="lg:col-span-2 rounded-2xl shadow-sm overflow-hidden" style={{ background: ADMIN.card, border: `1px solid ${ADMIN.line}` }}>
            <div className="flex items-center justify-between px-4 sm:px-5 py-4" style={{ borderBottom: `1px solid ${ADMIN.line}` }}>
              <h2 className="font-serif font-semibold" style={{ color: ADMIN.ink }}>Recent orders</h2>
              <Link href="/heyadmin/porosi" className="text-xs font-medium" style={{ color: ADMIN.blushDeep }}>
                View all →
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-rose-50">
                    <th className="px-5 py-3 text-left text-[10px] font-semibold text-neutral-300 uppercase tracking-wider">#</th>
                    <th className="px-5 py-3 text-left text-[10px] font-semibold text-neutral-300 uppercase tracking-wider">Customer</th>
                    <th className="px-5 py-3 text-left text-[10px] font-semibold text-neutral-300 uppercase tracking-wider">Album</th>
                    <th className="px-5 py-3 text-left text-[10px] font-semibold text-neutral-300 uppercase tracking-wider">Amount</th>
                    <th className="px-5 py-3 text-left text-[10px] font-semibold text-neutral-300 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rose-50/60">
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}><td colSpan={5} className="px-5 py-3"><div className="h-4 bg-rose-50 rounded animate-pulse" /></td></tr>
                    ))
                  ) : !s?.recentOrders?.length ? (
                    <tr><td colSpan={5} className="px-5 py-10 text-center text-sm" style={{ color: ADMIN.muted }}>No orders yet</td></tr>
                  ) : (
                    s.recentOrders.map((o: any) => (
                      <tr key={o.id} className="hover:bg-rose-50/40 transition-colors">
                        <td className="px-5 py-3 text-neutral-400 font-mono text-xs">#{o.id}</td>
                        <td className="px-5 py-3">
                          <p className="font-medium text-neutral-700 text-xs">{o.userName || 'Guest'}</p>
                          <p className="text-neutral-400 text-[10px]">{(o as any).userPhone || '—'}</p>
                        </td>
                        <td className="px-5 py-3 text-neutral-500 text-xs truncate max-w-[120px]">{o.projectTitle || `Proj #${o.projectId}`}</td>
                        <td className="px-5 py-3 font-semibold text-neutral-700 text-xs">{Number(o.priceLek).toLocaleString()} L</td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_COLORS[o.status] || 'bg-neutral-100 text-neutral-500'}`}>
                            {o.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent users */}
          <div className="rounded-2xl shadow-sm overflow-hidden" style={{ background: ADMIN.card, border: `1px solid ${ADMIN.line}` }}>
            <div className="flex items-center justify-between px-4 sm:px-5 py-4" style={{ borderBottom: `1px solid ${ADMIN.line}` }}>
              <h2 className="font-serif font-semibold" style={{ color: ADMIN.ink }}>New members</h2>
              <Link href="/heyadmin/perdorues" className="text-xs font-medium" style={{ color: ADMIN.blushDeep }}>
                View all →
              </Link>
            </div>
            <div className="divide-y divide-rose-50/60">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="px-5 py-3 flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-rose-50 animate-pulse" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-rose-50 rounded animate-pulse w-3/4" />
                      <div className="h-2.5 bg-rose-50 rounded animate-pulse w-1/2" />
                    </div>
                  </div>
                ))
              ) : !s?.recentUsers?.length ? (
                <div className="px-5 py-10 text-center text-sm" style={{ color: ADMIN.muted }}>No members yet</div>
              ) : (
                s.recentUsers.map((u: any) => {
                  const contact = u.phone || u.email || '—';
                  const initials = (u.name || contact || '?').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
                  return (
                    <div key={u.id} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-[#FBF7F5]">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0"
                        style={{ background: ADMIN.blushSoft, color: ADMIN.blushDeep }}>
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-neutral-700 truncate">{u.name || 'No name'}</p>
                        <p className="text-[10px] text-neutral-400 truncate">{contact}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {/* Summary */}
            {!isLoading && (
              <div className="px-5 py-3 grid grid-cols-3 gap-2 text-center" style={{ background: ADMIN.blushSoft, borderTop: `1px solid ${ADMIN.line}` }}>
                {[
                  { label: 'Total', value: s?.totalUsers ?? 0 },
                  { label: 'This week', value: s?.usersWeek ?? 0 },
                  { label: 'Today', value: s?.usersToday ?? 0 },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs font-semibold" style={{ color: ADMIN.ink }}>{value}</p>
                    <p className="text-[9px] uppercase tracking-wide" style={{ color: ADMIN.muted }}>{label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}
