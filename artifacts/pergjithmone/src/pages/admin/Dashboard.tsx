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
  Minus, BookOpen, FolderArchive, Lock,
} from 'lucide-react';
import { Link } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { authFetch } from '@/lib/authFetch';
import { useToast } from '@/hooks/use-toast';
import type { AdminTokens } from '@/lib/adminTheme';
import { orderStatusInline } from '@/lib/orderStatus';

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

const PIPELINE_STEPS = [
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'printing', label: 'Printing' },
  { key: 'shipped', label: 'Shipped' },
] as const;

function fmtLek(n: number) {
  return `${Math.round(Number(n || 0)).toLocaleString()} L`;
}

function easeOutExpo(t: number) {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

/** Grow a number from 0 → target (eased). Re-runs when target changes. */
function useCountUp(target: number, opts?: { duration?: number; delay?: number }) {
  const duration = opts?.duration ?? 1100;
  const delay = opts?.delay ?? 0;
  const reduced = usePrefersReducedMotion();
  const [display, setDisplay] = useState(0);
  const targetSafe = Number.isFinite(target) ? target : 0;

  useEffect(() => {
    if (reduced) {
      setDisplay(targetSafe);
      return;
    }
    let raf = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setDisplay(0);
    const start = () => {
      const t0 = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - t0) / duration);
        setDisplay(targetSafe * easeOutExpo(p));
        if (p < 1) raf = requestAnimationFrame(tick);
        else setDisplay(targetSafe);
      };
      raf = requestAnimationFrame(tick);
    };
    if (delay > 0) timer = setTimeout(start, delay);
    else start();
    return () => {
      if (timer) clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [targetSafe, duration, delay, reduced]);

  return display;
}

function CountUp({
  value,
  format,
  duration,
  delay,
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  delay?: number;
}) {
  const n = useCountUp(value, { duration, delay });
  const fmt = format ?? ((x: number) => Math.round(x).toLocaleString());
  return <>{fmt(n)}</>;
}

