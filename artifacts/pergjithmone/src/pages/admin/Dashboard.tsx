import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { AdminLayout, useAdminTheme } from '@/components/layout/AdminLayout';
import { useListAdminOrders, useUpdateAdminOrder } from '@workspace/api-client-react-tsconfig';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  format, parseISO, eachDayOfInterval, eachHourOfInterval,
  startOfDay, addDays, isValid,
} from 'date-fns';
import {
  TrendingUp, Users, ShoppingBag, Eye, MessageCircle,
  UserPlus, Printer, Truck, FolderOpen, RefreshCw,
  Target, Wallet, Activity, Clock, ArrowUpRight, ArrowDownRight,
  Minus, BookOpen,
} from 'lucide-react';
import { Link } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { authFetch } from '@/lib/authFetch';
import type { AdminTokens } from '@/lib/adminTheme';

const Charts = React.lazy(() => import('./DashboardCharts'));

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

const PIPELINE_STEPS = [
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'printing', label: 'Printing' },
  { key: 'shipped', label: 'Shipped' },
] as const;

function fmtLek(n: number) {
  return `${Number(n || 0).toLocaleString()} L`;
}

function useIsDesktop() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const on = () => setDesktop(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return desktop;
}

function downsample(values: number[], max = 24): number[] {
  if (values.length <= max) return values;
  const step = (values.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => values[Math.round(i * step)] || 0);
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const pts = downsample(values);
  if (pts.length < 2) return null;
  const max = Math.max(...pts, 1);
  const min = Math.min(...pts, 0);
  const span = Math.max(max - min, 1);
  const w = 72;
  const h = 26;
  const d = pts
    .map((v, i) => {
      const x = (i / (pts.length - 1)) * w;
      const y = h - ((v - min) / span) * (h - 2) - 1;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden className="shrink-0">
      <path d={d} fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Delta({ value, theme }: { value: number | null | undefined; theme: AdminTokens }) {
  if (value == null) {
    return <span className="text-[10px] font-medium" style={{ color: theme.muted }}>vs prior · new</span>;
  }
  if (value === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium" style={{ color: theme.muted }}>
        <Minus size={10} /> flat vs prior
      </span>
    );
  }
  const up = value > 0;
  return (
    <span
      className="inline-flex items-center gap-0.5 text-[10px] font-semibold"
      style={{ color: up ? theme.accentDeep : theme.muted }}
    >
      {up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
      {Math.abs(value)}% vs prior
    </span>
  );
}

function StatCard({
  label, value, icon, sub, tone = 'default', delta, spark,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  sub?: string;
  tone?: 'default' | 'accent' | 'success' | 'warm';
  delta?: number | null;
  spark?: number[];
}) {
  const { theme } = useAdminTheme();
  const accents = {
    default: theme.accent,
    accent: theme.accent,
    success: theme.accentDeep,
    warm: theme.accentDeep,
  };
  const accent = accents[tone];
  return (
    <div
      className="relative overflow-hidden"
      style={{
        background: theme.card,
        border: `1px solid ${theme.line}`,
        borderRadius: theme.radius,
        boxShadow: theme.cardShadow,
      }}
    >
      <div className="absolute inset-x-0 top-0 h-[2px]" style={{ background: accent }} />
      <div className="p-3.5 sm:p-4">
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: theme.muted }}>{label}</p>
          <span
            className="w-7 h-7 flex items-center justify-center shrink-0"
            style={{ background: theme.accentSoft, color: accent, borderRadius: `calc(${theme.radius} - 6px)` }}
          >
            {icon}
          </span>
        </div>
        <p className="text-[1.45rem] sm:text-[1.7rem] font-semibold leading-none" style={{ color: theme.ink, fontFamily: theme.fontSerif }}>
          {value}
        </p>
        <div className="mt-2 flex items-end justify-between gap-2 min-h-[26px]">
          <div className="min-w-0">
            <Delta value={delta} theme={theme} />
            {sub && <p className="text-[10px] mt-0.5 truncate" style={{ color: theme.muted }}>{sub}</p>}
          </div>
          {spark && spark.some((n) => n > 0) && <Sparkline values={spark} color={accent} />}
        </div>
      </div>
    </div>
  );
}

function parseBucket(raw: string, grain: 'hour' | 'day'): Date | null {
  if (!raw) return null;
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
    { page: 1, limit: 12, status: 'pending' },
    { query: { staleTime: 20_000, refetchOnMount: 'always', refetchInterval: 60_000 } } as any,
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
      await queryClient.invalidateQueries({ queryKey: ['admin-pulse'] });
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
    <div className="overflow-hidden" style={{ background: theme.card, border: `1px solid ${theme.line}`, borderRadius: theme.radius, boxShadow: '0 8px 24px rgba(40,16,28,0.045)' }}>
      <div className="flex items-center justify-between gap-3 px-4 py-3.5" style={{ borderBottom: `1px solid ${theme.line}` }}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 flex items-center justify-center shrink-0" style={{ background: theme.accentSoft, borderRadius: theme.radius }}>
            <Printer size={14} style={{ color: theme.accentDeep }} />
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-[15px]" style={{ color: theme.ink, fontFamily: theme.fontSerif }}>Print queue</h2>
            <p className="text-[11px] truncate" style={{ color: theme.muted }}>{orders.length} waiting · WhatsApp checkouts</p>
          </div>
        </div>
        <Link href="/heyadmin/porosi" className="text-xs font-medium whitespace-nowrap" style={{ color: theme.accentDeep }}>All orders →</Link>
      </div>

      <div className="sm:hidden divide-y" style={{ borderColor: theme.line }}>
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="px-4 py-3"><div className="h-10 rounded animate-pulse" style={{ background: theme.accentSoft }} /></div>
          ))
        ) : !orders.length ? (
          <p className="px-4 py-8 text-center text-sm" style={{ color: theme.muted }}>All caught up — nothing pending</p>
        ) : (
          orders.map((o: any) => (
            <div key={o.id} className="px-4 py-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold" style={{ color: theme.ink }}>#{o.id} · {o.userName || 'Guest'}</p>
                <p className="text-[11px] truncate" style={{ color: theme.muted }}>{o.projectTitle || `Proj #${o.projectId}`} · {fmtLek(o.priceLek)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {o.pdfUrl ? (
                  <a href={pdfHref(o.pdfUrl)} target="_blank" rel="noopener noreferrer" className="text-[10px] font-semibold" style={{ color: theme.accentDeep }}>PDF</a>
                ) : null}
                <button
                  onClick={() => handleShip(o.id)}
                  disabled={shippingId === o.id}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold disabled:opacity-50"
                  style={{ background: theme.accentSoft, color: theme.accentDeep, borderRadius: '999px' }}
                >
                  <Truck size={11} /> {shippingId === o.id ? '…' : 'Ship'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="hidden sm:block overflow-x-auto">
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

function ChartFallback({ theme, height }: { theme: AdminTokens; height: number }) {
  return <div className="animate-pulse" style={{ height, background: theme.accentSoft, borderRadius: 12 }} />;
}

export default function AdminDashboard() {
  const { theme } = useAdminTheme();
  const desktop = useIsDesktop();
  const [range, setRange] = useState<RangeId>('month');
  const forceRefresh = useRef(false);

  const { data: stats, isLoading, isFetching, dataUpdatedAt, refetch } = useQuery({
    queryKey: ['admin-stats', range],
    queryFn: async () => {
      const refresh = forceRefresh.current;
      forceRefresh.current = false;
      const qs = new URLSearchParams({ range });
      if (refresh) qs.set('refresh', '1');
      const res = await authFetch(`${BASE}/api/admin/stats?${qs}`);
      if (!res.ok) throw new Error('Failed to load stats');
      return res.json();
    },
    staleTime: 60_000,
    refetchInterval: 2 * 60_000,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });

  const s = stats as any;
  const grain: 'hour' | 'day' = s?.grain === 'hour' ? 'hour' : 'day';
  const pipeline = s?.pipeline || {};

  const chartData = useMemo(
    () => buildChartSeries(s?.chartData || [], s?.regChartData || [], s?.orderChartData || [], s?.rangeStart, s?.rangeEnd, grain),
    [s?.chartData, s?.regChartData, s?.orderChartData, s?.rangeStart, s?.rangeEnd, grain],
  );

  const statusMix = useMemo(() => {
    const map = s?.ordersByStatus || {};
    return Object.entries(map)
      .map(([status, v]: [string, any]) => ({
        name: status,
        value: Number(v?.count || 0),
        revenue: Number(v?.revenue || 0),
      }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [s?.ordersByStatus]);

  const mixTotal = statusMix.reduce((n, d) => n + d.value, 0) || 1;
  const pipelineMax = Math.max(
    1,
    ...PIPELINE_STEPS.map((st) => Number(pipeline[st.key]?.count || 0)),
  );

  const xInterval = chartData.length > 40 ? Math.floor(chartData.length / 8) : chartData.length > 14 ? 2 : 0;
  const fromCache = Boolean(s?.cache?.cached);
  const cacheHint = fromCache && s?.cachedUntil
    ? `Cached · ${format(new Date(s.cachedUntil), 'HH:mm')}`
    : dataUpdatedAt
      ? `Updated ${format(new Date(dataUpdatedAt), 'HH:mm')}`
      : 'Live';

  const handleRefresh = () => {
    forceRefresh.current = true;
    void refetch();
  };

  const attention = [
    pipeline.pending?.count ? `${pipeline.pending.count} to print` : null,
    pipeline.printing?.count ? `${pipeline.printing.count} printing` : null,
    pipeline.confirmed?.count ? `${pipeline.confirmed.count} confirmed` : null,
    s?.draftProjects ? `${s.draftProjects} drafts` : null,
  ].filter(Boolean) as string[];

  return (
    <AdminLayout>
      <div className="p-3 sm:p-4 md:p-5 max-w-screen-xl mx-auto pb-16">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3 mb-4">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.18em] uppercase mb-1" style={{ color: theme.accent }}>
              Overview
            </p>
            <h1 className="text-[1.75rem] md:text-[2rem] font-semibold leading-tight" style={{ color: theme.ink, fontFamily: theme.fontSerif }}>
              Studio pulse
            </h1>
            <p className="text-sm mt-0.5" style={{ color: theme.muted }}>
              {format(new Date(), 'EEEE, d MMM')} · {s?.rangeLabel || 'This month'}
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

        <div
          className="flex gap-1.5 overflow-x-auto pb-2 mb-4 -mx-3 px-3 sticky top-[3.4rem] lg:top-0 z-10"
          style={{
            WebkitOverflowScrolling: 'touch',
            background: `linear-gradient(180deg, ${theme.bg} 72%, transparent)`,
            paddingTop: 4,
          }}
        >
          {RANGES.map((r) => {
            const active = range === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setRange(r.id)}
                className="shrink-0 px-3 py-1.5 text-[12px] font-semibold transition-colors"
                style={
                  active
                    ? { background: theme.accent, color: '#fff', borderRadius: '999px' }
                    : { background: theme.card, color: theme.muted, border: `1px solid ${theme.line}`, borderRadius: '999px' }
                }
              >
                {r.label}
              </button>
            );
          })}
        </div>

        {attention.length > 0 && (
          <div
            className="flex flex-wrap items-center gap-2 px-3.5 py-2.5 mb-4 text-[12px]"
            style={{
              background: theme.accentSoft,
              border: `1px solid ${theme.line}`,
              borderRadius: theme.radius,
              color: theme.ink,
            }}
          >
            <span className="font-semibold" style={{ color: theme.accentDeep }}>Needs you</span>
            <span style={{ color: theme.muted }}>{attention.join(' · ')}</span>
            {pipeline.pending?.revenue ? (
              <span className="ml-auto font-semibold" style={{ color: theme.ink }}>{fmtLek(pipeline.pending.revenue)} waiting</span>
            ) : null}
          </div>
        )}

        {isLoading && !s ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse" style={{ background: theme.accentSoft, borderRadius: theme.radius }} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
            <StatCard
              label="Visitors"
              value={s?.visitors ?? 0}
              icon={<Eye size={14} />}
              sub={`${s?.pageViews ?? 0} page views`}
              delta={s?.deltas?.visitors}
              spark={chartData.map((d) => d.visitors)}
            />
            <StatCard
              label="Orders"
              value={s?.orders ?? 0}
              icon={<ShoppingBag size={14} />}
              tone="warm"
              sub={`${fmtLek(s?.revenuePeriod ?? 0)} pipeline`}
              delta={s?.deltas?.orders}
              spark={chartData.map((d) => d.orders)}
            />
            <StatCard
              label="Earned"
              value={fmtLek(s?.earnedPeriod ?? 0)}
              icon={<Wallet size={14} />}
              tone="success"
              sub="Shipped / delivered"
              delta={s?.deltas?.revenue}
              spark={chartData.map((d) => d.revenue)}
            />
            <StatCard
              label="New members"
              value={s?.newUsers ?? 0}
              icon={<UserPlus size={14} />}
              sub={`${s?.newProjects ?? 0} albums started`}
              delta={s?.deltas?.newUsers}
              spark={chartData.map((d) => d.registrations)}
            />
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-5">
          {[
            { label: 'WA clicks', value: s?.wpClicks ?? 0, icon: <MessageCircle size={13} />, tip: 'Period' },
            { label: 'Avg order', value: fmtLek(s?.avgOrderValue ?? 0), icon: <Target size={13} />, tip: 'Non-cancelled' },
            { label: 'Conversion', value: `${s?.conversionRate ?? 0}%`, icon: <Activity size={13} />, tip: 'Orders / visitors' },
            { label: 'Buyers', value: s?.uniqueBuyers ?? 0, icon: <Users size={13} />, tip: s?.repeatCustomers ? `${s.repeatCustomers} repeat` : 'Unique in period' },
            { label: 'Fulfillment', value: s?.fulfillmentHours ? `${s.fulfillmentHours}h` : '—', icon: <Clock size={13} />, tip: 'Avg to ship' },
            { label: 'Drafts', value: s?.draftProjects ?? 0, icon: <FolderOpen size={13} />, tip: 'Albums not ordered' },
          ].map((m) => (
            <div
              key={m.label}
              className="px-3 py-2.5"
              style={{ background: theme.card, border: `1px solid ${theme.line}`, borderRadius: theme.radius }}
            >
              <div className="flex items-center gap-1.5 mb-1" style={{ color: theme.accent }}>
                {m.icon}
                <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: theme.muted }}>{m.label}</span>
              </div>
              <p className="text-[16px] font-semibold leading-none" style={{ color: theme.ink, fontFamily: theme.fontSerif }}>{m.value}</p>
              <p className="text-[10px] mt-1" style={{ color: theme.muted }}>{m.tip}</p>
            </div>
          ))}
        </div>

        <div
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 mb-5"
          style={{ background: theme.card, border: `1px solid ${theme.line}`, borderRadius: theme.radius }}
        >
          {PIPELINE_STEPS.map((st) => {
            const count = Number(pipeline[st.key]?.count || 0);
            const revenue = Number(pipeline[st.key]?.revenue || 0);
            return (
              <div key={st.key}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: theme.muted }}>{st.label}</p>
                  <p className="text-sm font-semibold" style={{ color: theme.ink, fontFamily: theme.fontSerif }}>{count}</p>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: theme.accentSoft }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.round((count / pipelineMax) * 100)}%`, background: theme.accent }}
                  />
                </div>
                <p className="text-[10px] mt-1" style={{ color: theme.muted }}>{fmtLek(revenue)}</p>
              </div>
            );
          })}
        </div>

        <div className="mb-5">
          <PendingPrintingWidget />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-5">
          <div
            className="xl:col-span-2 p-4"
            style={{ background: theme.card, border: `1px solid ${theme.line}`, borderRadius: theme.radius, boxShadow: '0 8px 24px rgba(40,16,28,0.045)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-semibold" style={{ color: theme.ink, fontFamily: theme.fontSerif }}>Traffic & WhatsApp</h2>
                <p className="text-xs" style={{ color: theme.muted }}>
                  {grain === 'hour' ? 'Hourly' : 'Daily'} · {s?.rangeLabel}
                </p>
              </div>
              <TrendingUp size={15} style={{ color: theme.accent }} />
            </div>
            <div style={{ height: desktop ? 220 : 168 }}>
              <Suspense fallback={<ChartFallback theme={theme} height={desktop ? 220 : 168} />}>
                <Charts variant="traffic" data={chartData} theme={theme} xInterval={xInterval} />
              </Suspense>
            </div>
          </div>

          <div
            className="p-4"
            style={{ background: theme.card, border: `1px solid ${theme.line}`, borderRadius: theme.radius }}
          >
            <h2 className="font-semibold mb-1" style={{ color: theme.ink, fontFamily: theme.fontSerif }}>Order mix</h2>
            <p className="text-xs mb-3" style={{ color: theme.muted }}>Status in this period</p>
            {statusMix.length === 0 ? (
              <p className="text-sm py-8 text-center" style={{ color: theme.muted }}>No orders in this period</p>
            ) : (
              <div className="space-y-2.5">
                {statusMix.map((e) => (
                  <div key={e.name}>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="capitalize font-medium" style={{ color: theme.ink }}>{e.name}</span>
                      <span style={{ color: theme.muted }}>{e.value} · {fmtLek(e.revenue)}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: theme.accentSoft }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.round((e.value / mixTotal) * 100)}%`, background: theme.accent }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {(s?.topSizes || []).length > 0 && (
              <div className="mt-5 pt-4" style={{ borderTop: `1px solid ${theme.line}` }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-2.5" style={{ color: theme.muted }}>Top sizes</p>
                <div className="space-y-2">
                  {s.topSizes.map((sz: { label: string; orders: number; revenue: number }) => (
                    <div key={sz.label} className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs min-w-0 truncate" style={{ color: theme.ink }}>
                        <BookOpen size={12} style={{ color: theme.accent }} />
                        {sz.label}
                      </span>
                      <span className="text-[11px] shrink-0" style={{ color: theme.muted }}>{sz.orders} · {fmtLek(sz.revenue)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {desktop && (
          <div
            className="p-4 mb-5"
            style={{ background: theme.card, border: `1px solid ${theme.line}`, borderRadius: theme.radius }}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-semibold" style={{ color: theme.ink, fontFamily: theme.fontSerif }}>Revenue & orders</h2>
                <p className="text-xs" style={{ color: theme.muted }}>Pipeline (non-cancelled)</p>
              </div>
            </div>
            <div style={{ height: 200 }}>
              <Suspense fallback={<ChartFallback theme={theme} height={200} />}>
                <Charts variant="revenue" data={chartData} theme={theme} xInterval={xInterval} />
              </Suspense>
            </div>
          </div>
        )}

        <div
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5 p-4"
          style={{
            background: `linear-gradient(135deg, ${theme.accentSoft} 0%, ${theme.card} 62%)`,
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 overflow-hidden" style={{ background: theme.card, border: `1px solid ${theme.line}`, borderRadius: theme.radius }}>
            <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: `1px solid ${theme.line}` }}>
              <h2 className="font-semibold" style={{ color: theme.ink, fontFamily: theme.fontSerif }}>Orders in period</h2>
              <Link href="/heyadmin/porosi" className="text-xs font-medium" style={{ color: theme.accentDeep }}>View all →</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${theme.line}` }}>
                    {['#', 'Customer', 'Album', 'Amount', 'Status'].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: theme.muted }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading && !s ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i}><td colSpan={5} className="px-4 py-3"><div className="h-4 rounded animate-pulse" style={{ background: theme.accentSoft }} /></td></tr>
                    ))
                  ) : !s?.recentOrders?.length ? (
                    <tr><td colSpan={5} className="px-4 py-10 text-center text-sm" style={{ color: theme.muted }}>No orders in this period</td></tr>
                  ) : (
                    s.recentOrders.map((o: any) => (
                      <tr key={o.id} style={{ borderTop: `1px solid ${theme.line}` }}>
                        <td className="px-4 py-3 font-mono text-xs" style={{ color: theme.muted }}>#{o.id}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-xs" style={{ color: theme.ink }}>{o.userName || 'Guest'}</p>
                          <p className="text-[10px]" style={{ color: theme.muted }}>{o.userPhone || '—'}</p>
                        </td>
                        <td className="px-4 py-3 text-xs truncate max-w-[120px]" style={{ color: theme.muted }}>{o.projectTitle || `Proj #${o.projectId}`}</td>
                        <td className="px-4 py-3 font-semibold text-xs" style={{ color: theme.ink }}>{fmtLek(o.priceLek)}</td>
                        <td className="px-4 py-3">
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
            <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: `1px solid ${theme.line}` }}>
              <h2 className="font-semibold" style={{ color: theme.ink, fontFamily: theme.fontSerif }}>New members</h2>
              <Link href="/heyadmin/perdorues" className="text-xs font-medium" style={{ color: theme.accentDeep }}>View all →</Link>
            </div>
            <div>
              {!s?.recentUsers?.length ? (
                <div className="px-4 py-10 text-center text-sm" style={{ color: theme.muted }}>No sign-ups in this period</div>
              ) : (
                s.recentUsers.map((u: any) => {
                  const contact = u.phone || u.email || '—';
                  const initials = (u.name || contact || '?').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
                  return (
                    <div key={u.id} className="flex items-center gap-3 px-4 py-3" style={{ borderTop: `1px solid ${theme.line}` }}>
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
