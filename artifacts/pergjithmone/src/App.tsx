import React, { useEffect, lazy, Suspense } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';

import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useGetAppSettings } from '@workspace/api-client-react-tsconfig';
import { useAuth } from '@/contexts/AuthContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useLanguage } from '@/contexts/LanguageContext';

// ── Eagerly loaded (critical path / tiny) ─────────────────────────────────
import Home from '@/pages/Home';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import NotFound from '@/pages/not-found';
import Maintenance from '@/pages/Maintenance';
import Wizard from '@/pages/Wizard';

// ── Lazy loaded (heavy pages not needed on first paint) ────────────────────
const Pricing       = lazy(() => import('@/pages/Pricing'));
const ForgotPassword= lazy(() => import('@/pages/ForgotPassword'));
const HowItWorks    = lazy(() => import('@/pages/HowItWorks'));
const FAQ           = lazy(() => import('@/pages/FAQ'));
const Projects      = lazy(() => import('@/pages/Projects'));
const Orders        = lazy(() => import('@/pages/Orders'));
const Profile       = lazy(() => import('@/pages/Profile'));
const Editor        = lazy(() => import('@/pages/Editor'));
const AlbumAI        = lazy(() => import('@/pages/AlbumAI'));
const Examples      = lazy(() => import('@/pages/Examples'));
const About         = lazy(() => import('@/pages/About'));
const Contact       = lazy(() => import('@/pages/Contact'));
const Terms         = lazy(() => import('@/pages/Terms'));
const Privacy       = lazy(() => import('@/pages/Privacy'));

// Admin pages — all lazy (rarely visited, heavy)
const AdminDashboard  = lazy(() => import('@/pages/admin/Dashboard'));
const AdminOrders     = lazy(() => import('@/pages/admin/Orders'));
const AdminUsers      = lazy(() => import('@/pages/admin/Users'));
const AdminCategories = lazy(() => import('@/pages/admin/Categories'));
const AdminTemplates  = lazy(() => import('@/pages/admin/Templates'));
const AdminLayouts    = lazy(() => import('@/pages/admin/Layouts'));
const AdminBookSizes  = lazy(() => import('@/pages/admin/BookSizes'));
const AdminSettings   = lazy(() => import('@/pages/admin/Settings'));
const AdminSecurity   = lazy(() => import('@/pages/admin/Security'));

// ── Page loader ───────────────────────────────────────────────────────────
// Shown by Suspense while a heavy page chunk (editor, AI album, admin, etc.)
// is downloading — branded instead of a bare spinner so the wait feels intentional.
function PageLoader() {
  let lang: 'sq' | 'en' = 'en';
  try {
    // useLanguage requires LanguageProvider; PageLoader always renders inside it
    // via <Suspense> in <Router />, but guard anyway since Suspense fallbacks
    // can theoretically render before providers mount during fast refresh.
    lang = useLanguage().lang;
  } catch { /* fall back to en */ }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 6, minHeight: '100dvh', background: '#f7f5f2',
    }}>
      <style>{`
        @keyframes pergjithmone-loader-zoom {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        @keyframes pergjithmone-loader-fade-up {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <p
        className="font-serif leading-none tracking-tight"
        style={{
          fontSize: 'clamp(30px, 4.5vw, 52px)', fontStyle: 'italic', fontWeight: 300,
          color: '#1a1a1a', margin: 0,
          animation: 'pergjithmone-loader-zoom 2.2s ease-in-out infinite',
        }}
      >
        Përgjithmonë
      </p>
      <p style={{
        fontSize: 14, letterSpacing: '0.14em', textTransform: 'uppercase',
        color: '#8a8580', fontWeight: 500, margin: 0,
        animation: 'pergjithmone-loader-fade-up 0.5s ease-out 0.15s both',
      }}>
        {lang === 'sq' ? 'Ruani kujtimet tuaja...' : 'Save your memories...'}
      </p>
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        if (error?.status === 401 || error?.status === 403) return false;
        return failureCount < 2;
      },
      // Keep data fresh for 5 min; retain in cache for 15 min so navigating
      // back to a page doesn't trigger a waterfall re-fetch.
      staleTime: 5 * 60_000,
      gcTime:   15 * 60_000,
    },
  },
});

function ScrollToTop() {
  const [loc] = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [loc]);
  return null;
}

const BASE_URL = (import.meta as any).env?.BASE_URL?.replace(/\/$/, '') || '';

function AnalyticsTracker() {
  const [loc] = useLocation();
  useEffect(() => {
    const t = setTimeout(() => {
      fetch(`${BASE_URL}/api/analytics/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'page_view', path: loc }),
      }).catch(() => {});
    }, 600);
    return () => clearTimeout(t);
  }, [loc]);
  return null;
}

