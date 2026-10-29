import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts';
import type { AdminTokens } from '@/lib/adminTheme';

type Point = {
  label: string;
  visitors: number;
  wp_clicks: number;
  orders: number;
  revenue: number;
};

export default function DashboardCharts({
  variant,
  data,
  theme,
  xInterval,
}: {
  variant: 'traffic' | 'revenue';
  data: Point[];
  theme: AdminTokens;
  xInterval: number;
}) {
  const tip = {
    background: theme.card,
    border: `1px solid ${theme.line}`,
    borderRadius: 12,
    fontSize: 12,
  };

  if (variant === 'traffic') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
          <defs>
            <linearGradient id="gVis" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={theme.accent} stopOpacity={0.25} />
              <stop offset="95%" stopColor={theme.accent} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gWa" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={theme.success} stopOpacity={0.2} />
              <stop offset="95%" stopColor={theme.success} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.line} vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 9, fill: theme.muted }} axisLine={false} tickLine={false} interval={xInterval} />
          <YAxis tick={{ fontSize: 9, fill: theme.muted }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip contentStyle={tip} />
          <Area type="monotone" dataKey="visitors" name="Visitors" stroke={theme.accent} strokeWidth={2} fill="url(#gVis)" dot={false} />
          <Area type="monotone" dataKey="wp_clicks" name="WA clicks" stroke={theme.success} strokeWidth={2} fill="url(#gWa)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.line} vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 9, fill: theme.muted }} axisLine={false} tickLine={false} interval={xInterval} />
        <YAxis yAxisId="l" tick={{ fontSize: 9, fill: theme.muted }} axisLine={false} tickLine={false} allowDecimals={false} />
        <YAxis yAxisId="r" orientation="right" hide />
        <Tooltip contentStyle={tip} />
        <Bar yAxisId="l" dataKey="orders" name="Orders" fill={theme.accent} radius={[4, 4, 0, 0]} />
        <Bar yAxisId="r" dataKey="revenue" name="Revenue (L)" fill="#C4A574" radius={[4, 4, 0, 0]} opacity={0.55} />
      </BarChart>
    </ResponsiveContainer>
  );
}
