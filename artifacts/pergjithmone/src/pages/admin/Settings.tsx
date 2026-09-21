import React, { useState, useEffect, useMemo } from 'react';
import { AdminLayout, ADMIN } from '@/components/layout/AdminLayout';
import {
  useGetAdminSettings, useUpdateAdminSettings,
  getGetAdminSettingsQueryKey, getGetAppSettingsQueryKey,
} from '@workspace/api-client-react-tsconfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription } from '@/components/ui/form';
import { DESIGN_CATEGORY_LABELS } from '@/lib/designMeta';
import { parseCustomDesigns, buildDesignCatalog, designFrontElements } from '@/lib/designs';
import { ResponsivePageThumb } from '@/components/PageThumb';
import { Eye, EyeOff, Check, AlertTriangle, BookX, BookHeart, Settings, Wrench, DollarSign, Palette, ShieldAlert, FileLock2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none"
      style={{ background: checked ? ADMIN.blush : '#E5DCDC' }}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

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

const CATEGORY_ORDER = ['Wedding','Travel','Baby & Family','Celebration','Modern','Portrait','Nature'];

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useGetAdminSettings();
  const updateSettings = useUpdateAdminSettings();
  const s = settings as any;

  const form = useForm({
    values: {
      whatsappNumber:       s?.whatsappNumber       || '',
      basePriceLek:         s?.basePriceLek          || 3100,
      minPages:             s?.minPages              || 30,
      extraSpreadPriceLek:  s?.extraSpreadPriceLek   || 200,
      siteName:             s?.siteName              || 'Përgjithmonë',
      siteTaglineAl:        s?.siteTaglineAl         || '',
      siteTaglineEn:        s?.siteTaglineEn         || '',
      maintenanceMode:      s?.maintenanceMode       ?? false,
      maintenanceMessageAl: s?.maintenanceMessageAl  || '',
      maintenanceMessageEn: s?.maintenanceMessageEn  || '',
      bookCreationEnabled:  s?.bookCreationEnabled   ?? true,
      bookDisabledNoticeAl: s?.bookDisabledNoticeAl  || '',
      bookDisabledNoticeEn: s?.bookDisabledNoticeEn  || '',
      requireLoginForPdf:   s?.requireLoginForPdf    ?? false,
      pendingBooksLimitEnabled: s?.pendingBooksLimitEnabled ?? true,
      pendingBooksLimit:        s?.pendingBooksLimit        || 10,
      rateLimitGeneralWindowMs:    s?.rateLimitGeneralWindowMs    || 900000,
      rateLimitGeneralMax:         s?.rateLimitGeneralMax         || 8000,
      rateLimitAuthWindowMs:       s?.rateLimitAuthWindowMs       || 900000,
      rateLimitAuthMax:            s?.rateLimitAuthMax            || 120,
      rateLimitAnalyticsWindowMs:  s?.rateLimitAnalyticsWindowMs  || 60000,
      rateLimitAnalyticsMax:       s?.rateLimitAnalyticsMax       || 400,
      rateLimitUploadsWindowMs:    s?.rateLimitUploadsWindowMs    || 60000,
      rateLimitUploadsMax:         s?.rateLimitUploadsMax         || 180,
      loginLockoutThreshold:       s?.loginLockoutThreshold       || 10,
      loginLockoutMinutes:         s?.loginLockoutMinutes         || 5,
      maxAlbumsPerUser:            s?.maxAlbumsPerUser            || 50,
      maxPhotosPerAlbum:           s?.maxPhotosPerAlbum           || 500,
      maxOrdersPerDay:             s?.maxOrdersPerDay             || 15,
      maxConcurrentPdfGenerations: s?.maxConcurrentPdfGenerations || 6,
      maxUploadFileSizeMb:         s?.maxUploadFileSizeMb         || 25,
      allowedUploadMimeTypes:      (s?.allowedUploadMimeTypes || ['image/jpeg','image/png','image/webp','image/gif']).join(', '),
    },
  });

  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [savingDesigns, setSavingDesigns] = useState(false);
  const [designsSaved, setDesignsSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (s?.hiddenDesignIds) {
      setHiddenIds(new Set(s.hiddenDesignIds as string[]));
    }
  }, [s?.hiddenDesignIds]);

  const toggleDesign = (id: string) => {
    setHiddenIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setDesignsSaved(false);
  };

  const invalidateSettings = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getGetAdminSettingsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetAppSettingsQueryKey() }),
    ]);
  };

  const saveDesignVisibility = async () => {
    setSavingDesigns(true);
    setSaveError(null);
    try {
      await updateSettings.mutateAsync({
        data: { hiddenDesignIds: Array.from(hiddenIds) } as any,
      });
      await invalidateSettings();
      setDesignsSaved(true);
      setTimeout(() => setDesignsSaved(false), 2500);
    } catch (err: any) {
      setSaveError(err?.data?.error || err?.message || 'Failed to save design visibility.');
    } finally {
      setSavingDesigns(false);
    }
  };

  const onSubmit = async (values: any) => {
    setSaveError(null);
    try {
      await updateSettings.mutateAsync({ data: {
        ...values,
        basePriceLek:       Number(values.basePriceLek),
        minPages:           Number(values.minPages),
        extraSpreadPriceLek:Number(values.extraSpreadPriceLek),
        maintenanceMode:    Boolean(values.maintenanceMode),
        bookCreationEnabled:Boolean(values.bookCreationEnabled),
        requireLoginForPdf: Boolean(values.requireLoginForPdf),
        pendingBooksLimitEnabled: Boolean(values.pendingBooksLimitEnabled),
        pendingBooksLimit:        Number(values.pendingBooksLimit),
        rateLimitGeneralWindowMs:    Number(values.rateLimitGeneralWindowMs),
        rateLimitGeneralMax:         Number(values.rateLimitGeneralMax),
        rateLimitAuthWindowMs:       Number(values.rateLimitAuthWindowMs),
        rateLimitAuthMax:            Number(values.rateLimitAuthMax),
        rateLimitAnalyticsWindowMs:  Number(values.rateLimitAnalyticsWindowMs),
        rateLimitAnalyticsMax:       Number(values.rateLimitAnalyticsMax),
        rateLimitUploadsWindowMs:    Number(values.rateLimitUploadsWindowMs),
        rateLimitUploadsMax:         Number(values.rateLimitUploadsMax),
        loginLockoutThreshold:       Number(values.loginLockoutThreshold),
        loginLockoutMinutes:         Number(values.loginLockoutMinutes),
        maxAlbumsPerUser:            Number(values.maxAlbumsPerUser),
        maxPhotosPerAlbum:           Number(values.maxPhotosPerAlbum),
        maxOrdersPerDay:             Number(values.maxOrdersPerDay),
        maxConcurrentPdfGenerations: Number(values.maxConcurrentPdfGenerations),
        maxUploadFileSizeMb:         Number(values.maxUploadFileSizeMb),
        allowedUploadMimeTypes:      String(values.allowedUploadMimeTypes || '')
          .split(',').map((t: string) => t.trim()).filter(Boolean),
        hiddenDesignIds: Array.from(hiddenIds),
      }});
      await invalidateSettings();
      setSaved(true);
      setDesignsSaved(true);
      setTimeout(() => { setSaved(false); setDesignsSaved(false); }, 2500);
    } catch (err: any) {
      setSaveError(err?.data?.error || err?.message || 'Failed to save settings.');
    }
  };

  const designCatalog = useMemo(
    () => buildDesignCatalog(
      (s?.designOverrides && typeof s.designOverrides === 'object' && !Array.isArray(s.designOverrides))
        ? s.designOverrides
        : {},
      parseCustomDesigns(s?.customDesigns),
    ),
    [s?.designOverrides, s?.customDesigns],
  );

  const designsByCategory = useMemo(() => {
    const present = [...new Set(designCatalog.map(d => d.category))];
    const order = [
      ...CATEGORY_ORDER.filter(c => present.includes(c)),
      ...present.filter(c => !CATEGORY_ORDER.includes(c)),
    ];
    return order.map(cat => ({
      cat,
      label: DESIGN_CATEGORY_LABELS[cat]?.en || cat,
      designs: designCatalog.filter(d => d.category === cat),
    }));
  }, [designCatalog]);

  const maintenanceOn  = form.watch('maintenanceMode');
  const bookEnabled    = form.watch('bookCreationEnabled');
  const pendingLimitOn = form.watch('pendingBooksLimitEnabled');

  const cardClass = 'rounded-2xl p-5 sm:p-6 shadow-sm';
  const cardStyle = { background: ADMIN.card, border: `1px solid ${ADMIN.line}` };

  return (
    <AdminLayout>
      <div className="p-5 md:p-8 max-w-4xl mx-auto pb-28">
        <div className="mb-8">
          <p className="text-[10px] font-semibold tracking-[0.18em] uppercase mb-1.5" style={{ color: ADMIN.blush }}>
            Configuration
          </p>
          <h1 className="text-3xl font-serif font-semibold mb-1" style={{ color: ADMIN.ink }}>Settings</h1>
          <p className="text-sm" style={{ color: ADMIN.muted }}>
            Site-wide controls. Changes apply immediately after save.
          </p>
        </div>

        {saveError && (
          <div
            className="mb-5 flex items-start gap-2.5 rounded-2xl px-4 py-3 text-sm"
            style={{ background: '#FDF2F2', border: '1px solid #F0C9C9', color: '#8B3A3A' }}
          >
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-medium">{saveError}</p>
              <button type="button" className="underline text-xs mt-1 opacity-80" onClick={() => setSaveError(null)}>
                Dismiss
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4">{[1,2,3].map(i=><div key={i} className="h-32 animate-pulse rounded-2xl" style={{ background: ADMIN.blushSoft }}/>)}</div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

              <div className={cardClass} style={cardStyle}>
                <SectionHeader icon={Settings} title="General" desc="Site name and contact details." />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <FormField control={form.control} name="siteName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Site Name</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="whatsappNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel>WhatsApp Number</FormLabel>
                      <FormControl><Input {...field} placeholder="+355..." /></FormControl>
                      <FormDescription>Include country code</FormDescription>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="siteTaglineAl" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tagline — Albanian (SQ)</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="siteTaglineEn" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tagline — English (EN)</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                    </FormItem>
                  )} />
                </div>
              </div>

              <div className={cardClass} style={cardStyle}>
                <SectionHeader icon={DollarSign} title="Pricing Fallbacks" desc="Used when a book size has no price of its own. Per-size pricing wins when set." />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-5">
                  <FormField control={form.control} name="basePriceLek" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base Price (LEK)</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="minPages" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base Pages Included</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="extraSpreadPriceLek" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Extra Spread Price (LEK)</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormDescription>Per 2 extra pages</FormDescription>
                    </FormItem>
                  )} />
                </div>
                <div className="p-4 rounded-2xl" style={{ background: ADMIN.bg, border: `1px solid ${ADMIN.line}` }}>
                  <p className="text-[10px] font-semibold tracking-[0.14em] uppercase mb-2.5" style={{ color: ADMIN.muted }}>
                    Live price preview
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {[20,30,40,50,60,80].map(pages => {
                      const base  = Number(form.watch('basePriceLek') || 3100);
                      const minPg = Number(form.watch('minPages') || 24);
                      const extra = Number(form.watch('extraSpreadPriceLek') || 100);
                      const extraSpreads = Math.max(0, Math.ceil((pages - minPg) / 2));
                      const total = base + extraSpreads * extra;
                      return (
                        <div key={pages} className="text-center p-2.5 rounded-xl bg-white" style={{ border: `1px solid ${ADMIN.line}` }}>
                          <p className="text-[10px] mb-0.5" style={{ color: ADMIN.muted }}>{pages}p</p>
                          <p className="text-xs font-semibold font-mono" style={{ color: ADMIN.ink }}>{total.toLocaleString()}</p>
                          <p className="text-[9px]" style={{ color: ADMIN.muted }}>LEK</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div
                className={cardClass}
                style={{
                  ...cardStyle,
                  ...(maintenanceOn ? { borderColor: '#E8C48A', background: '#FDF8F0' } : {}),
                }}
              >
                <SectionHeader icon={Wrench} title="Maintenance Mode" desc="When ON, visitors see a maintenance page. Admins keep full access." />
                <FormField control={form.control} name="maintenanceMode" render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-white mb-5" style={{ border: `1px solid ${ADMIN.line}` }}>
                      <div className="min-w-0">
                        <FormLabel className="text-base cursor-pointer">Maintenance Mode</FormLabel>
                        <FormDescription>Redirect non-admin visitors to the maintenance page.</FormDescription>
                      </div>
                      <FormControl>
                        <Toggle checked={!!field.value} onChange={field.onChange} />
                      </FormControl>
                    </div>
                  </FormItem>
                )} />
                {maintenanceOn && (
                  <div className="flex items-center gap-2 p-3 rounded-2xl bg-amber-100/80 border border-amber-200 mb-5 text-amber-900 text-sm">
                    <AlertTriangle size={15} className="shrink-0" />
                    <span>Maintenance is <strong>ON</strong> — visitors see the maintenance page now.</span>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <FormField control={form.control} name="maintenanceMessageAl" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message — Albanian (SQ)</FormLabel>
                      <FormControl>
                        <textarea {...field} rows={3} placeholder="Jemi duke bërë mirëmbajtje…"
                          className="w-full rounded-xl border bg-white px-3 py-2 text-sm resize-none focus:outline-none"
                          style={{ borderColor: ADMIN.line }} />
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="maintenanceMessageEn" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message — English (EN)</FormLabel>
                      <FormControl>
                        <textarea {...field} rows={3} placeholder="We're performing maintenance…"
                          className="w-full rounded-xl border bg-white px-3 py-2 text-sm resize-none focus:outline-none"
                          style={{ borderColor: ADMIN.line }} />
                      </FormControl>
                    </FormItem>
                  )} />
                </div>
              </div>

              <div
                className={cardClass}
                style={{
                  ...cardStyle,
                  ...(!bookEnabled ? { borderColor: '#E8B4B4', background: '#FDF6F6' } : {}),
                }}
              >
                <SectionHeader icon={bookEnabled ? BookHeart : BookX} title="Book Creation" desc="Control whether visitors can create new photobooks." />
                <FormField control={form.control} name="bookCreationEnabled" render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-white mb-5" style={{ border: `1px solid ${ADMIN.line}` }}>
                      <div className="min-w-0">
                        <FormLabel className="text-base cursor-pointer">Book Creation Enabled</FormLabel>
                        <FormDescription>When OFF, the wizard shows a notice instead of the editor.</FormDescription>
                      </div>
                      <FormControl>
                        <Toggle checked={!!field.value} onChange={field.onChange} />
                      </FormControl>
                    </div>
                  </FormItem>
                )} />
                <FormField control={form.control} name="requireLoginForPdf" render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-white mb-5" style={{ border: `1px solid ${ADMIN.line}` }}>
                      <div className="min-w-0">
                        <FormLabel className="text-base cursor-pointer flex items-center gap-2">
                          <FileLock2 size={14} style={{ color: ADMIN.blush }} />
                          Require login for PDF download
                        </FormLabel>
                        <FormDescription>When ON, customers must be signed in to download their album PDF.</FormDescription>
                      </div>
                      <FormControl>
                        <Toggle checked={!!field.value} onChange={field.onChange} />
                      </FormControl>
                    </div>
                  </FormItem>
                )} />
                {!bookEnabled && (
                  <div className="flex items-center gap-2 p-3 rounded-2xl bg-red-50 border border-red-200 mb-5 text-red-800 text-sm">
                    <BookX size={15} className="shrink-0" />
                    <span>Book creation is <strong>disabled</strong>.</span>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <FormField control={form.control} name="bookDisabledNoticeAl" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notice — Albanian (SQ)</FormLabel>
                      <FormControl>
                        <textarea {...field} rows={3} className="w-full rounded-xl border bg-white px-3 py-2 text-sm resize-none focus:outline-none" style={{ borderColor: ADMIN.line }} />
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="bookDisabledNoticeEn" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notice — English (EN)</FormLabel>
                      <FormControl>
                        <textarea {...field} rows={3} className="w-full rounded-xl border bg-white px-3 py-2 text-sm resize-none focus:outline-none" style={{ borderColor: ADMIN.line }} />
                      </FormControl>
                    </FormItem>
                  )} />
                </div>
              </div>

              <div className={cardClass} style={cardStyle}>
                <SectionHeader icon={ShieldAlert} title="Pending Books Limit" desc="Cap unordered photobooks a user can keep in progress." />
                <FormField control={form.control} name="pendingBooksLimitEnabled" render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-white mb-5" style={{ border: `1px solid ${ADMIN.line}` }}>
                      <div className="min-w-0">
                        <FormLabel className="text-base cursor-pointer">Limit Enabled</FormLabel>
                        <FormDescription>Block new albums once a user hits the pending limit.</FormDescription>
                      </div>
                      <FormControl>
                        <Toggle checked={!!field.value} onChange={field.onChange} />
                      </FormControl>
                    </div>
                  </FormItem>
                )} />
                <FormField control={form.control} name="pendingBooksLimit" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max pending photobooks per user</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min={1} step={1} disabled={!pendingLimitOn} className="max-w-[160px]" />
                    </FormControl>
                  </FormItem>
                )} />
              </div>

              <div className={cardClass} style={cardStyle}>
                <SectionHeader icon={ShieldAlert} title="Security & Limits" desc="Rate limits, lockout, and abuse caps. Admins are exempt." />
                <p className="text-[10px] font-semibold tracking-[0.14em] uppercase mb-3" style={{ color: ADMIN.muted }}>Rate limits (per IP)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  {([
                    ['rateLimitGeneralWindowMs', 'General window (ms)'],
                    ['rateLimitGeneralMax', 'General max requests'],
                    ['rateLimitAuthWindowMs', 'Auth window (ms)'],
                    ['rateLimitAuthMax', 'Auth max requests'],
                    ['rateLimitAnalyticsWindowMs', 'Analytics window (ms)'],
                    ['rateLimitAnalyticsMax', 'Analytics max'],
                    ['rateLimitUploadsWindowMs', 'Uploads window (ms)'],
                    ['rateLimitUploadsMax', 'Uploads max'],
                  ] as const).map(([name, label]) => (
                    <FormField key={name} control={form.control} name={name} render={({ field }) => (
                      <FormItem><FormLabel>{label}</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                    )} />
                  ))}
                </div>
                <p className="text-[10px] font-semibold tracking-[0.14em] uppercase mb-3" style={{ color: ADMIN.muted }}>Login lockout</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  <FormField control={form.control} name="loginLockoutThreshold" render={({ field }) => (
                    <FormItem><FormLabel>Failed attempts before lockout</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="loginLockoutMinutes" render={({ field }) => (
                    <FormItem><FormLabel>Lockout duration (minutes)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                  )} />
                </div>
                <p className="text-[10px] font-semibold tracking-[0.14em] uppercase mb-3" style={{ color: ADMIN.muted }}>Abuse caps</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  {([
                    ['maxAlbumsPerUser', 'Max albums / user'],
                    ['maxPhotosPerAlbum', 'Max photos / album'],
                    ['maxOrdersPerDay', 'Max orders / day'],
                    ['maxConcurrentPdfGenerations', 'Max concurrent PDFs'],
                  ] as const).map(([name, label]) => (
                    <FormField key={name} control={form.control} name={name} render={({ field }) => (
                      <FormItem><FormLabel>{label}</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                    )} />
                  ))}
                </div>
                <p className="text-[10px] font-semibold tracking-[0.14em] uppercase mb-3" style={{ color: ADMIN.muted }}>Uploads</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="maxUploadFileSizeMb" render={({ field }) => (
                    <FormItem><FormLabel>Max upload size (MB)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="allowedUploadMimeTypes" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Allowed image types</FormLabel>
                      <FormControl><Input {...field} placeholder="image/jpeg, image/png, image/webp" /></FormControl>
                    </FormItem>
                  )} />
                </div>
              </div>

              <div
                className="fixed bottom-0 left-0 right-0 lg:left-[15.5rem] z-20 px-4 py-3 backdrop-blur-md"
                style={{ background: 'rgba(251,247,245,0.94)', borderTop: `1px solid ${ADMIN.line}` }}
              >
                <div className="max-w-4xl mx-auto flex items-center gap-3">
                  <Button
                    type="submit"
                    disabled={updateSettings.isPending}
                    className="rounded-2xl px-6 text-white hover:opacity-90"
                    style={{ background: ADMIN.blush }}
                  >
                    {updateSettings.isPending ? 'Saving…' : 'Save settings'}
                  </Button>
                  {saved && (
                    <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: '#3D7A5A' }}>
                      <Check size={14} /> Saved
                    </span>
                  )}
                </div>
              </div>
            </form>
          </Form>
        )}

        <div className={`${cardClass} mt-5`} style={cardStyle}>
          <SectionHeader
            icon={Palette}
            title="Design Visibility"
            desc={`${hiddenIds.size > 0 ? `${hiddenIds.size} hidden.` : 'All visible.'} Also included when you tap Save settings.`}
          />
          {!isLoading && (
            <div className="space-y-6">
              {designsByCategory.map(({ cat, label, designs }) => (
                designs.length === 0 ? null : (
                  <div key={cat}>
                    <p className="text-[10px] font-semibold tracking-[0.14em] uppercase mb-3" style={{ color: ADMIN.muted }}>{label}</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5">
                      {designs.map(d => {
                        const hidden = hiddenIds.has(d.id);
                        return (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => toggleDesign(d.id)}
                            className={`group relative rounded-2xl overflow-hidden border-2 transition-all ${hidden ? 'opacity-45 grayscale' : ''}`}
                            style={{ aspectRatio: '3/4', borderColor: hidden ? ADMIN.line : 'transparent' }}
                            title={hidden ? `Show "${d.name.en}"` : `Hide "${d.name.en}"`}
                          >
                            {(() => {
                              const els = designFrontElements(d);
                              return els.length > 0 ? (
                                <div className="absolute inset-0">
                                  <ResponsivePageThumb elements={els} className="absolute inset-0" />
                                </div>
                              ) : (
                                <div className="absolute inset-0" style={d.thumb} />
                              );
                            })()}
                            <div className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center ${
                              hidden ? 'bg-neutral-700/80' : 'bg-black/40 opacity-0 group-hover:opacity-100'
                            }`}>
                              {hidden ? <EyeOff size={9} className="text-white" /> : <Eye size={9} className="text-white" />}
                            </div>
                            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent pt-4 pb-1.5 px-1.5">
                              <p className="text-white text-[8px] font-medium truncate">{d.name.en}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3 mt-5 pt-5" style={{ borderTop: `1px solid ${ADMIN.line}` }}>
            <Button type="button" variant="outline" onClick={saveDesignVisibility} disabled={savingDesigns} className="rounded-2xl">
              {savingDesigns ? 'Saving…' : 'Save visibility only'}
            </Button>
            {designsSaved && (
              <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: '#3D7A5A' }}>
                <Check size={14} /> Saved
              </span>
            )}
            {hiddenIds.size > 0 && (
              <button type="button" onClick={() => { setHiddenIds(new Set()); setDesignsSaved(false); }}
                className="text-xs underline underline-offset-2" style={{ color: ADMIN.muted }}>
                Show all
              </button>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