// Maintenance-mode guard — renders full-screen page for non-admins when
// maintenance_mode is enabled; shows a sticky banner for admins.
function SiteGuard({ children }: { children: React.ReactNode }) {
  const { data: settings } = useGetAppSettings();
  const { user } = useAuth();
  const s = settings as any;
  const isAdmin = user?.role === 'admin';
  const maintenanceOn = s?.maintenanceMode === true;

  if (maintenanceOn && !isAdmin) {
    return (
      <Maintenance
        messageAl={s?.maintenanceMessageAl}
        messageEn={s?.maintenanceMessageEn}
        whatsappNumber={s?.whatsappNumber}
      />
    );
  }

  return (
    <>
      {maintenanceOn && isAdmin && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
          background: '#FFFBEB', borderBottom: '2px solid #FCD34D',
          padding: '9px 20px', textAlign: 'center',
          fontSize: '13px', fontWeight: 500, color: '#92400E',
        }}>
          🔧 Maintenance mode is ON — visitors see the maintenance page ·{' '}
          <a href="/heyadmin/cilesimet" style={{ textDecoration: 'underline', fontWeight: 600 }}>
            Turn off in Settings
          </a>
        </div>
      )}
      {children}
    </>
  );
}

function Router() {
  return (
    <>
      <ScrollToTop />
      <AnalyticsTracker />
      <Suspense fallback={<PageLoader />}>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/shembuj" component={Examples} />
          <Route path="/rreth-nesh" component={About} />
          <Route path="/kontakt" component={Contact} />
          <Route path="/si-funksionon" component={HowItWorks} />
          <Route path="/faq" component={FAQ} />
          <Route path="/terms" component={Terms} />
          <Route path="/privacy" component={Privacy} />
          <Route path="/cmime" component={Pricing} />
          <Route path="/hyr" component={Login} />
          <Route path="/regjistrohu" component={Register} />
          <Route path="/fjalekale-harruar" component={ForgotPassword} />

          {/* App Routes */}
          <Route path="/krijo" component={Wizard} />
          <Route path="/album-ai" component={AlbumAI} />
          <Route path="/projektet">
            <ProtectedRoute><Projects /></ProtectedRoute>
          </Route>
          <Route path="/porositë">
            <ProtectedRoute><Orders /></ProtectedRoute>
          </Route>
          <Route path="/profili">
            <ProtectedRoute><Profile /></ProtectedRoute>
          </Route>
          <Route path="/editor/:id">
            {params => <Editor key={params?.id ?? 'editor'} />}
          </Route>

          {/* Admin Routes */}
          <Route path="/heyadmin">
            <ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>
          </Route>
          <Route path="/heyadmin/porosi">
            <ProtectedRoute requireAdmin><AdminOrders /></ProtectedRoute>
          </Route>
          <Route path="/heyadmin/perdorues">
            <ProtectedRoute requireAdmin><AdminUsers /></ProtectedRoute>
          </Route>
          <Route path="/heyadmin/kategori">
            <ProtectedRoute requireAdmin><AdminCategories /></ProtectedRoute>
          </Route>
          <Route path="/heyadmin/template">
            <ProtectedRoute requireAdmin><AdminTemplates /></ProtectedRoute>
          </Route>
          <Route path="/heyadmin/layout">
            <ProtectedRoute requireAdmin><AdminLayouts /></ProtectedRoute>
          </Route>
          <Route path="/heyadmin/madhesia">
            <ProtectedRoute requireAdmin><AdminBookSizes /></ProtectedRoute>
          </Route>
          <Route path="/heyadmin/siguria">
            <ProtectedRoute requireAdmin><AdminSecurity /></ProtectedRoute>
          </Route>
          <Route path="/heyadmin/cilesimet">
            <ProtectedRoute requireAdmin><AdminSettings /></ProtectedRoute>
          </Route>

          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
              <LanguageProvider>
                <AuthProvider>
                  <SiteGuard>
                    <ErrorBoundary>
                      <Router />
                    </ErrorBoundary>
                  </SiteGuard>
                </AuthProvider>
              </LanguageProvider>
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
}

export default App;
