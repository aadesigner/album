import React from 'react';
import { AdminLayout, ADMIN } from '@/components/layout/AdminLayout';
import { Link, Redirect, useRoute } from 'wouter';
import { ExternalLink } from 'lucide-react';
import { PAGE_META, isPageSlug } from '@/lib/marketingPages';
import { setLiveAdminEdit } from '@/components/marketing/LivePageRoot';

export default function SitePages() {
  const [, params] = useRoute('/heyadmin/site/:page');
  const slug = params?.page && isPageSlug(params.page) ? params.page : null;
  if (slug) {
    const meta = PAGE_META.find((p) => p.slug === slug);
    if (meta) {
      setLiveAdminEdit(true);
      return <Redirect to={meta.path} />;
    }
  }
  return <SitePageIndex />;
}

function SitePageIndex() {
  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto px-5 py-10">
        <p className="text-[10px] uppercase tracking-[0.18em] font-semibold mb-2" style={{ color: ADMIN.muted }}>
          Marketing
        </p>
        <h1 className="font-serif text-3xl font-medium mb-2" style={{ color: ADMIN.ink }}>Site pages</h1>
        <p className="text-sm mb-8 max-w-lg" style={{ color: ADMIN.muted }}>
          Open the live page, then tap the pencil on the right. Click headlines, photos, and sections inside the page. The offer bar, navigation, and footer stay as they are — change those in Settings. Albanian and English save together.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {PAGE_META.map((p) => (
            <Link
              key={p.slug}
              href={p.path}
              onClick={() => setLiveAdminEdit(true)}
            >
              <div
                className="rounded-2xl p-5 border hover:shadow-sm transition-shadow cursor-pointer"
                style={{ borderColor: ADMIN.line, background: ADMIN.card }}
              >
                <p className="font-serif text-lg font-medium" style={{ color: ADMIN.ink }}>{p.label}</p>
                <p className="text-[12px] mt-1 inline-flex items-center gap-1" style={{ color: ADMIN.muted }}>
                  {p.path} <ExternalLink size={11} />
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
