import React, { useRef, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  useListProjects, useDeleteProject, useUpdateProject,
  getListProjectsQueryKey,
} from '@workspace/api-client-react';
import { Link, useLocation } from 'wouter';
import { format } from 'date-fns';
import { sq as sqLocale } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { BookHeart, Plus, Trash2, Pencil, Check, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQueryClient } from '@tanstack/react-query';

// ─── Cover thumbnail ──────────────────────────────────────────────────────────
// Renders the project's actual front-cover design (background, shapes, text)
// so the dashboard reflects the style the user picked in the wizard, instead
// of a generic placeholder book.

const COVER_W = 600;
const COVER_H = 800;

type CoverEl = {
  type: 'image' | 'text' | 'placeholder' | 'background' | 'shape';
  x: number; y: number; w: number; h: number;
  bgColor?: string; bgGradientFrom?: string; bgGradientTo?: string; bgGradientDir?: string;
  fill?: string; shapeKind?: string; cornerRadius?: number; opacity?: number;
  text?: string; fontSize?: number; align?: string;
};

function CoverThumb({ frontCoverJson }: { frontCoverJson?: string | null }) {
  let elements: CoverEl[] = [];
  if (frontCoverJson) {
    try { elements = JSON.parse(frontCoverJson); } catch { elements = []; }
  }

  if (elements.length === 0) {
    return (
      <div className="w-2/3 h-[80%] bg-white shadow-md border border-gray-100 rounded-r-md flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
        <div className="w-4 h-full bg-gray-100 absolute left-0 border-r border-gray-200" />
        <span className="font-serif text-xs text-muted-foreground rotate-90 opacity-30">PËRGJITHMONË</span>
      </div>
    );
  }

  return (
    <div className="w-2/3 h-[80%] shadow-md border border-gray-100 rounded-r-md overflow-hidden relative group-hover:scale-105 transition-transform duration-500">
      <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        {elements.map((el, i) => {
          const style: React.CSSProperties = {
            position: 'absolute',
            left: `${(el.x / COVER_W) * 100}%`,
            top: `${(el.y / COVER_H) * 100}%`,
            width: `${(el.w / COVER_W) * 100}%`,
            height: `${(el.h / COVER_H) * 100}%`,
          };
          if (el.type === 'background') {
            style.background = el.bgGradientFrom
              ? `linear-gradient(${el.bgGradientDir === 'lr' ? 'to right' : el.bgGradientDir === 'diag' ? '135deg' : 'to bottom'}, ${el.bgGradientFrom}, ${el.bgGradientTo || '#fff'})`
              : (el.bgColor || '#fff');
            style.inset = 0; style.left = 0; style.top = 0; style.width = '100%'; style.height = '100%';
          } else if (el.type === 'placeholder') {
            style.background = '#E8E2D8';
          } else if (el.type === 'shape') {
            style.background = el.fill || '#ccc';
            style.borderRadius = el.shapeKind === 'circle' ? '50%' : (el.cornerRadius ?? 0);
            style.opacity = el.opacity ?? 1;
          } else if (el.type === 'text') {
            return (
              <div key={i} style={{ ...style, fontSize: `${Math.max((el.fontSize || 12) / COVER_H * 100, 1.4)}%`, color: el.fill || '#333', textAlign: (el.align as any) || 'left', lineHeight: 1.1, overflow: 'hidden' }}>
                {el.text}
              </div>
            );
          } else {
            return null;
          }
          return <div key={i} style={style} />;
        })}
      </div>
    </div>
  );
}