function GrowBar({
  pct,
  color,
  delay = 0,
}: {
  pct: number;
  color: string;
  delay?: number;
}) {
  const [w, setW] = useState(0);
  const reduced = usePrefersReducedMotion();
  useEffect(() => {
    if (reduced) {
      setW(pct);
      return;
    }
    setW(0);
    const t = setTimeout(() => setW(pct), Math.max(16, delay));
    return () => clearTimeout(t);
  }, [pct, delay, reduced]);
  return (
    <div
      className="h-full rounded-full"
      style={{
        width: `${Math.max(0, Math.min(100, w))}%`,
        background: color,
        transition: reduced ? undefined : 'width 950ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    />
  );
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
  label, value, icon, sub, tone = 'default', delta, spark, format, delay = 0,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  sub?: string;
  tone?: 'default' | 'accent' | 'success' | 'warm';
  delta?: number | null;
  spark?: number[];
  format?: (n: number) => string;
  delay?: number;
}) {
  const { theme, paletteId } = useAdminTheme();
  const accents = {
    default: theme.accent,
    accent: theme.accent,
    success: theme.accentDeep,
    warm: theme.accentDeep,
  };
  const accent = accents[tone];
  return (
    <div
      key={`stat-${paletteId}-${label}`}
      className="relative overflow-hidden group"
      style={{
        background: `linear-gradient(165deg, ${theme.card} 0%, color-mix(in srgb, ${theme.accentSoft} 55%, ${theme.card}) 100%)`,
        border: `1px solid color-mix(in srgb, ${theme.line} 80%, ${theme.accent} 20%)`,
        borderRadius: 22,
        boxShadow: `0 12px 32px color-mix(in srgb, ${theme.ink} 5%, transparent), ${theme.cardShadow}`,
        animation: 'adminStatIn 520ms cubic-bezier(0.22, 1, 0.36, 1) both',
        animationDelay: `${delay}ms`,
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-8 w-28 h-28 rounded-full opacity-70"
        style={{
          background: `radial-gradient(circle, color-mix(in srgb, ${accent} 22%, transparent) 0%, transparent 70%)`,
        }}
      />
      <div className="relative p-4 sm:p-[1.2rem]">
        <div className="flex items-start justify-between gap-2 mb-3">
          <p className="text-[12px] font-medium" style={{ color: theme.muted }}>{label}</p>
          <span
            className="w-9 h-9 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105"
            style={{
              background: `color-mix(in srgb, ${theme.accentSoft} 80%, white)`,
              color: accent,
              borderRadius: 999,
              border: `1px solid color-mix(in srgb, ${accent} 14%, transparent)`,
              boxShadow: `0 6px 14px color-mix(in srgb, ${accent} 12%, transparent)`,
            }}
          >
            {icon}
          </span>
        </div>
        <p className="text-[1.95rem] sm:text-[2.2rem] font-semibold leading-none tracking-tight tabular-nums" style={{ color: theme.ink, fontFamily: theme.fontSerif }}>
          <CountUp value={Number(value || 0)} format={format} delay={delay} duration={1150} />
        </p>
        <div className="mt-3 flex items-end justify-between gap-2 min-h-[26px]">
          <div className="min-w-0">
            <Delta value={delta} theme={theme} />
            {sub && <p className="text-[11px] mt-0.5 truncate" style={{ color: theme.muted }}>{sub}</p>}
          </div>
          {spark && spark.some((n) => n > 0) && <Sparkline values={spark} color={accent} />}
        </div>
      </div>
    </div>
  );
}

/** Palette-tinted hero — soft gradient + floating orbs (not a flat classic bar). */
function DashboardHero({
  rangeLabel,
  cacheHint,
  onRefresh,
  refreshing,
}: {
  rangeLabel: string;
  cacheHint: string;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const { theme } = useAdminTheme();
  return (
    <div
      className="relative overflow-hidden mb-5"
      style={{
        borderRadius: 28,
        border: `1px solid color-mix(in srgb, ${theme.line} 70%, ${theme.accent} 30%)`,
        background: `
          linear-gradient(135deg,
            color-mix(in srgb, ${theme.accent} 16%, ${theme.card}) 0%,
            ${theme.card} 42%,
            color-mix(in srgb, ${theme.accentSoft} 90%, ${theme.card}) 100%)
        `,
        boxShadow: `0 18px 48px color-mix(in srgb, ${theme.accent} 10%, transparent)`,
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -left-10 -top-14 w-48 h-48 rounded-full adminOrbDriftA"
        style={{
          background: `radial-gradient(circle, color-mix(in srgb, ${theme.accent} 28%, transparent) 0%, transparent 68%)`,
          filter: 'blur(2px)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 top-0 w-40 h-40 rounded-full adminOrbDriftB"
        style={{
          background: `radial-gradient(circle, color-mix(in srgb, ${theme.accentDeep} 18%, transparent) 0%, transparent 70%)`,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-16 -bottom-10 w-32 h-32 rounded-full"
        style={{
          background: `radial-gradient(circle, color-mix(in srgb, ${theme.accent} 14%, transparent) 0%, transparent 72%)`,
        }}
      />

      <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-4 px-5 sm:px-7 pt-6 pb-5">
        <div className="min-w-0">
          <h1
            className="text-[1.85rem] sm:text-[2.15rem] font-semibold tracking-tight leading-none"
            style={{ color: theme.ink, fontFamily: theme.fontSerif }}
          >
            Dashboard
          </h1>
          <p className="text-[13px] mt-2.5" style={{ color: theme.muted }}>
            {format(new Date(), 'EEE, d MMM')} · {rangeLabel}
            <span className="opacity-45"> · </span>
            {cacheHint}
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-semibold disabled:opacity-50 self-start sm:self-auto transition-transform active:scale-[0.98]"
          style={{
            background: theme.accent,
            color: theme.accentOn,
            borderRadius: 999,
            boxShadow: `0 10px 22px color-mix(in srgb, ${theme.accent} 28%, transparent)`,
          }}
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading, refetch } = useListAdminOrders(
    { page: 1, limit: 12, status: 'pending' },
    { query: { staleTime: 45_000, refetchOnMount: true, refetchInterval: 120_000 } } as any,
  );
  const updateOrder = useUpdateAdminOrder();
  const [shippingId, setShippingId] = React.useState<number | null>(null);
  const [regenId, setRegenId] = React.useState<number | null>(null);
  const orders = (data as any)?.data || [];
  const pendingTone = orderStatusInline('pending');
  const shippedTone = orderStatusInline('shipped');

  const handleShip = async (orderId: number) => {
    setShippingId(orderId);
    try {
      await updateOrder.mutateAsync({ orderId, data: { status: 'shipped' as any } });
      refetch();
      await queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-pulse'] });
    } finally { setShippingId(null); }
  };

  /** Generate print PDF when order landed without one (failed / unfinished generation). */
  const handleGeneratePdf = async (orderId: number, projectId?: number) => {
    setRegenId(orderId);
    try {
      const token = getToken();
      toast({ title: 'Rendering print PDF…', description: 'This can take up to a minute.' });
      const res = await fetch(`${BASE}/api/admin/orders/${orderId}/regenerate-pdf`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });
      const body = await res.json().catch(() => ({})) as {
        error?: string;
        status?: string;
        pdfUrl?: string | null;
      };
      if (!res.ok) {
        const msg = String(body.error || '');
        toast({
          title: /PRINT_ASSETS_WIPED|Auto Wiper/i.test(msg)
            ? 'Print assets wiped'
            : /MISSING_UPLOADS|missing on disk/i.test(msg)
              ? 'Photos missing on server'
              : /UNRESOLVED_DEVICE_PHOTOS|device-local|local-photo/i.test(msg)
                ? 'Photos never reached the server'
                : 'PDF generation failed',
          description: /PRINT_ASSETS_WIPED|Auto Wiper/i.test(msg)
            ? 'PDF and photos were removed by Auto Wiper.'
            : (msg || 'Try again from Orders'),
          variant: 'destructive',
        });
        return;
      }
      if (body.status === 'ready' && body.pdfUrl) {
        toast({ title: 'PDF ready' });
        refetch();
        return;
      }
      if (projectId) {
        for (let i = 0; i < 120; i++) {
          await new Promise((r) => setTimeout(r, 1000));
          try {
            const stRes = await fetch(`${BASE}/api/projects/${projectId}/pdf-status`, {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
              credentials: 'include',
            });
            if (!stRes.ok) continue;
            const st = await stRes.json() as {
              status?: string;
              pdfUrl?: string | null;
              error?: string | null;
            };
            if (st.status === 'ready' && st.pdfUrl) {
              toast({ title: 'PDF ready' });
              refetch();
              return;
            }
            if (st.status === 'failed') {
              const msg = String(st.error || 'PDF generation failed');
              toast({
                title: /MISSING_UPLOADS|missing on disk/i.test(msg)
                  ? 'Photos missing on server'
                  : /UNRESOLVED_DEVICE_PHOTOS|device-local|local-photo/i.test(msg)
                    ? 'Photos never reached the server'
                    : 'PDF generation failed',
                description: msg,
                variant: 'destructive',
              });
              refetch();
              return;
            }
          } catch { /* keep polling */ }
        }
        toast({ title: 'Still generating', description: 'Refresh in a moment or open Orders.' });
      }
      refetch();
    } finally {
      setRegenId(null);
    }
  };

  const pdfHref = (pdfUrl: string) => {
    const token = getToken();
    if (!pdfUrl) return pdfUrl;
    const withBase = pdfUrl.startsWith('http') ? pdfUrl : `${BASE}${pdfUrl.startsWith('/') ? '' : '/'}${pdfUrl}`;
    if (!token) return withBase;
    const join = withBase.includes('?') ? '&' : '?';
    return `${withBase}${join}token=${encodeURIComponent(token)}`;
  };

  const photosZipHref = (orderId: number) => {
    const token = getToken();
    const path = `${BASE}/api/admin/orders/${orderId}/images-zip`;
    if (!token) return path;
    return `${path}?token=${encodeURIComponent(token)}`;
  };

  return (
    <div
      className="overflow-hidden"
      style={{
        background: `linear-gradient(165deg, ${theme.card}, color-mix(in srgb, ${pendingTone.bg} 35%, ${theme.card}))`,
        border: `1px solid color-mix(in srgb, ${theme.line} 75%, ${pendingTone.border} 25%)`,
        borderRadius: 24,
        boxShadow: `0 14px 36px color-mix(in srgb, ${theme.ink} 5%, transparent)`,
      }}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3.5" style={{ borderBottom: `1px solid ${theme.line}` }}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 flex items-center justify-center shrink-0" style={{ background: pendingTone.bg, borderRadius: 999, border: `1px solid ${pendingTone.border}` }}>
            <Printer size={14} style={{ color: pendingTone.color }} />
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-[15px]" style={{ color: theme.ink, fontFamily: theme.fontSerif }}>Print queue</h2>
            <p className="text-[11px] truncate" style={{ color: theme.muted }}>
              {orders.length ? `${orders.length} pending — mark shipped when done` : 'Nothing pending'}
            </p>
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
                {o.printAssetsWipedAt ? (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold" style={{ color: theme.muted }} title="Removed by Auto Wiper">
                    <Lock size={10} /> Wiped
                  </span>
                ) : (
                  <>
                    {o.pdfUrl ? (
                      <a href={pdfHref(o.pdfUrl)} target="_blank" rel="noopener noreferrer" className="text-[10px] font-semibold" style={{ color: theme.accentDeep }}>PDF</a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleGeneratePdf(o.id, o.projectId)}
                        disabled={regenId === o.id}
                        className="inline-flex items-center gap-0.5 text-[10px] font-semibold disabled:opacity-50"
                        style={{ color: theme.accentDeep }}
                        title="Print PDF was never saved — generate now"
                      >
                        <RefreshCw size={10} className={regenId === o.id ? 'animate-spin' : ''} />
                        {regenId === o.id ? '…' : 'Generate PDF'}
                      </button>
                    )}
                    <a href={photosZipHref(o.id)} className="inline-flex items-center gap-0.5 text-[10px] font-semibold" style={{ color: theme.accentDeep }} title="Download client photos zip">
                      <FolderArchive size={10} /> Photos
                    </a>
                  </>
                )}
                <button
                  onClick={() => handleShip(o.id)}
                  disabled={shippingId === o.id}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold disabled:opacity-50 border"
                  style={{
                    background: shippedTone.bg,
                    color: shippedTone.color,
                    borderColor: shippedTone.border,
                    borderRadius: theme.radius,
                  }}
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
                    <div className="flex items-center gap-2">
                      {o.printAssetsWipedAt ? (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold" style={{ color: theme.muted }} title="Removed by Auto Wiper">
                          <Lock size={10} /> Wiped
                        </span>
                      ) : (
                        <>
                          {o.pdfUrl ? (
                            <a href={pdfHref(o.pdfUrl)} target="_blank" rel="noopener noreferrer" className="text-[10px] font-semibold hover:underline" style={{ color: theme.accentDeep }}>PDF</a>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleGeneratePdf(o.id, o.projectId)}
                              disabled={regenId === o.id}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold hover:underline disabled:opacity-50"
                              style={{ color: theme.accentDeep }}
                              title="Print PDF was never saved — generate now"
                            >
                              <RefreshCw size={10} className={regenId === o.id ? 'animate-spin' : ''} />
                              {regenId === o.id ? 'Rendering…' : 'Generate PDF'}
                            </button>
                          )}
                          <a href={photosZipHref(o.id)} className="inline-flex items-center gap-0.5 text-[10px] font-semibold hover:underline" style={{ color: theme.accentDeep }} title="Download client photos zip">
                            <FolderArchive size={10} /> Photos
                          </a>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-4 sm:px-5 py-3 text-right">
                    <button
                      onClick={() => handleShip(o.id)}
                      disabled={shippingId === o.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold disabled:opacity-50"
                      style={{
                        background: shippedTone.bg,
                        color: shippedTone.color,
                        borderRadius: theme.radius,
                        border: `1px solid ${shippedTone.border}`,
                      }}
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
  const { theme, paletteId } = useAdminTheme();
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
    staleTime: 90_000,
    refetchInterval: 3 * 60_000,
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

  const actionItems = [
    Number(pipeline.pending?.count) > 0
      ? {
          key: 'pending',
          label: `${pipeline.pending.count} to print`,
          href: '/heyadmin/porosi?status=pending',
          detail: pipeline.pending.revenue ? fmtLek(pipeline.pending.revenue) : null,
        }
      : null,
    Number(pipeline.confirmed?.count) > 0
      ? {
          key: 'confirmed',
          label: `${pipeline.confirmed.count} confirmed`,
          href: '/heyadmin/porosi?status=confirmed',
          detail: null,
        }
      : null,
    Number(pipeline.printing?.count) > 0
      ? {
          key: 'printing',
          label: `${pipeline.printing.count} printing`,
          href: '/heyadmin/porosi?status=printing',
          detail: null,
        }
      : null,
  ].filter(Boolean) as Array<{ key: string; label: string; href: string; detail: string | null }>;

  const secondaryMetrics: Array<{
    label: string;
    value: number;
    format?: (n: number) => string;
    icon: React.ReactNode;
    tip: string;
    href: string | null;
    animate?: boolean;
  }> = [
    { label: 'WA clicks', value: s?.wpClicks ?? 0, icon: <MessageCircle size={13} />, tip: 'This period', href: null },
    { label: 'Avg order', value: s?.avgOrderValue ?? 0, format: fmtLek, icon: <Target size={13} />, tip: 'Non-cancelled', href: null },
    {
      label: 'Conversion',
      value: s?.conversionRate ?? 0,
      format: (n) => `${Math.round(n * 10) / 10}%`,
      icon: <Activity size={13} />,
      tip: 'Orders / visitors',
      href: null,
    },
    { label: 'Buyers', value: s?.uniqueBuyers ?? 0, icon: <Users size={13} />, tip: s?.repeatCustomers ? `${s.repeatCustomers} repeat` : 'Unique buyers', href: '/heyadmin/perdorues?filter=ordered' },
    {
      label: 'Fulfillment',
      value: s?.fulfillmentHours ?? 0,
      format: (n) => (n > 0 ? `${Math.round(n * 10) / 10}h` : '—'),
      icon: <Clock size={13} />,
      tip: 'Avg to ship',
      href: '/heyadmin/porosi',
      animate: (s?.fulfillmentHours ?? 0) > 0,
    },
    {
      label: 'Open albums',
      value: s?.draftProjects ?? 0,
      icon: <FolderOpen size={13} />,
      tip: 'Started, not ordered yet',
      href: '/heyadmin/perdorues?filter=not_ordered',
    },
  ];

  return (
    <AdminLayout>
      <style>{`
        @keyframes adminStatIn {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes adminOrbDriftA {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(12px, 8px) scale(1.06); }
        }
        @keyframes adminOrbDriftB {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-10px, 6px) scale(1.08); }
        }
        .adminOrbDriftA { animation: adminOrbDriftA 9s ease-in-out infinite; }
        .adminOrbDriftB { animation: adminOrbDriftB 11s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          @keyframes adminStatIn {
            from { opacity: 1; transform: none; }
            to { opacity: 1; transform: none; }
          }
          .adminOrbDriftA, .adminOrbDriftB { animation: none; }
        }
      `}</style>
      <div className="p-4 sm:p-6 md:p-8 max-w-screen-xl mx-auto pb-16">
        <DashboardHero
          rangeLabel={s?.rangeLabel || 'This month'}
          cacheHint={cacheHint}
          onRefresh={handleRefresh}
          refreshing={isFetching}
        />

        <div
          key={`range-bar-${paletteId}`}
          className="flex gap-1 overflow-x-auto mb-5 p-1.5 sticky top-[3.4rem] lg:top-0 z-10"
          style={{
            WebkitOverflowScrolling: 'touch',
            background: 'color-mix(in srgb, var(--admin-card, #fff) 92%, transparent)',
            border: '1px solid color-mix(in srgb, var(--admin-line, #e8e8ea) 85%, var(--admin-accent) 15%)',
            borderRadius: 999,
            boxShadow: `0 10px 28px color-mix(in srgb, ${theme.ink} 4%, transparent)`,
          }}
        >
          {RANGES.map((r) => {
            const active = range === r.id;
            return (
              <button
                key={`${paletteId}-${r.id}`}
                type="button"
                onClick={() => setRange(r.id)}
                className="shrink-0 px-3.5 py-1.5 text-[12px] font-semibold"
                style={{
                  color: active ? 'var(--admin-accent-on)' : theme.muted,
                  background: active
                    ? 'linear-gradient(135deg, var(--admin-accent), var(--admin-accent-deep))'
                    : 'transparent',
                  borderRadius: 999,
                  boxShadow: active
                    ? '0 6px 14px color-mix(in srgb, var(--admin-accent) 30%, transparent)'
                    : undefined,
                }}
              >
                {r.label}
              </button>
            );
          })}
        </div>

        {actionItems.length > 0 && (
          <div
            className="flex flex-wrap items-center gap-2 px-4 py-3.5 mb-5"
            style={{
              background: `linear-gradient(120deg, ${theme.card}, color-mix(in srgb, ${theme.accentSoft} 65%, ${theme.card}))`,
              border: `1px solid ${theme.line}`,
              borderRadius: 20,
              boxShadow: theme.cardShadow,
            }}
          >
            <span
              className="text-[11px] font-semibold uppercase tracking-[0.12em]"
              style={{ color: theme.muted }}
            >
              Next
            </span>
            {actionItems.map((item) => {
              const st = orderStatusInline(item.key);
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold border transition-transform hover:-translate-y-0.5"
                  style={{
                    background: st.bg,
                    color: st.color,
                    borderColor: st.border,
                    borderRadius: 999,
                  }}
                >
                  {item.label}
                  {item.detail ? <span style={{ opacity: 0.75 }}>· {item.detail}</span> : null}
                  <ArrowUpRight size={12} />
                </Link>
              );
            })}
          </div>
        )}

        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] mb-3" style={{ color: theme.muted }}>
          Overview
        </p>

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
              delay={0}
            />
            <StatCard
              label="Orders"
              value={s?.orders ?? 0}
              icon={<ShoppingBag size={14} />}
              tone="warm"
              sub={`${fmtLek(s?.revenuePeriod ?? 0)} pipeline`}
              delta={s?.deltas?.orders}
              spark={chartData.map((d) => d.orders)}
              delay={70}
            />
            <StatCard
              label="Earned"
              value={s?.earnedPeriod ?? 0}
              format={fmtLek}
              icon={<Wallet size={14} />}
              tone="success"
              sub="Confirmed → shipped"
              delta={s?.deltas?.revenue}
              spark={chartData.map((d) => d.revenue)}
              delay={140}
            />
            <StatCard
              label="New members"
              value={s?.newUsers ?? 0}
              icon={<UserPlus size={14} />}
              sub={`${s?.newProjects ?? 0} albums started`}
              delta={s?.deltas?.newUsers}
              spark={chartData.map((d) => d.registrations)}
              delay={210}
            />
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-5">
          {secondaryMetrics.map((m, i) => {
            const body = (
              <>
                <div className="flex items-center gap-1.5 mb-1" style={{ color: theme.accent }}>
                  {m.icon}
                  <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: theme.muted }}>{m.label}</span>
                </div>
                <p className="text-[19px] font-semibold leading-none tabular-nums" style={{ color: theme.ink, fontFamily: theme.fontSerif }}>
                  {m.animate === false ? (
                    (m.format ?? ((n: number) => Math.round(n).toLocaleString()))(m.value)
                  ) : (
                    <CountUp value={m.value} format={m.format} delay={180 + i * 45} duration={1000} />
                  )}
                </p>
                <p className="text-[10px] mt-1" style={{ color: theme.muted }}>
                  {m.tip}{m.href ? ' · open →' : ''}
                </p>
              </>
            );
            const chipStyle: React.CSSProperties = {
              background: `linear-gradient(160deg, ${theme.card}, color-mix(in srgb, ${theme.accentSoft} 50%, ${theme.card}))`,
              border: `1px solid color-mix(in srgb, ${theme.line} 85%, ${theme.accent} 15%)`,
              borderRadius: 18,
              boxShadow: `0 8px 20px color-mix(in srgb, ${theme.ink} 4%, transparent)`,
              animation: 'adminStatIn 480ms cubic-bezier(0.22, 1, 0.36, 1) both',
              animationDelay: `${180 + i * 45}ms`,
            };
            return m.href ? (
              <Link
                key={m.label}
                href={m.href}
                className="block px-3.5 py-3 transition-transform hover:-translate-y-0.5"
                style={chipStyle}
              >
                {body}
              </Link>
            ) : (
              <div key={m.label} className="px-3.5 py-3" style={chipStyle}>
                {body}
              </div>
            );
          })}
        </div>

        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] mb-3" style={{ color: theme.muted }}>
          Pipeline
        </p>
        <div
          className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 mb-5"
          style={{
            background: `linear-gradient(160deg, ${theme.card}, color-mix(in srgb, ${theme.accentSoft} 40%, ${theme.card}))`,
            border: `1px solid color-mix(in srgb, ${theme.line} 80%, ${theme.accent} 20%)`,
            borderRadius: 24,
            boxShadow: `0 14px 36px color-mix(in srgb, ${theme.ink} 5%, transparent)`,
          }}
        >
          {PIPELINE_STEPS.map((st, i) => {
            const count = Number(pipeline[st.key]?.count || 0);
            const revenue = Number(pipeline[st.key]?.revenue || 0);
            const stColor = orderStatusInline(st.key);
            const barPct = Math.round((count / pipelineMax) * 100);
            return (
              <Link
                key={st.key}
                href={`/heyadmin/porosi?status=${st.key}`}
                className="block px-3 py-2.5 transition-transform hover:-translate-y-0.5"
                style={{
                  background: `color-mix(in srgb, ${stColor.bg} 55%, ${theme.card})`,
                  borderRadius: 18,
                  animation: 'adminStatIn 480ms cubic-bezier(0.22, 1, 0.36, 1) both',
                  animationDelay: `${260 + i * 55}ms`,
                }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: stColor.color }}>{st.label}</p>
                  <p className="text-[1.05rem] font-semibold tabular-nums" style={{ color: theme.ink, fontFamily: theme.fontSerif }}>
                    <CountUp value={count} delay={260 + i * 55} duration={950} />
                  </p>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: stColor.bg }}>
                  <GrowBar pct={barPct} color={stColor.color} delay={260 + i * 55} />
                </div>
                <p className="text-[10px] mt-1 tabular-nums" style={{ color: theme.muted }}>
                  <CountUp value={revenue} format={fmtLek} delay={260 + i * 55} duration={950} />
                </p>
              </Link>
            );
          })}
        </div>

        <div className="mb-5">
          <PendingPrintingWidget />
        </div>

        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] mb-3" style={{ color: theme.muted }}>
          Charts
        </p>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-5">
          <div
            className="xl:col-span-2 p-4 sm:p-5 relative overflow-hidden"
            style={{
              background: theme.card,
              border: `1px solid color-mix(in srgb, ${theme.line} 85%, ${theme.accent} 15%)`,
              borderRadius: 24,
              boxShadow: `0 14px 36px color-mix(in srgb, ${theme.ink} 5%, transparent)`,
            }}
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
            className="p-4 sm:p-5"
            style={{
              background: `linear-gradient(165deg, ${theme.card}, color-mix(in srgb, ${theme.accentSoft} 45%, ${theme.card}))`,
              border: `1px solid color-mix(in srgb, ${theme.line} 85%, ${theme.accent} 15%)`,
              borderRadius: 24,
              boxShadow: `0 14px 36px color-mix(in srgb, ${theme.ink} 5%, transparent)`,
            }}
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
            className="p-4 sm:p-5 mb-5"
            style={{
              background: theme.card,
              border: `1px solid color-mix(in srgb, ${theme.line} 85%, ${theme.accent} 15%)`,
              borderRadius: 24,
              boxShadow: `0 14px 36px color-mix(in srgb, ${theme.ink} 5%, transparent)`,
            }}
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

        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] mb-3" style={{ color: theme.muted }}>
          All time
        </p>
        <div
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5 p-4 sm:p-5"
          style={{
            background: `linear-gradient(135deg, color-mix(in srgb, ${theme.accent} 10%, ${theme.card}), ${theme.card} 50%, color-mix(in srgb, ${theme.accentSoft} 70%, ${theme.card}))`,
            border: `1px solid color-mix(in srgb, ${theme.line} 80%, ${theme.accent} 20%)`,
            borderRadius: 24,
            boxShadow: `0 14px 36px color-mix(in srgb, ${theme.accent} 8%, transparent)`,
          }}
        >
          {[
            { label: 'Pipeline revenue', value: s?.revenue ?? 0, format: fmtLek },
            { label: 'Earned', value: s?.earned ?? 0, format: fmtLek },
            { label: 'WA clicks', value: s?.wpClicksTotal ?? 0 },
            { label: 'Orders', value: s?.totalOrders ?? 0 },
          ].map((x, i) => (
            <div
              key={x.label}
              style={{
                animation: 'adminStatIn 480ms cubic-bezier(0.22, 1, 0.36, 1) both',
                animationDelay: `${320 + i * 50}ms`,
              }}
            >
              <p className="text-[9px] font-semibold uppercase tracking-wider mb-1" style={{ color: theme.muted }}>{x.label}</p>
              <p className="text-[1.35rem] font-semibold tabular-nums" style={{ color: theme.ink, fontFamily: theme.fontSerif }}>
                <CountUp
                  value={Number(x.value || 0)}
                  format={x.format}
                  delay={320 + i * 50}
                  duration={1100}
                />
              </p>
            </div>
          ))}
        </div>

        <p className="text-[13px] font-medium mb-3" style={{ color: theme.muted }}>
          Activity
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div
            className="lg:col-span-2 overflow-hidden"
            style={{
              background: theme.card,
              border: `1px solid color-mix(in srgb, ${theme.line} 85%, ${theme.accent} 15%)`,
              borderRadius: 24,
              boxShadow: `0 14px 36px color-mix(in srgb, ${theme.ink} 5%, transparent)`,
            }}
          >
            <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: `1px solid ${theme.line}`, background: theme.card }}>
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
                          {(() => {
                            const st = orderStatusInline(o.status);
                            return (
                              <span
                                className="px-2 py-0.5 text-[10px] font-semibold capitalize border"
                                style={{
                                  background: st.bg,
                                  color: st.color,
                                  borderColor: st.border,
                                  borderRadius: 999,
                                }}
                              >
                                {o.status}
                              </span>
                            );
                          })()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div
            className="overflow-hidden"
            style={{
              background: `linear-gradient(165deg, ${theme.card}, color-mix(in srgb, ${theme.accentSoft} 40%, ${theme.card}))`,
              border: `1px solid color-mix(in srgb, ${theme.line} 85%, ${theme.accent} 15%)`,
              borderRadius: 24,
              boxShadow: `0 14px 36px color-mix(in srgb, ${theme.ink} 5%, transparent)`,
            }}
          >
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
