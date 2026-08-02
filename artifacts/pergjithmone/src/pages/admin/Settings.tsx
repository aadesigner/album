import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useGetAdminSettings, useUpdateAdminSettings } from '@workspace/api-client-react-tsconfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription } from '@/components/ui/form';
import { DESIGN_METAS, DESIGN_CATEGORY_LABELS } from '@/lib/designMeta';
import { Eye, EyeOff, Check, AlertTriangle, BookX, BookHeart, Settings, Wrench, DollarSign, Palette, ShieldAlert } from 'lucide-react';

// ── helpers ──────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
        checked ? 'bg-neutral-900' : 'bg-neutral-200'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

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

const CATEGORY_ORDER = ['Wedding','Travel','Baby & Family','Celebration','Modern','Portrait','Nature'];

export default function AdminSettings() {
  const { data: settings, isLoading } = useGetAdminSettings();
  const updateSettings = useUpdateAdminSettings();
  const s = settings as any;

  // ── Main form (scalar fields) ─────────────────────────────────────────────
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
      pendingBooksLimitEnabled: s?.pendingBooksLimitEnabled ?? true,
      pendingBooksLimit:        s?.pendingBooksLimit        || 3,
      // Security & Limits
      rateLimitGeneralWindowMs:    s?.rateLimitGeneralWindowMs    || 900000,
      rateLimitGeneralMax:         s?.rateLimitGeneralMax         || 300,
      rateLimitAuthWindowMs:       s?.rateLimitAuthWindowMs       || 900000,
      rateLimitAuthMax:            s?.rateLimitAuthMax            || 20,
      rateLimitAnalyticsWindowMs:  s?.rateLimitAnalyticsWindowMs  || 60000,
      rateLimitAnalyticsMax:       s?.rateLimitAnalyticsMax       || 120,
      rateLimitUploadsWindowMs:    s?.rateLimitUploadsWindowMs    || 60000,
      rateLimitUploadsMax:         s?.rateLimitUploadsMax         || 30,
      loginLockoutThreshold:       s?.loginLockoutThreshold       || 5,
      loginLockoutMinutes:         s?.loginLockoutMinutes         || 15,
      maxAlbumsPerUser:            s?.maxAlbumsPerUser            || 20,
      maxPhotosPerAlbum:           s?.maxPhotosPerAlbum           || 300,
      maxOrdersPerDay:             s?.maxOrdersPerDay             || 5,
      maxConcurrentPdfGenerations: s?.maxConcurrentPdfGenerations || 3,
      maxUploadFileSizeMb:         s?.maxUploadFileSizeMb         || 20,
      allowedUploadMimeTypes:      (s?.allowedUploadMimeTypes || ['image/jpeg','image/png','image/webp','image/gif']).join(', '),
    },
  });

  // ── Design visibility (separate local state) ──────────────────────────────
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [savingDesigns, setSavingDesigns] = useState(false);
  const [designsSaved, setDesignsSaved] = useState(false);

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

  const saveDesignVisibility = async () => {
    setSavingDesigns(true);
    try {
      await updateSettings.mutateAsync({
        data: { hiddenDesignIds: JSON.stringify(Array.from(hiddenIds)) } as any,
      });
      setDesignsSaved(true);
      setTimeout(() => setDesignsSaved(false), 2500);
    } finally {
      setSavingDesigns(false);
    }
  };

  // ── Main form submit ───────────────────────────────────────────────────────
  const [saved, setSaved] = useState(false);
  const onSubmit = async (values: any) => {
    try {
      await updateSettings.mutateAsync({ data: {
        ...values,
        basePriceLek:       Number(values.basePriceLek),
        minPages:           Number(values.minPages),
        extraSpreadPriceLek:Number(values.extraSpreadPriceLek),
        maintenanceMode:    Boolean(values.maintenanceMode),
        bookCreationEnabled:Boolean(values.bookCreationEnabled),
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
          .split(',').map((s: string) => s.trim()).filter(Boolean),
      }});
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) { console.error(e); }
  };

  // ── Designs grouped by category ───────────────────────────────────────────
  const designsByCategory = CATEGORY_ORDER.map(cat => ({
    cat,
    label: DESIGN_CATEGORY_LABELS[cat]?.en || cat,
    designs: DESIGN_METAS.filter(d => d.category === cat),
  }));

  const maintenanceOn  = form.watch('maintenanceMode');
  const bookEnabled    = form.watch('bookCreationEnabled');
  const pendingLimitOn = form.watch('pendingBooksLimitEnabled');

  return (
    <AdminLayout>
      <div className="p-6 md:p-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-serif mb-1">Platform Settings</h1>
          <p className="text-muted-foreground text-sm">Manage site-wide configuration. Changes take effect immediately.</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">{[1,2,3].map(i=><div key={i} className="h-32 bg-neutral-100 animate-pulse rounded-xl"/>)}</div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

              {/* ── GENERAL ────────────────────────────────────────────────── */}
              <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
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
                      <FormDescription>Shown under the brand name in the site footer</FormDescription>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="siteTaglineEn" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tagline — English (EN)</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormDescription>Shown under the brand name in the site footer</FormDescription>
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* ── PRICING ────────────────────────────────────────────────── */}
              <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <SectionHeader icon={DollarSign} title="Pricing Fallbacks" desc="Used only when a book size (see Book Sizes) doesn't define its own price, spread price, or minimum pages. Per-size pricing always wins when set." />
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
                {/* Live calculator */}
                <div className="p-4 rounded-lg border border-border bg-muted/40">
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">💰 Live price preview</p>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {[20,30,40,50,60,80].map(pages => {
                      const base  = Number(form.watch('basePriceLek') || 3100);
                      const minPg = Number(form.watch('minPages') || 24);
                      const extra = Number(form.watch('extraSpreadPriceLek') || 100);
                      const extraSpreads = Math.max(0, Math.ceil((pages - minPg) / 2));
                      const total = base + extraSpreads * extra;
                      return (
                        <div key={pages} className="text-center p-2 rounded-lg bg-background border border-border">
                          <p className="text-[10px] text-muted-foreground mb-0.5">{pages}p</p>
                          <p className="text-xs font-semibold font-mono">{total.toLocaleString()}</p>
                          <p className="text-[9px] text-muted-foreground">LEK</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ── MAINTENANCE ────────────────────────────────────────────── */}
              <div className={`bg-card border rounded-xl p-6 shadow-sm transition-colors ${maintenanceOn ? 'border-amber-400 bg-amber-50/40' : 'border-border'}`}>
                <SectionHeader icon={Wrench} title="Maintenance Mode" desc="When ON, all visitors see a maintenance page. Admins still have full access." />

                <FormField control={form.control} name="maintenanceMode" render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-background mb-5">
                      <div>
                        <FormLabel className="text-base cursor-pointer">Maintenance Mode</FormLabel>
                        <FormDescription>Redirect all non-admin visitors to the maintenance page.</FormDescription>
                      </div>
                      <FormControl>
                        <Toggle checked={!!field.value} onChange={field.onChange} />
                      </FormControl>
                    </div>
                  </FormItem>
                )} />

                {maintenanceOn && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-100 border border-amber-300 mb-5 text-amber-800 text-sm">
                    <AlertTriangle size={15} className="shrink-0" />
                    <span>Maintenance mode is <strong>ON</strong>. Visitors are seeing the maintenance page right now.</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <FormField control={form.control} name="maintenanceMessageAl" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message — Albanian (SQ)</FormLabel>
                      <FormControl>
                        <textarea
                          {...field}
                          rows={3}
                          placeholder="Jemi duke bërë mirëmbajtje. Do të kthehemi së shpejti."
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                        />
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="maintenanceMessageEn" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message — English (EN)</FormLabel>
                      <FormControl>
                        <textarea
                          {...field}
                          rows={3}
                          placeholder="We're performing maintenance. We'll be back soon."
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                        />
                      </FormControl>
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* ── BOOK CREATION ──────────────────────────────────────────── */}
              <div className={`bg-card border rounded-xl p-6 shadow-sm transition-colors ${!bookEnabled ? 'border-red-300 bg-red-50/30' : 'border-border'}`}>
                <SectionHeader icon={bookEnabled ? BookHeart : BookX} title="Book Creation" desc="Control whether visitors can create new photobooks." />

                <FormField control={form.control} name="bookCreationEnabled" render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-background mb-5">
                      <div>
                        <FormLabel className="text-base cursor-pointer">Book Creation Enabled</FormLabel>
                        <FormDescription>When OFF, the wizard shows a notice instead of the editor flow.</FormDescription>
                      </div>
                      <FormControl>
                        <Toggle checked={!!field.value} onChange={field.onChange} />
                      </FormControl>
                    </div>
                  </FormItem>
                )} />

                {!bookEnabled && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-100 border border-red-300 mb-5 text-red-800 text-sm">
                    <BookX size={15} className="shrink-0" />
                    <span>Book creation is <strong>disabled</strong>. Visitors cannot create new albums.</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <FormField control={form.control} name="bookDisabledNoticeAl" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notice — Albanian (SQ)</FormLabel>
                      <FormControl>
                        <textarea
                          {...field}
                          rows={3}
                          placeholder="Krijimi i albumeve është përkohësisht i ndalur."
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                        />
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="bookDisabledNoticeEn" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notice — English (EN)</FormLabel>
                      <FormControl>
                        <textarea
                          {...field}
                          rows={3}
                          placeholder="Book creation is temporarily unavailable."
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                        />
                      </FormControl>
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* ── ABUSE PROTECTION: PENDING BOOKS LIMIT ────────────────────── */}
              <div className={`bg-card border rounded-xl p-6 shadow-sm transition-colors ${pendingLimitOn ? 'border-border' : 'border-border'}`}>
                <SectionHeader icon={ShieldAlert} title="Pending Books Limit" desc="Cap how many unordered photobooks a single user can have in progress at once, to prevent abuse." />

                <FormField control={form.control} name="pendingBooksLimitEnabled" render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-background mb-5">
                      <div>
                        <FormLabel className="text-base cursor-pointer">Limit Enabled</FormLabel>
                        <FormDescription>When ON, a user is blocked from starting a new photobook once they hit the limit below, until they order or finish an existing one.</FormDescription>
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
                      <Input
                        {...field}
                        type="number"
                        min={1}
                        step={1}
                        disabled={!pendingLimitOn}
                        className="max-w-[160px]"
                      />
                    </FormControl>
                    <FormDescription>"Pending" = any book with status other than ordered (draft, generating PDF, or ready to order).</FormDescription>
                  </FormItem>
                )} />
              </div>

              {/* ── SECURITY & LIMITS ─────────────────────────────────────── */}
              <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <SectionHeader icon={ShieldAlert} title="Security & Limits" desc="Rate limits, login lockout, and abuse caps. Changes apply within ~15 seconds, no restart needed." />

                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Rate limits (per IP)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
                  <FormField control={form.control} name="rateLimitGeneralWindowMs" render={({ field }) => (
                    <FormItem><FormLabel>General window (ms)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="rateLimitGeneralMax" render={({ field }) => (
                    <FormItem><FormLabel>General max requests</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="rateLimitAuthWindowMs" render={({ field }) => (
                    <FormItem><FormLabel>Auth window (ms)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="rateLimitAuthMax" render={({ field }) => (
                    <FormItem><FormLabel>Auth max requests</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="rateLimitAnalyticsWindowMs" render={({ field }) => (
                    <FormItem><FormLabel>Analytics window (ms)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="rateLimitAnalyticsMax" render={({ field }) => (
                    <FormItem><FormLabel>Analytics max requests</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="rateLimitUploadsWindowMs" render={({ field }) => (
                    <FormItem><FormLabel>Uploads window (ms)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="rateLimitUploadsMax" render={({ field }) => (
                    <FormItem><FormLabel>Uploads max requests</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                  )} />
                </div>

                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Login lockout (per account)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
                  <FormField control={form.control} name="loginLockoutThreshold" render={({ field }) => (
                    <FormItem><FormLabel>Failed attempts before lockout</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="loginLockoutMinutes" render={({ field }) => (
                    <FormItem><FormLabel>Lockout duration (minutes)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                  )} />
                </div>

                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Abuse caps</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
                  <FormField control={form.control} name="maxAlbumsPerUser" render={({ field }) => (
                    <FormItem><FormLabel>Max albums / user</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="maxPhotosPerAlbum" render={({ field }) => (
                    <FormItem><FormLabel>Max photos / album</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="maxOrdersPerDay" render={({ field }) => (
                    <FormItem><FormLabel>Max orders / day / user</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="maxConcurrentPdfGenerations" render={({ field }) => (
                    <FormItem><FormLabel>Max concurrent PDF renders</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                  )} />
                </div>

                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Uploads</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <FormField control={form.control} name="maxUploadFileSizeMb" render={({ field }) => (
                    <FormItem><FormLabel>Max upload size (MB)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="allowedUploadMimeTypes" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Allowed image types</FormLabel>
                      <FormControl><Input {...field} placeholder="image/jpeg, image/png, image/webp, image/gif" /></FormControl>
                      <FormDescription>Comma-separated MIME types. Files are verified by real content, not just their name.</FormDescription>
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* ── SAVE MAIN SETTINGS ─────────────────────────────────────── */}
              <div className="flex items-center gap-3">
                <Button type="submit" disabled={updateSettings.isPending}>
                  {updateSettings.isPending ? 'Saving...' : 'Save Settings'}
                </Button>
                {saved && (
                  <span className="flex items-center gap-1.5 text-sm text-green-700 font-medium">
                    <Check size={14} /> Saved
                  </span>
                )}
              </div>

            </form>
          </Form>
        )}

        {/* ── DESIGN VISIBILITY ──────────────────────────────────────────── */}
        <div className="mt-6 bg-card border border-border rounded-xl p-6 shadow-sm">
          <SectionHeader
            icon={Palette}
            title="Design Visibility"
            desc={`Show or hide individual designs in the wizard. ${hiddenIds.size > 0 ? `${hiddenIds.size} hidden.` : 'All visible.'}`}
          />

          {isLoading ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {Array.from({length:10}).map((_,i)=><div key={i} className="h-24 bg-neutral-100 animate-pulse rounded-lg"/>)}
            </div>
          ) : (
            <div className="space-y-6">
              {designsByCategory.map(({ cat, label, designs }) => (
                <div key={cat}>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">{label}</p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5">
                    {designs.map(d => {
                      const hidden = hiddenIds.has(d.id);
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => toggleDesign(d.id)}
                          className={`group relative rounded-xl overflow-hidden border-2 transition-all duration-150 focus:outline-none ${
                            hidden
                              ? 'border-neutral-200 opacity-45 grayscale'
                              : 'border-transparent hover:border-neutral-300'
                          }`}
                          title={hidden ? `Show "${d.name.en}"` : `Hide "${d.name.en}"`}
                          style={{ aspectRatio: '3/4' }}
                        >
                          {/* Thumbnail */}
                          {d.thumbPhoto ? (
                            <img
                              src={d.thumbPhoto}
                              alt={d.name.en}
                              loading="lazy"
                              decoding="async"
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                          ) : (
                            <div className="absolute inset-0" style={d.thumb} />
                          )}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />

                          {/* Eye toggle chip */}
                          <div className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                            hidden ? 'bg-neutral-700/80' : 'bg-black/40 opacity-0 group-hover:opacity-100'
                          }`}>
                            {hidden
                              ? <EyeOff size={9} className="text-white" />
                              : <Eye size={9} className="text-white" />
                            }
                          </div>

                          {/* Name */}
                          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent pt-4 pb-1.5 px-1.5">
                            <p className="text-white text-[8px] font-medium leading-tight truncate">{d.name.en}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3 mt-5 pt-5 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={saveDesignVisibility}
              disabled={savingDesigns}
            >
              {savingDesigns ? 'Saving...' : 'Save Design Visibility'}
            </Button>
            {designsSaved && (
              <span className="flex items-center gap-1.5 text-sm text-green-700 font-medium">
                <Check size={14} /> Saved
              </span>
            )}
            {hiddenIds.size > 0 && (
              <button
                type="button"
                onClick={() => { setHiddenIds(new Set()); setDesignsSaved(false); }}
                className="text-xs text-muted-foreground hover:text-neutral-700 underline underline-offset-2"
              >
                Show all
              </button>
            )}
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}
