import React, { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import {
  useListAdminIpBlocklist,
  useCreateAdminIpBlocklistEntry,
  useDeleteAdminIpBlocklistEntry,
  useListAdminSecurityEvents,
} from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShieldAlert, ShieldBan, Trash2, Ban, AlertOctagon, Clock } from 'lucide-react';

function SectionHeader({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 mb-6">
      <div className="w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
        <Icon size={16} className="text-neutral-600" />
      </div>
      <div>
        <h3 className="font-semibold text-base text-neutral-900">{title}</h3>
        <p className="text-sm text-muted-foreground mt-0.5">{desc}</p>
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

  return (
    <AdminLayout>
      <div className="p-6 md:p-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-serif mb-1">Security</h1>
          <p className="text-muted-foreground text-sm">Manage blocked IPs and see recent abuse activity.</p>
        </div>

        {/* ── IP BLOCKLIST ─────────────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm mb-6">
          <SectionHeader icon={ShieldBan} title="IP Blocklist" desc="Requests from these IPs are rejected before reaching any route, including login." />

          <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3 mb-5">
            <Input
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              placeholder="IP address, e.g. 203.0.113.42"
              className="sm:max-w-[220px]"
            />
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason (optional)"
              className="flex-1"
            />
            <Button type="submit" disabled={createEntry.isPending || !ip.trim()}>
              <Ban size={14} className="mr-1.5" /> Block
            </Button>
          </form>
          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

          {loadingBlocklist ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-12 bg-neutral-100 animate-pulse rounded-lg" />)}</div>
          ) : !blocklist || blocklist.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No IPs are currently blocked.</p>
          ) : (
            <div className="divide-y divide-border">
              {blocklist.map((entry: any) => (
                <div key={entry.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-mono text-sm font-medium">{entry.ip}</p>
                    {entry.reason && <p className="text-xs text-muted-foreground mt-0.5">{entry.reason}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(entry.id)}
                    disabled={deleteEntry.isPending}
                    className="text-muted-foreground hover:text-red-600 transition-colors p-1.5"
                    title="Unblock"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── RECENT ACTIVITY ─────────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <SectionHeader icon={ShieldAlert} title="Recent Abuse Activity" desc="The last 100 rate-limit (429) and blocked-IP hits. Refreshes automatically." />

          {loadingEvents ? (
            <div className="space-y-2">{[1, 2, 3, 4].map((i) => <div key={i} className="h-10 bg-neutral-100 animate-pulse rounded-lg" />)}</div>
          ) : !events || events.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No abuse activity recorded yet.</p>
          ) : (
            <div className="divide-y divide-border max-h-[480px] overflow-y-auto">
              {events.map((ev: any) => (
                <div key={ev.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {ev.event === 'blocked_ip' ? (
                      <AlertOctagon size={14} className="text-red-600 shrink-0" />
                    ) : (
                      <Clock size={14} className="text-amber-600 shrink-0" />
                    )}
                    <span className="font-mono text-xs text-muted-foreground shrink-0">{ev.ip || 'unknown'}</span>
                    <span className="truncate text-neutral-700">{ev.path}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      ev.event === 'blocked_ip' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {ev.event === 'blocked_ip' ? 'Blocked' : 'Rate limited'}
                    </span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
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
