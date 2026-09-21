import React, { useMemo, useRef, useState } from 'react';
import { AdminLayout, ADMIN, useAdminTheme } from '@/components/layout/AdminLayout';
import { useListAdminOrders, useUpdateAdminOrder } from '@workspace/api-client-react-tsconfig';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';
import {
  format, parseISO, eachDayOfInterval, eachHourOfInterval,
  startOfDay, addDays, isValid,
} from 'date-fns';
import {
  TrendingUp, Users, ShoppingBag, CreditCard, Eye, MessageCircle,
  UserPlus, Printer, Truck, FolderOpen, RefreshCw, Sparkles,
  Target, Wallet, Activity, Clock,
} from 'lucide-react';
import { Link } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';

const BASE = (import.meta as any).env?.BASE_URL?.replace(/\/$/, '') || '';

const RANGES = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
  { id: 'last_month', label: 'Last month' },
  { id: 'last_3_months', label: '3 months' },
  { id: 'year', label: 'This year' },
] as const;

type RangeId = (typeof RANGES)[number]['id'];

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-800',
  confirmed: 'bg-sky-50 text-sky-800',
  printing: 'bg-[#F3E4E6] text-[#A85C66]',
  shipped: 'bg-teal-50 text-teal-800',
  delivered: 'bg-emerald-50 text-emerald-800',
  cancelled: 'bg-red-50 text-red-700',
};

const STATUS_CHART: Record<string, string> = {
  pending: '#F59E0B',
  confirmed: '#0EA5E9',
  printing: '#C97B88',
  shipped: '#14B8A6',
  delivered: '#10B981',
  cancelled: '#EF4444',
};

function fmtLek(n: number) {
  return `${Number(n || 0).toLocaleString()} L`;
}

