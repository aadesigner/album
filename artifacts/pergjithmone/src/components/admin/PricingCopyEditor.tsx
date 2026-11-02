import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { ADMIN } from '@/components/layout/AdminLayout';
import { authFetch } from '@/lib/authFetch';
import {
  type BiText,
  fetchPublishedPage,
  isBiText,
  mergePageContent,
  preparePageContentForSave,
} from '@/lib/marketingPages';
import { PAGE_DEFAULTS } from '@/lib/marketingPages.defaults';

type PlanDraft = {
  name: BiText;
  desc: BiText;
  badge: BiText;
  extra: BiText;
  cta: BiText;
  features: BiText[];
};

function asBi(v: unknown, fallback: BiText = { sq: '', en: '' }): BiText {
  if (isBiText(v)) return { sq: v.sq, en: v.en };
  return { ...fallback };
}

function plansFromContent(content: Record<string, unknown>): PlanDraft[] {
  const plans = Array.isArray(content.plans) ? content.plans : [];
  const defaults = (PAGE_DEFAULTS.pricing as any).plans as PlanDraft[];
  return (plans.length ? plans : defaults).map((p: any, i: number) => {
    const d = defaults[i] || defaults[0];
    const feats = Array.isArray(p?.features) ? p.features : d.features;
    return {
      name: asBi(p?.name, d.name),
      desc: asBi(p?.desc, d.desc),
      badge: asBi(p?.badge, d.badge),
      extra: asBi(p?.extra, d.extra),
      cta: asBi(p?.cta, d.cta),
      features: (feats.length ? feats : d.features).map((f: unknown, fi: number) =>
        asBi(f, d.features[fi] || { sq: '', en: '' }),
      ),
    };
  });
}

function BiPair({
  label,
  value,
  onChange,
  rows = 2,
}: {
  label: string;
  value: BiText;
  onChange: (v: BiText) => void;
  rows?: number;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] uppercase tracking-[0.14em] font-semibold" style={{ color: ADMIN.muted }}>
        {label}
      </p>
      <div className="grid sm:grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 min-w-0">
          <span className="text-[10px] font-semibold" style={{ color: ADMIN.muted }}>Shqip</span>
          <textarea
            rows={rows}
            value={value.sq}
            onChange={(e) => onChange({ ...value, sq: e.target.value })}
            className="w-full text-[13px] px-2.5 py-2 leading-relaxed outline-none resize-y"
            style={{
              borderRadius: ADMIN.radius,
              border: `1px solid ${ADMIN.line}`,
              background: ADMIN.bg,
              color: ADMIN.ink,
            }}
          />
        </label>
        <label className="flex flex-col gap-1 min-w-0">
          <span className="text-[10px] font-semibold" style={{ color: ADMIN.muted }}>English</span>
          <textarea
            rows={rows}
            value={value.en}
            onChange={(e) => onChange({ ...value, en: e.target.value })}
            className="w-full text-[13px] px-2.5 py-2 leading-relaxed outline-none resize-y"
            style={{
              borderRadius: ADMIN.radius,
              border: `1px solid ${ADMIN.line}`,
              background: ADMIN.bg,
              color: ADMIN.ink,
            }}
          />
        </label>
      </div>
    </div>
  );
}

