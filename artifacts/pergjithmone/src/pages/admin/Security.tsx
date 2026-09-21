import React, { useState } from 'react';
import { AdminLayout, ADMIN } from '@/components/layout/AdminLayout';
import {
  useListAdminIpBlocklist,
  useCreateAdminIpBlocklistEntry,
  useDeleteAdminIpBlocklistEntry,
  useListAdminSecurityEvents,
} from '@workspace/api-client-react-tsconfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShieldAlert, ShieldBan, Trash2, Ban, AlertOctagon, Clock } from 'lucide-react';

function SectionHeader({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 mb-6">
      <div
        className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0"
        style={{ background: ADMIN.blushSoft }}
      >
        <Icon size={16} style={{ color: ADMIN.blushDeep }} />
      </div>
      <div className="min-w-0">
        <h3 className="font-serif font-semibold text-lg leading-tight" style={{ color: ADMIN.ink }}>{title}</h3>
        <p className="text-sm mt-0.5" style={{ color: ADMIN.muted }}>{desc}</p>
      </div>
    </div>
  );
}

export default function AdminSecurity() {
  const { data: blocklist, isLoading: loadingBlocklist } = useListAdminIpBlocklist();
  const { data: events, isLoading: loadingEvents } = useListAdminSecurityEvents({
    query: { refetchInterval: 15000 },
  } as any);
  const createEntry = useCreateAdminIpBlocklistEntry();
  const deleteEntry = useDeleteAdminIpBlocklistEntry();

  const [ip, setIp] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!ip.trim()) return;
    try {
      await createEntry.mutateAsync({ data: { ip: ip.trim(), reason: reason.trim() || undefined } });
      setIp('');
      setReason('');
    } catch (err: any) {
      setError(err?.message || 'Failed to add IP');
    }
  };

  const handleRemove = async (id: number) => {
    await deleteEntry.mutateAsync({ id });
  };

  const cardClass = 'rounded-2xl p-5 sm:p-6 shadow-sm';
  const cardStyle = { background: ADMIN.card, border: `1px solid ${ADMIN.line}` };

  return (
    <AdminLayout>
      <div className="p-4 sm:p-5 md:p-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <p className="text-[10px] font-semibold tracking-[0.18em] uppercase mb-1.5" style={{ color: ADMIN.blush }}>
            Protection
          </p>
          <h1 className="text-3xl font-serif font-semibold mb-1" style={{ color: ADMIN.ink }}>Security</h1>
          <p className="text-sm" style={{ color: ADMIN.muted }}>Blocked IPs and recent abuse activity.</p>
        </div>

        <div className={`${cardClass} mb-5`} style={cardStyle}>
          <SectionHeader icon={ShieldBan} title="IP blocklist" desc="Requests from these IPs are rejected before any route, including login." />

          <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3 mb-5">
            <Input
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              placeholder="IP address, e.g. 203.0.113.42"
              className="sm:max-w-[220px] rounded-2xl"
            />
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason (optional)"
              className="flex-1 rounded-2xl"
            />
            <Button
              type="submit"
              disabled={createEntry.isPending || !ip.trim()}
              className="rounded-2xl text-white hover:opacity-90"
              style={{ background: ADMIN.blush }}
            >
              <Ban size={14} className="mr-1.5" /> Block
            </Button>
          </form>
          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

          {loadingBlocklist ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-2xl" style={{ background: ADMIN.blushSoft }} />)}</div>
          ) : !blocklist || blocklist.length === 0 ? (
            <p className="text-sm py-4 text-center" style={{ color: ADMIN.muted }}>No IPs are currently blocked.</p>
          ) : (
            <div className="divide-y" style={{ borderColor: ADMIN.line }}>
              {(blocklist as any[]).map((entry: any) => (
                <div key={entry.id} className="flex items-center justify-between py-3 gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-medium" style={{ color: ADMIN.ink }}>{entry.ip}</p>
                    {entry.reason && <p className="text-xs mt-0.5 truncate" style={{ color: ADMIN.muted }}>{entry.reason}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(entry.id)}
                    disabled={deleteEntry.isPending}
                    className="transition-colors p-1.5 rounded-xl hover:bg-red-50 hover:text-red-600 shrink-0"
                    style={{ color: ADMIN.muted }}
                    title="Unblock"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={cardClass} style={cardStyle}>
          <SectionHeader icon={ShieldAlert} title="Recent abuse activity" desc="Last 100 rate-limit and blocked-IP hits. Refreshes automatically." />

          {loadingEvents ? (
            <div className="space-y-2">{[1, 2, 3, 4].map((i) => <div key={i} className="h-10 animate-pulse rounded-2xl" style={{ background: ADMIN.blushSoft }} />)}</div>
          ) : !events || (events as any[]).length === 0 ? (
            <p className="text-sm py-4 text-center" style={{ color: ADMIN.muted }}>No abuse activity recorded yet.</p>
          ) : (
            <div className="divide-y max-h-[480px] overflow-y-auto" style={{ borderColor: ADMIN.line }}>
              {(events as any[]).map((ev: any) => (
                <div key={ev.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2.5 text-sm">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {ev.event === 'blocked_ip' ? (
                      <AlertOctagon size={14} className="text-red-600 shrink-0" />
                    ) : (
                      <Clock size={14} className="text-amber-600 shrink-0" />
                    )}
                    <span className="font-mono text-xs shrink-0" style={{ color: ADMIN.muted }}>{ev.ip || 'unknown'}</span>
                    <span className="truncate" style={{ color: ADMIN.ink }}>{ev.path}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 pl-6 sm:pl-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      ev.event === 'blocked_ip' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {ev.event === 'blocked_ip' ? 'Blocked' : 'Rate limited'}
                    </span>
                    <span className="text-xs whitespace-nowrap" style={{ color: ADMIN.muted }}>
                      {new Date(ev.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