function StatCard({
  label, value, icon, sub, tone = 'default',
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  sub?: string;
  tone?: 'default' | 'accent' | 'success' | 'warm';
}) {
  const { theme } = useAdminTheme();
  const accents = {
    default: theme.accent,
    accent: theme.accent,
    success: '#0F766E',
    warm: '#C4A574',
  };
  const accent = accents[tone];
  return (
    <div
      className="relative overflow-hidden transition-transform hover:-translate-y-0.5"
      style={{
        background: theme.card,
        border: `1px solid ${theme.line}`,
        borderRadius: theme.radius,
        boxShadow: '0 4px 18px rgba(40,20,30,0.04)',
      }}
    >
      <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${accent}, ${theme.accentSoft})` }} />
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: theme.muted }}>{label}</p>
          <span
            className="w-8 h-8 flex items-center justify-center shrink-0"
            style={{ background: theme.accentSoft, color: accent, borderRadius: `calc(${theme.radius} - 4px)` }}
          >
            {icon}
          </span>
        </div>
        <p className="text-2xl sm:text-[1.65rem] font-semibold leading-none" style={{ color: theme.ink, fontFamily: theme.fontSerif }}>
          {value}
        </p>
        {sub && <p className="text-[11px] mt-2 leading-snug" style={{ color: theme.muted }}>{sub}</p>}
      </div>
    </div>
  );
}

function parseBucket(raw: string, grain: 'hour' | 'day'): Date | null {
  if (!raw) return null;
  // PG may return "2026-09-21 00:00:00+00" or ISO
  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T').replace(/\+00$/, 'Z');
  const d = parseISO(normalized.length === 10 ? `${normalized}T00:00:00` : normalized);
  return isValid(d) ? d : null;
}

function buildChartSeries(
  chartData: any[],
  regData: any[],
  orderData: any[],
  rangeStart?: string,
  rangeEnd?: string,
  grain: 'hour' | 'day' = 'day',
) {
  const visitorsMap: Record<string, number> = {};
  const wpMap: Record<string, number> = {};
  const regMap: Record<string, number> = {};
  const ordersMap: Record<string, number> = {};
  const revenueMap: Record<string, number> = {};

  const keyOf = (d: Date) =>
    grain === 'hour' ? format(d, "yyyy-MM-dd'T'HH:00") : format(d, 'yyyy-MM-dd');

  for (const r of chartData || []) {
    const d = parseBucket(String(r.date || r.bucket || ''), grain);
    if (!d) continue;
    const k = keyOf(d);
    visitorsMap[k] = Number(r.visitors || 0);
    wpMap[k] = Number(r.wp_clicks || 0);
  }
  for (const r of regData || []) {
    const d = parseBucket(String(r.date || r.bucket || ''), grain);
    if (!d) continue;
    regMap[keyOf(d)] = Number(r.registrations || 0);
  }
  for (const r of orderData || []) {
    const d = parseBucket(String(r.date || r.bucket || ''), grain);
    if (!d) continue;
    const k = keyOf(d);
    ordersMap[k] = Number(r.orders || 0);
    revenueMap[k] = Number(r.revenue || 0);
  }

  const start = rangeStart ? new Date(rangeStart) : startOfDay(new Date());
  const endExclusive = rangeEnd ? new Date(rangeEnd) : addDays(startOfDay(new Date()), 1);
  const endInclusive = addDays(endExclusive, -1);

  let slots: Date[] = [];
  try {
    if (grain === 'hour') {
      slots = eachHourOfInterval({ start, end: endInclusive });
    } else {
      slots = eachDayOfInterval({ start: startOfDay(start), end: startOfDay(endInclusive) });
    }
  } catch {
    slots = [];
  }

  return slots.map((d) => {
    const k = keyOf(d);
    return {
      key: k,
      label: grain === 'hour' ? format(d, 'HH:mm') : format(d, slots.length > 45 ? 'MMM d' : 'MMM d'),
      visitors: visitorsMap[k] || 0,
      wp_clicks: wpMap[k] || 0,
      registrations: regMap[k] || 0,
      orders: ordersMap[k] || 0,
      revenue: revenueMap[k] || 0,
    };
  });
}

function PendingPrintingWidget() {
  const { getToken } = useAuth();
  const { theme } = useAdminTheme();
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
      await queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    } finally { setShippingId(null); }
  };

  const pdfHref = (pdfUrl: string) => {
    const token = getToken();
    if (!pdfUrl) return pdfUrl;
    const withBase = pdfUrl.startsWith('http') ? pdfUrl : `${BASE}${pdfUrl.startsWith('/') ? '' : '/'}${pdfUrl}`;
    if (!token) return withBase;
    const join = withBase.includes('?') ? '&' : '?';
    return `${withBase}${join}token=${encodeURIComponent(token)}`;
  };

  return (
    <div className="overflow-hidden" style={{ background: theme.card, border: `1px solid ${theme.line}`, borderRadius: theme.radius, boxShadow: '0 4px 18px rgba(40,20,30,0.04)' }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-5 py-4" style={{ borderBottom: `1px solid ${theme.line}`, background: theme.accentSoft }}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 flex items-center justify-center shrink-0" style={{ background: theme.card, borderRadius: theme.radius }}>
            <Printer size={15} style={{ color: theme.accentDeep }} />
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold" style={{ color: theme.ink, fontFamily: theme.fontSerif }}>Print queue</h2>
            <p className="text-xs truncate" style={{ color: theme.muted }}>{orders.length} waiting · WhatsApp checkouts</p>
          </div>
        </div>
        <Link href="/heyadmin/porosi" className="text-xs font-medium whitespace-nowrap" style={{ color: theme.accentDeep }}>View all →</Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <tbody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}><td className="px-5 py-4"><div className="h-4 rounded animate-pulse" style={{ background: theme.accentSoft }} /></td></tr>
              ))
            ) : !orders.length ? (
              <tr><td className="px-5 py-8 text-center text-sm" style={{ color: theme.muted }}>All caught up — nothing pending</td></tr>
            ) : (
              orders.map((o: any) => (
                <tr key={o.id} style={{ borderTop: `1px solid ${theme.line}` }}>
                  <td className="px-4 sm:px-5 py-3 font-mono text-xs" style={{ color: theme.muted }}>#{o.id}</td>
                  <td className="px-4 sm:px-5 py-3">
                    <p className="font-medium text-xs" style={{ color: theme.ink }}>{o.userName || 'Guest'}</p>
                    <p className="text-[10px]" style={{ color: theme.muted }}>{o.userPhone || '—'}</p>
                  </td>
                  <td className="px-4 sm:px-5 py-3 text-xs truncate max-w-[140px]" style={{ color: theme.muted }}>{o.projectTitle || `Proj #${o.projectId}`}</td>
                  <td className="px-4 sm:px-5 py-3 text-xs whitespace-nowrap" style={{ color: theme.muted }}>{format(new Date(o.createdAt), 'MMM d, HH:mm')}</td>
                  <td className="px-4 sm:px-5 py-3 font-semibold text-xs whitespace-nowrap" style={{ color: theme.ink }}>{fmtLek(o.priceLek)}</td>
                  <td className="px-4 sm:px-5 py-3">
                    {o.pdfUrl ? (
                      <a href={pdfHref(o.pdfUrl)} target="_blank" rel="noopener noreferrer" className="text-[10px] font-semibold hover:underline" style={{ color: theme.accentDeep }}>PDF</a>
                    ) : (
                      <span className="text-[10px] italic" style={{ color: theme.muted }}>No PDF</span>
                    )}
                  </td>
                  <td className="px-4 sm:px-5 py-3 text-right">
                    <button
                      onClick={() => handleShip(o.id)}
                      disabled={shippingId === o.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold disabled:opacity-50"
                      style={{ background: theme.accentSoft, color: theme.accentDeep, borderRadius: '999px', border: `1px solid ${theme.line}` }}
                    >
                      <Truck size={11} /> {shippingId === o.id ? '…' : 'Shipped'}
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
  const { theme } = useAdminTheme();
  const { getToken } = useAuth();
  const [range, setRange] = useState<RangeId>('month');
  const forceRefresh = useRef(false);

  const { data: stats, isLoading, isFetching, dataUpdatedAt, refetch } = useQuery({
    queryKey: ['admin-stats', range],
    queryFn: async () => {
      const token = getToken();
      const refresh = forceRefresh.current;
      forceRefresh.current = false;
      const qs = new URLSearchParams({ range });
      if (refresh) qs.set('refresh', '1');
      const res = await fetch(`${BASE}/api/admin/stats?${qs}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to load stats');
      return res.json();
    },
    // Light client cache — server already TTL-caches ~90s; avoid double 5-min lag.
    staleTime: 60_000,
    refetchInterval: 2 * 60_000,
    refetchOnWindowFocus: false,
  });

  const s = stats as any;
  const grain: 'hour' | 'day' = s?.grain === 'hour' ? 'hour' : 'day';

  const chartData = useMemo(
    () => buildChartSeries(s?.chartData || [], s?.regChartData || [], s?.orderChartData || [], s?.rangeStart, s?.rangeEnd, grain),
    [s?.chartData, s?.regChartData, s?.orderChartData, s?.rangeStart, s?.rangeEnd, grain],
  );

  const statusPie = useMemo(() => {
    const map = s?.ordersByStatus || {};
    return Object.entries(map)
      .map(([status, v]: [string, any]) => ({
        name: status,
        value: Number(v?.count || 0),
        revenue: Number(v?.revenue || 0),
        color: STATUS_CHART[status] || '#999',
      }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [s?.ordersByStatus]);

  const xInterval = chartData.length > 40 ? Math.floor(chartData.length / 8) : chartData.length > 14 ? 2 : 0;
  const fromCache = Boolean(s?.cache?.cached);
  const cacheHint = fromCache && s?.cachedUntil
    ? `Cached · fresh until ${format(new Date(s.cachedUntil), 'HH:mm:ss')}`
    : dataUpdatedAt
      ? `Updated ${format(new Date(dataUpdatedAt), 'HH:mm:ss')}`
      : 'Live';

  const handleRefresh = () => {
    forceRefresh.current = true;
    void refetch();
  };

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 md:p-8 max-w-screen-xl mx-auto pb-16">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.18em] uppercase mb-1.5" style={{ color: theme.accent }}>
              Overview
            </p>
            <h1 className="text-3xl md:text-[2.1rem] font-semibold mb-1 leading-tight" style={{ color: theme.ink, fontFamily: theme.fontSerif }}>
              Studio pulse
            </h1>
            <p className="text-sm" style={{ color: theme.muted }}>
              {format(new Date(), 'EEEE, MMM d')} · {s?.rangeLabel || 'This month'}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-medium px-2.5 py-1.5" style={{ color: theme.muted, background: theme.accentSoft, borderRadius: '999px' }}>
              <Clock size={10} className="inline mr-1 -mt-0.5" />
              {cacheHint}
            </span>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isFetching}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium disabled:opacity-50"
              style={{ background: theme.card, border: `1px solid ${theme.line}`, borderRadius: theme.radius, color: theme.ink }}
            >
              <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Period filter */}
        <div
          className="flex gap-1.5 overflow-x-auto pb-1 mb-6 -mx-1 px-1 scrollbar-thin"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {RANGES.map((r) => {
            const active = range === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setRange(r.id)}
                className="shrink-0 px-3.5 py-2 text-[12px] font-semibold transition-all"
                style={
                  active
                    ? {
                        background: theme.accent,
                        color: '#fff',
                        borderRadius: '999px',
                        boxShadow: `0 6px 16px ${theme.accent}40`,
                      }
                    : {
                        background: theme.card,
                        color: theme.muted,
                        border: `1px solid ${theme.line}`,
                        borderRadius: '999px',
                      }
                }
              >
                {r.label}
              </button>
            );
          })}
        </div>

        {/* Hero KPIs */}
        {isLoading && !s ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse" style={{ background: theme.accentSoft, borderRadius: theme.radius }} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
            <StatCard label="Visitors" value={s?.visitors ?? 0} icon={<Eye size={15} />} sub="Unique IPs in period" />
            <StatCard label="Orders" value={s?.orders ?? 0} icon={<ShoppingBag size={15} />} tone="warm" sub={`${fmtLek(s?.revenuePeriod ?? 0)} pipeline`} />
            <StatCard label="Earned" value={fmtLek(s?.earnedPeriod ?? 0)} icon={<Wallet size={15} />} tone="success" sub="Shipped / delivered" />
            <StatCard label="New members" value={s?.newUsers ?? 0} icon={<UserPlus size={15} />} sub={`${s?.newProjects ?? 0} albums started`} />
          </div>
        )}

        {/* Secondary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-7">
          {[
            { label: 'WA clicks', value: s?.wpClicks ?? 0, icon: <MessageCircle size={14} />, tip: 'Period' },
            { label: 'Avg order', value: fmtLek(s?.avgOrderValue ?? 0), icon: <Target size={14} />, tip: 'Non-cancelled' },
            { label: 'Conversion', value: `${s?.conversionRate ?? 0}%`, icon: <Activity size={14} />, tip: 'Orders / visitors' },
            { label: 'Print queue', value: s?.pendingOrders ?? 0, icon: <Printer size={14} />, tip: 'Live pending' },
            { label: 'Members', value: s?.totalUsers ?? 0, icon: <Users size={14} />, tip: 'All time' },
            { label: 'Albums', value: s?.totalProjects ?? 0, icon: <FolderOpen size={14} />, tip: 'All time' },
          ].map((m) => (
            <div
              key={m.label}
              className="px-3.5 py-3"
              style={{ background: theme.card, border: `1px solid ${theme.line}`, borderRadius: theme.radius }}
            >
              <div className="flex items-center gap-1.5 mb-1.5" style={{ color: theme.accent }}>
                {m.icon}
                <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: theme.muted }}>{m.label}</span>
              </div>
              <p className="text-lg font-semibold leading-none" style={{ color: theme.ink, fontFamily: theme.fontSerif }}>{m.value}</p>
              <p className="text-[10px] mt-1" style={{ color: theme.muted }}>{m.tip}</p>
            </div>
          ))}
        </div>

        <div className="mb-7">
          <PendingPrintingWidget />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-7">
          <div
            className="xl:col-span-2 p-4 sm:p-5"
            style={{ background: theme.card, border: `1px solid ${theme.line}`, borderRadius: theme.radius, boxShadow: '0 4px 18px rgba(40,20,30,0.04)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold" style={{ color: theme.ink, fontFamily: theme.fontSerif }}>Traffic & WhatsApp</h2>
                <p className="text-xs" style={{ color: theme.muted }}>
                  {grain === 'hour' ? 'Hourly' : 'Daily'} · {s?.rangeLabel}
                </p>
              </div>
              <TrendingUp size={16} style={{ color: theme.accent }} />
            </div>
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                <defs>
                  <linearGradient id="gVis" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={theme.accent} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={theme.accent} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gWa" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7BAF8E" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#7BAF8E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.line} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: theme.muted }} axisLine={false} tickLine={false} interval={xInterval} />
                <YAxis tick={{ fontSize: 9, fill: theme.muted }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: theme.card, border: `1px solid ${theme.line}`, borderRadius: 12, fontSize: 12 }}
                />
                <Area type="monotone" dataKey="visitors" name="Visitors" stroke={theme.accent} strokeWidth={2} fill="url(#gVis)" dot={false} />
                <Area type="monotone" dataKey="wp_clicks" name="WA clicks" stroke="#7BAF8E" strokeWidth={2} fill="url(#gWa)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div
            className="p-4 sm:p-5"
            style={{ background: theme.card, border: `1px solid ${theme.line}`, borderRadius: theme.radius, boxShadow: '0 4px 18px rgba(40,20,30,0.04)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold" style={{ color: theme.ink, fontFamily: theme.fontSerif }}>Order mix</h2>
                <p className="text-xs" style={{ color: theme.muted }}>Status in period</p>
              </div>
              <Sparkles size={16} style={{ color: theme.accent }} />
            </div>
            {statusPie.length === 0 ? (
              <div className="h-[210px] flex items-center justify-center text-sm" style={{ color: theme.muted }}>No orders in this period</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie data={statusPie} dataKey="value" nameKey="name" innerRadius={42} outerRadius={64} paddingAngle={2}>
                      {statusPie.map((e) => (
                        <Cell key={e.name} fill={e.color} stroke={theme.card} strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: theme.card, border: `1px solid ${theme.line}`, borderRadius: 12, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-1">
                  {statusPie.map((e) => (
                    <div key={e.name} className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-2 capitalize" style={{ color: theme.ink }}>
                        <span className="w-2 h-2 rounded-full" style={{ background: e.color }} />
                        {e.name}
                      </span>
                      <span style={{ color: theme.muted }}>{e.value} · {fmtLek(e.revenue)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-7">
          <div
            className="p-4 sm:p-5"
            style={{ background: theme.card, border: `1px solid ${theme.line}`, borderRadius: theme.radius }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold" style={{ color: theme.ink, fontFamily: theme.fontSerif }}>Revenue & orders</h2>
                <p className="text-xs" style={{ color: theme.muted }}>Pipeline (non-cancelled)</p>
              </div>
              <CreditCard size={16} style={{ color: theme.accent }} />
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.line} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: theme.muted }} axisLine={false} tickLine={false} interval={xInterval} />
                <YAxis yAxisId="l" tick={{ fontSize: 9, fill: theme.muted }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis yAxisId="r" orientation="right" hide />
                <Tooltip contentStyle={{ background: theme.card, border: `1px solid ${theme.line}`, borderRadius: 12, fontSize: 12 }} />
                <Bar yAxisId="l" dataKey="orders" name="Orders" fill={theme.accent} radius={[4, 4, 0, 0]} />
                <Bar yAxisId="r" dataKey="revenue" name="Revenue (L)" fill="#C4A574" radius={[4, 4, 0, 0]} opacity={0.55} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div
            className="p-4 sm:p-5"
            style={{ background: theme.card, border: `1px solid ${theme.line}`, borderRadius: theme.radius }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold" style={{ color: theme.ink, fontFamily: theme.fontSerif }}>New members</h2>
                <p className="text-xs" style={{ color: theme.muted }}>Registrations over time</p>
              </div>
              <UserPlus size={16} style={{ color: theme.accent }} />
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.line} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: theme.muted }} axisLine={false} tickLine={false} interval={xInterval} />
                <YAxis tick={{ fontSize: 9, fill: theme.muted }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: theme.card, border: `1px solid ${theme.line}`, borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="registrations" name="Sign-ups" fill={theme.accentDeep} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lifetime snapshot + lists */}
        <div
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-7 p-4"
          style={{
            background: `linear-gradient(135deg, ${theme.accentSoft} 0%, ${theme.card} 60%)`,
            border: `1px solid ${theme.line}`,
            borderRadius: theme.radius,
          }}
        >
          {[
            { label: 'Lifetime pipeline', value: fmtLek(s?.revenue ?? 0) },
            { label: 'Lifetime earned', value: fmtLek(s?.earned ?? 0) },
            { label: 'All WA clicks', value: s?.wpClicksTotal ?? 0 },
            { label: 'All orders', value: s?.totalOrders ?? 0 },
          ].map((x) => (
            <div key={x.label}>
              <p className="text-[9px] font-semibold uppercase tracking-wider mb-1" style={{ color: theme.muted }}>{x.label}</p>
              <p className="text-lg font-semibold" style={{ color: theme.ink, fontFamily: theme.fontSerif }}>{x.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 overflow-hidden" style={{ background: theme.card, border: `1px solid ${theme.line}`, borderRadius: theme.radius }}>
            <div className="flex items-center justify-between px-4 sm:px-5 py-4" style={{ borderBottom: `1px solid ${theme.line}` }}>
              <h2 className="font-semibold" style={{ color: theme.ink, fontFamily: theme.fontSerif }}>Orders in period</h2>
              <Link href="/heyadmin/porosi" className="text-xs font-medium" style={{ color: theme.accentDeep }}>View all →</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${theme.line}` }}>
                    {['#', 'Customer', 'Album', 'Amount', 'Status'].map((h) => (
                      <th key={h} className="px-4 sm:px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: theme.muted }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading && !s ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}><td colSpan={5} className="px-5 py-3"><div className="h-4 rounded animate-pulse" style={{ background: theme.accentSoft }} /></td></tr>
                    ))
                  ) : !s?.recentOrders?.length ? (
                    <tr><td colSpan={5} className="px-5 py-10 text-center text-sm" style={{ color: theme.muted }}>No orders in this period</td></tr>
                  ) : (
                    s.recentOrders.map((o: any) => (
                      <tr key={o.id} style={{ borderTop: `1px solid ${theme.line}` }}>
                        <td className="px-4 sm:px-5 py-3 font-mono text-xs" style={{ color: theme.muted }}>#{o.id}</td>
                        <td className="px-4 sm:px-5 py-3">
                          <p className="font-medium text-xs" style={{ color: theme.ink }}>{o.userName || 'Guest'}</p>
                          <p className="text-[10px]" style={{ color: theme.muted }}>{o.userPhone || '—'}</p>
                        </td>
                        <td className="px-4 sm:px-5 py-3 text-xs truncate max-w-[120px]" style={{ color: theme.muted }}>{o.projectTitle || `Proj #${o.projectId}`}</td>
                        <td className="px-4 sm:px-5 py-3 font-semibold text-xs" style={{ color: theme.ink }}>{fmtLek(o.priceLek)}</td>
                        <td className="px-4 sm:px-5 py-3">
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

          <div className="overflow-hidden" style={{ background: theme.card, border: `1px solid ${theme.line}`, borderRadius: theme.radius }}>
            <div className="flex items-center justify-between px-4 sm:px-5 py-4" style={{ borderBottom: `1px solid ${theme.line}` }}>
              <h2 className="font-semibold" style={{ color: theme.ink, fontFamily: theme.fontSerif }}>New members</h2>
              <Link href="/heyadmin/perdorues" className="text-xs font-medium" style={{ color: theme.accentDeep }}>View all →</Link>
            </div>
            <div>
              {!s?.recentUsers?.length ? (
                <div className="px-5 py-10 text-center text-sm" style={{ color: theme.muted }}>No sign-ups in this period</div>
              ) : (
                s.recentUsers.map((u: any) => {
                  const contact = u.phone || u.email || '—';
                  const initials = (u.name || contact || '?').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
                  return (
                    <div key={u.id} className="flex items-center gap-3 px-4 sm:px-5 py-3" style={{ borderTop: `1px solid ${theme.line}` }}>
                      <div
                        className="w-8 h-8 flex items-center justify-center text-[10px] font-semibold shrink-0"
                        style={{ background: theme.accentSoft, color: theme.accentDeep, borderRadius: '999px' }}
                      >
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate" style={{ color: theme.ink }}>{u.name || 'No name'}</p>
                        <p className="text-[10px] truncate" style={{ color: theme.muted }}>{contact}</p>
                      </div>
                      <p className="text-[10px] shrink-0" style={{ color: theme.muted }}>
                        {u.createdAt ? format(new Date(u.createdAt), 'MMM d') : ''}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