/** Edit pricing plan descriptions + feature bullets (SQ/EN) — persists in page_content_pricing. */
export function PricingCopyEditor() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['marketing-page', 'pricing'],
    queryFn: () => fetchPublishedPage('pricing'),
    staleTime: 30_000,
  });

  const merged = useMemo(
    () => mergePageContent(PAGE_DEFAULTS.pricing as Record<string, unknown>, data?.content) as Record<string, unknown>,
    [data?.content],
  );

  const [plans, setPlans] = useState<PlanDraft[]>(() => plansFromContent(merged));
  const [seoDesc, setSeoDesc] = useState<BiText>(() => asBi((merged as any).seo?.description));
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPlans(plansFromContent(merged));
    setSeoDesc(asBi((merged as any).seo?.description));
  }, [merged]);

  const baseline = useMemo(() => JSON.stringify({
    plans: plansFromContent(merged),
    seo: asBi((merged as any).seo?.description),
  }), [merged]);
  const dirty = JSON.stringify({ plans, seo: seoDesc }) !== baseline;

  const updatePlan = (i: number, patch: Partial<PlanDraft>) => {
    setPlans((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  };

  const updateFeature = (pi: number, fi: number, next: BiText) => {
    setPlans((prev) => prev.map((p, idx) => {
      if (idx !== pi) return p;
      const features = p.features.map((f, j) => (j === fi ? next : f));
      return { ...p, features };
    }));
  };

  const addFeature = (pi: number) => {
    setPlans((prev) => prev.map((p, idx) => {
      if (idx !== pi) return p;
      return { ...p, features: [...p.features, { sq: '', en: '' }] };
    }));
  };

  const removeFeature = (pi: number, fi: number) => {
    setPlans((prev) => prev.map((p, idx) => {
      if (idx !== pi) return p;
      if (p.features.length <= 1) return p;
      return { ...p, features: p.features.filter((_, j) => j !== fi) };
    }));
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const draft = {
        ...merged,
        seo: {
          ...((merged as any).seo || {}),
          description: seoDesc,
        },
        plans: plans.map((p) => ({
          ...p,
          name: p.name,
          desc: p.desc,
          badge: p.badge,
          extra: p.extra,
          cta: p.cta,
          features: p.features,
        })),
      };
      const content = preparePageContentForSave(
        PAGE_DEFAULTS.pricing as Record<string, unknown>,
        draft,
      );
      const r = await authFetch('/api/admin/pages/pricing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error((body as any)?.error || `Save failed (${r.status})`);
      }
      const body = await r.json();
      const savedContent = (body.content || content) as Record<string, unknown>;
      queryClient.setQueryData(['marketing-page', 'pricing'], {
        content: savedContent,
        updatedAt: body.updatedAt ?? new Date().toISOString(),
      });
      await queryClient.invalidateQueries({ queryKey: ['marketing-page', 'pricing'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } catch (e: any) {
      setError(e?.message || 'Could not save pricing copy.');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-8" style={{ color: ADMIN.muted }}>
        <Loader2 size={16} className="animate-spin" /> Loading pricing copy…
      </div>
    );
  }

  return (
    <section className="mt-12 pt-10" style={{ borderTop: `1px solid ${ADMIN.line}` }}>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] font-semibold mb-1" style={{ color: ADMIN.muted }}>
            Pricing page
          </p>
          <h2 className="font-serif text-2xl font-medium" style={{ color: ADMIN.ink }}>
            Descriptions & features
          </h2>
          <p className="text-sm mt-1 max-w-xl" style={{ color: ADMIN.muted }}>
            Edit Albanian and English together. Changes go live on /cmime after save and stay in the database across deploys.
          </p>
        </div>
        <button
          type="button"
          disabled={!dirty || saving}
          onClick={save}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-[12px] font-semibold disabled:opacity-45"
          style={{ borderRadius: ADMIN.radius, background: ADMIN.accent, color: ADMIN.accentOn }}
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : saved ? <Check size={13} /> : <Save size={13} />}
          {saved ? 'Saved' : 'Save copy'}
        </button>
      </div>

      {error && (
        <p className="mb-4 text-sm px-3 py-2 rounded-lg" style={{ background: '#FEE2E2', color: '#991B1B' }}>{error}</p>
      )}

      <div
        className="mb-6 p-4"
        style={{ background: ADMIN.card, border: `1px solid ${ADMIN.line}`, borderRadius: ADMIN.radius }}
      >
        <BiPair label="SEO description" value={seoDesc} onChange={setSeoDesc} rows={3} />
      </div>

      <div className="space-y-5">
        {plans.map((plan, pi) => (
          <div
            key={pi}
            className="p-4 md:p-5 space-y-4"
            style={{ background: ADMIN.card, border: `1px solid ${ADMIN.line}`, borderRadius: `calc(${ADMIN.radius} + 4px)` }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: ADMIN.accent }}>
              Plan {pi + 1}
            </p>
            <BiPair label="Name" value={plan.name} onChange={(name) => updatePlan(pi, { name })} rows={1} />
            <BiPair label="Description" value={plan.desc} onChange={(desc) => updatePlan(pi, { desc })} rows={2} />
            <BiPair label="Badge (empty = hidden)" value={plan.badge} onChange={(badge) => updatePlan(pi, { badge })} rows={1} />
            <BiPair label="Extra leaf price note" value={plan.extra} onChange={(extra) => updatePlan(pi, { extra })} rows={1} />
            <BiPair label="CTA button" value={plan.cta} onChange={(cta) => updatePlan(pi, { cta })} rows={1} />

            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-[10px] uppercase tracking-[0.14em] font-semibold" style={{ color: ADMIN.muted }}>
                  Features
                </p>
                <button
                  type="button"
                  onClick={() => addFeature(pi)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1"
                  style={{ borderRadius: 999, border: `1px solid ${ADMIN.line}`, color: ADMIN.ink }}
                >
                  <Plus size={12} /> Add
                </button>
              </div>
              <div className="space-y-3">
                {plan.features.map((feat, fi) => (
                  <div key={fi} className="relative pl-0">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <BiPair
                          label={`Feature ${fi + 1}`}
                          value={feat}
                          onChange={(v) => updateFeature(pi, fi, v)}
                          rows={2}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFeature(pi, fi)}
                        disabled={plan.features.length <= 1}
                        className="mt-6 p-2 disabled:opacity-30"
                        style={{ color: ADMIN.muted }}
                        title="Remove feature"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