export default function Projects() {
  const { lang } = useLanguage();
  const { data: projects, isLoading } = useListProjects();
  const deleteProject = useDeleteProject();
  const updateProject = useUpdateProject();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  // Delete state
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Rename state
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameSaving, setRenameSaving] = useState(false);
  const renameCommittedRef = useRef(false); // prevent double-commit on Enter then blur

  const statusLabel = (status: string) => {
    const map: Record<string, { sq: string; en: string }> = {
      draft:          { sq: 'Në punim',   en: 'Draft' },
      pdf_generating: { sq: 'Në punim',   en: 'Draft' },
      pdf_ready:      { sq: 'Gati',       en: 'Ready' },
      ordered:        { sq: 'Porositur',  en: 'Ordered' },
      printed:        { sq: 'Printuar',   en: 'Printed' },
    };
    return map[status]?.[lang] ?? status;
  };

  const canDelete = (status: string) => status !== 'ordered' && status !== 'printed';

  // ─── Delete ───────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (confirmId === null) return;
    setDeleting(true);
    try {
      await deleteProject.mutateAsync({ projectId: confirmId });
      await queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
    } finally {
      setDeleting(false);
      setConfirmId(null);
    }
  };

  // ─── Rename ───────────────────────────────────────────────────────────────

  const startRename = (id: number, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    renameCommittedRef.current = false;
    setRenamingId(id);
    setRenameValue(title);
  };

  const commitRename = async () => {
    if (renamingId === null || renameCommittedRef.current) return;
    const trimmed = renameValue.trim();
    if (!trimmed) { setRenamingId(null); return; }
    const original = projects?.find(p => p.id === renamingId)?.title ?? '';
    if (trimmed === original) { setRenamingId(null); return; }
    renameCommittedRef.current = true;
    setRenameSaving(true);
    try {
      await updateProject.mutateAsync({ projectId: renamingId, data: { title: trimmed } });
      await queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
      setRenamingId(null);
    } catch {
      renameCommittedRef.current = false; // allow retry
    } finally {
      setRenameSaving(false);
    }
  };

  const cancelRename = () => {
    setRenamingId(null);
    setRenameValue('');
    renameCommittedRef.current = false;
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-3xl md:text-4xl font-serif font-medium">
            {lang === 'sq' ? 'Projektet e mia' : 'My projects'}
          </h1>
          <Link href="/krijo">
            <Button className="rounded-full bg-foreground text-background gap-2">
              <Plus size={18} />
              {lang === 'sq' ? 'Projekt i ri' : 'New project'}
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="aspect-square bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : projects?.length === 0 ? (
          <div className="text-center py-24 bg-secondary rounded-3xl border border-border">
            <BookHeart size={64} className="mx-auto text-muted-foreground mb-6 opacity-50" />
            <h2 className="text-2xl font-serif mb-2">
              {lang === 'sq' ? 'Nuk keni asnjë projekt' : 'No projects yet'}
            </h2>
            <p className="text-muted-foreground mb-8">
              {lang === 'sq'
                ? 'Filloni duke krijuar albumin tuaj të parë.'
                : 'Start by creating your first photobook.'}
            </p>
            <Link href="/krijo">
              <Button size="lg" className="rounded-full">
                {lang === 'sq' ? 'Fillo Tani' : 'Start Now'}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {projects?.map(project => (
              <div
                key={project.id}
                className="group relative border border-border rounded-2xl overflow-hidden bg-card hover:border-foreground/30 hover:shadow-md transition-all"
              >
                {/* Delete button — top-left, hover-only */}
                {canDelete(project.status) && (
                  <button
                    onClick={e => { e.stopPropagation(); setConfirmId(project.id); }}
                    className="absolute top-3 left-3 z-10 p-1.5 rounded-full bg-white/80 hover:bg-red-50 text-neutral-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                    title={lang === 'sq' ? 'Fshi projektin' : 'Delete project'}
                  >
                    <Trash2 size={14} />
                  </button>
                )}

                {/* Preview image — navigates to editor */}
                <div
                  className="cursor-pointer"
                  onClick={() => navigate(`/editor/${project.id}`)}
                >
                  <div className="aspect-square bg-secondary flex items-center justify-center p-8 relative">
                    <CoverThumb frontCoverJson={(project as any).frontCoverJson} />
                    <div className="absolute top-3 right-3">
                      <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-full ${
                        project.status === 'ordered' ? 'bg-green-100 text-green-800' :
                        project.status === 'pdf_ready' ? 'bg-blue-100 text-blue-800' :
                        'bg-secondary border border-border text-muted-foreground'
                      }`}>
                        {statusLabel(project.status)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card footer — title + rename */}
                <div className="p-5">
                  <div className="flex items-center gap-1.5 mb-1 min-w-0">
                    {renamingId === project.id ? (
                      /* ── Rename input ── */
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={e => setRenameValue(e.target.value)}
                          onBlur={commitRename}
                          onKeyDown={e => {
                            if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
                            if (e.key === 'Escape') { e.preventDefault(); cancelRename(); }
                          }}
                          onClick={e => e.stopPropagation()}
                          disabled={renameSaving}
                          maxLength={80}
                          className="font-serif font-medium text-lg flex-1 min-w-0 border-0 border-b-2 border-neutral-900 outline-none bg-transparent px-0 py-0 leading-tight disabled:opacity-50 focus:border-b-2"
                          style={{ boxShadow: 'none' }}
                        />
                        {renameSaving
                          ? <Loader2 size={14} className="flex-shrink-0 text-neutral-400 animate-spin" />
                          : (
                            <button
                              onMouseDown={e => { e.preventDefault(); commitRename(); }}
                              className="flex-shrink-0 p-0.5 rounded text-neutral-400 hover:text-neutral-700"
                              title={lang === 'sq' ? 'Ruaj' : 'Save'}
                            >
                              <Check size={14} />
                            </button>
                          )
                        }
                      </div>
                    ) : (
                      /* ── Normal title ── */
                      <>
                        <h3 className="font-serif font-medium text-lg truncate flex-1 min-w-0 leading-snug">
                          {project.title}
                        </h3>
                        <button
                          onClick={e => startRename(project.id, project.title, e)}
                          className="flex-shrink-0 p-1 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 opacity-0 group-hover:opacity-100 transition-all"
                          title={lang === 'sq' ? 'Riemërto albumin' : 'Rename album'}
                        >
                          <Pencil size={13} />
                        </button>
                      </>
                    )}
                  </div>

                  <div className="flex justify-between items-center text-xs text-muted-foreground mt-2">
                    <span>{project.pageCount || 24} {lang === 'sq' ? 'faqe' : 'pages'}</span>
                    <span>{format(new Date(project.updatedAt), 'dd MMM, yyyy', { locale: lang === 'sq' ? sqLocale : undefined })}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Confirm delete modal ── */}
      {confirmId !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
          onClick={() => !deleting && setConfirmId(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-7 max-w-sm w-full"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-50 mx-auto mb-4">
              <Trash2 size={22} className="text-red-500" />
            </div>
            <h2 className="text-xl font-serif font-medium text-center mb-2">
              {lang === 'sq' ? 'Fshi projektin?' : 'Delete project?'}
            </h2>
            <p className="text-sm text-neutral-500 text-center mb-6 leading-relaxed">
              {lang === 'sq'
                ? 'Ky veprim është i pakthyeshëm. Projekti dhe të gjitha faqet do të fshihen përgjithmonë.'
                : 'This cannot be undone. The project and all its pages will be permanently deleted.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmId(null)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-full border border-neutral-200 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors disabled:opacity-50"
              >
                {lang === 'sq' ? 'Anulo' : 'Cancel'}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-full bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors disabled:opacity-60"
              >
                {deleting
                  ? (lang === 'sq' ? 'Duke fshirë…' : 'Deleting…')
                  : (lang === 'sq' ? 'Fshi' : 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
