import React, { useMemo } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useGetAdminStats, useListAdminOrders, useUpdateAdminOrder } from '@workspace/api-client-react-tsconfig';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend,
} from 'recharts';
import { format, parseISO, subDays } from 'date-fns';
import { TrendingUp, Users, ShoppingBag, CreditCard, Eye, MessageCircle, UserPlus, FolderOpen, Printer, Truck } from 'lucide-react';
import { Link } from 'wouter';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  printing: 'bg-violet-100 text-violet-700',
  shipped: 'bg-cyan-100 text-cyan-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
};

function StatCard({ label, value, icon, gradient, sub }: { label: string; value: string | number; icon: React.ReactNode; gradient: string; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-white overflow-hidden">
      <div className={`h-1.5 ${gradient}`} />
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">{label}</p>
          <div className="opacity-40">{icon}</div>
        </div>
        <p className="text-2xl font-bold text-neutral-800">{value}</p>
        {sub && <p className="text-xs text-neutral-400 mt-1">{sub}</p>}
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
  const { data, isLoading, refetch } = useListAdminOrders({ page: 1, limit: 50, status: 'pending' });
  const updateOrder = useUpdateAdminOrder();
  const [shippingId, setShippingId] = React.useState<number | null>(null);

  const orders = (data as any)?.data || [];

  const handleShip = async (orderId: number) => {
    setShippingId(orderId);
    try {
      await updateOrder.mutateAsync({ orderId, data: { status: 'shipped' as any } });
      refetch();
    } finally { setShippingId(null); }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-amber-100 overflow-hidden mb-7">
      <div className="flex items-center justify-between px-5 py-4 border-b border-amber-50 bg-amber-50/40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center">
            <Printer size={15} className="text-amber-600" />
          </div>
          <div>
            <h2 className="font-semibold text-neutral-800">Pending for Printing</h2>
            <p className="text-xs text-neutral-400">New orders sent via WhatsApp, waiting to be printed & shipped</p>
          </div>
        </div>
        <Link href="/heyadmin/porosi" className="text-xs text-rose-500 hover:text-rose-700 font-medium whitespace-nowrap">
          View all orders →
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
              <tr><td className="px-5 py-8 text-center text-neutral-300 text-sm">Nothing pending — all caught up 🎉</td></tr>
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
                      <a href={o.pdfUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-violet-600 font-semibold hover:underline">View PDF</a>
                    ) : (
                      <span className="text-[10px] text-neutral-300 italic">No PDF</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleShip(o.id)}
                      disabled={shippingId === o.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200 hover:bg-cyan-100 transition-colors disabled:opacity-50"
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
          <p className="text-xs text-rose-400 font-medium uppercase tracking-widest mb-1">✨ Admin Dashboard</p>
          <h1 className="text-3xl font-serif font-bold text-neutral-900 mb-1">
            Hello, Admin
          </h1>
          <p className="text-sm text-neutral-400">{today}</p>
        </div>

        {/* Stat Cards */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-7">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 bg-white rounded-2xl animate-pulse border border-rose-50" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-7">
            <StatCard label="Visitors Today" value={s?.visitorsToday ?? 0} icon={<Eye size={18} />} gradient="bg-gradient-to-r from-rose-400 to-pink-500" />
            <StatCard label="Visitors Week" value={s?.visitorsWeek ?? 0} icon={<Eye size={18} />} gradient="bg-gradient-to-r from-violet-400 to-purple-500" />
            <StatCard label="Users Total" value={s?.totalUsers ?? 0} icon={<Users size={18} />} gradient="bg-gradient-to-r from-sky-400 to-blue-500" sub={`+${s?.usersToday ?? 0} today`} />
            <StatCard label="Orders / Month" value={s?.ordersThisMonth ?? 0} icon={<ShoppingBag size={18} />} gradient="bg-gradient-to-r from-emerald-400 to-teal-500" />
            <StatCard label="Revenue" value={`${Number(s?.revenueMonth ?? 0).toLocaleString()} L`} icon={<CreditCard size={18} />} gradient="bg-gradient-to-r from-amber-400 to-orange-500" sub="this month" />
            <StatCard label="WA Clicks" value={s?.wpClicksTotal ?? 0} icon={<MessageCircle size={18} />} gradient="bg-gradient-to-r from-green-400 to-emerald-500" sub="all time" />
          </div>
        )}

        {/* Pending for printing */}
        <PendingPrintingWidget />

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-7">
          {/* Visitor area chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-white p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-semibold text-neutral-800">Visitor Trend</h2>
                <p className="text-xs text-neutral-400">Unique visitors + WhatsApp clicks, last 30 days</p>
              </div>
              <TrendingUp size={16} className="text-rose-300" />
            </div>
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                <defs>
                  <linearGradient id="gVisitors" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gWp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#fce7f3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#d1d5db' }} axisLine={false} tickLine={false} interval={4} />
                <YAxis tick={{ fontSize: 9, fill: '#d1d5db' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #fce7f3', borderRadius: 12, fontSize: 12 }}
                  labelStyle={{ color: '#9ca3af', marginBottom: 4 }}
                />
                <Area type="monotone" dataKey="visitors" name="Visitors" stroke="#f43f5e" strokeWidth={2} fill="url(#gVisitors)" dot={false} />
                <Area type="monotone" dataKey="wp_clicks" name="WA Clicks" stroke="#22c55e" strokeWidth={2} fill="url(#gWp)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Registrations bar */}
          <div className="bg-white rounded-2xl shadow-sm border border-white p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-semibold text-neutral-800">Registrations</h2>
                <p className="text-xs text-neutral-400">New users, last 30 days</p>
              </div>
              <UserPlus size={16} className="text-violet-300" />
            </div>
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3e8ff" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#d1d5db' }} axisLine={false} tickLine={false} interval={6} />
                <YAxis tick={{ fontSize: 9, fill: '#d1d5db' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #f3e8ff', borderRadius: 12, fontSize: 12 }}
                />
                <Bar dataKey="registrations" name="New users" fill="#a78bfa" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bottom row: Recent orders + Recent users */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Recent orders */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-white overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-rose-50">
              <h2 className="font-semibold text-neutral-800">Recent Orders</h2>
              <Link href="/heyadmin/porosi" className="text-xs text-rose-500 hover:text-rose-700 font-medium">
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
                    <tr><td colSpan={5} className="px-5 py-10 text-center text-neutral-300 text-sm">No orders yet 🌸</td></tr>
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
          <div className="bg-white rounded-2xl shadow-sm border border-white overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-rose-50">
              <h2 className="font-semibold text-neutral-800">New Members</h2>
              <Link href="/heyadmin/perdorues" className="text-xs text-rose-500 hover:text-rose-700 font-medium">
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
                <div className="px-5 py-10 text-center text-neutral-300 text-sm">No users yet 🌸</div>
              ) : (
                s.recentUsers.map((u: any) => {
                  const initials = (u.name || u.email).split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
                  return (
                    <div key={u.id} className="flex items-center gap-3 px-5 py-3 hover:bg-rose-50/40 transition-colors">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                        style={{ background: 'linear-gradient(135deg, #f43f5e 0%, #e879f9 100%)' }}>
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-neutral-700 truncate">{u.name || 'No name'}</p>
                        <p className="text-[10px] text-neutral-400 truncate">{u.email}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {/* Summary */}
            {!isLoading && (
              <div className="px-5 py-3 bg-rose-50/40 border-t border-rose-50 grid grid-cols-3 gap-2 text-center">
                {[
                  { label: 'Total', value: s?.totalUsers ?? 0 },
                  { label: 'This week', value: s?.usersWeek ?? 0 },
                  { label: 'Today', value: s?.usersToday ?? 0 },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs font-bold text-neutral-700">{value}</p>
                    <p className="text-[9px] text-neutral-400 uppercase tracking-wide">{label}</p>
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
