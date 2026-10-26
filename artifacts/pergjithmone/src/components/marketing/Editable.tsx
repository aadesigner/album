import React from 'react';
import type { FieldKind } from '@/lib/marketingPages';
import { usePageEditorOptional } from './PageEditorContext';
import { usePageFieldsOptional } from './PageContent';

type Tag = 'span' | 'div' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'blockquote' | 'button' | 'li';

export function Editable({
  path,
  kind = 'text',
  as: Tag = 'span',
  className,
  style,
  children,
}: {
  path: string;
  kind?: FieldKind;
  as?: Tag;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const editor = usePageEditorOptional();
  const fields = usePageFieldsOptional();
  const autoStyle = kind === 'text' ? fields?.style(path) : undefined;
  const autoSize = kind === 'text' ? fields?.sizeClass(path) : '';
  if (!editor) {
    const hasAuto = !!(autoStyle?.fontFamily || autoStyle?.textAlign || autoSize || className || style);
    if (!hasAuto) return <>{children}</>;
    return (
      <Tag className={[className, autoSize].filter(Boolean).join(' ') || undefined} style={{ ...autoStyle, ...style }}>
        {children}
      </Tag>
    );
  }
  const selected = editor.selected === path;
  return (
    <Tag
      data-editable={path}
      className={[className, autoSize].filter(Boolean).join(' ') || undefined}
      style={{
        ...autoStyle,
        ...style,
        outline: selected ? '2px solid #C45A78' : '1px dashed rgba(196,90,120,0.35)',
        outlineOffset: 3,
        cursor: 'pointer',
        borderRadius: 4,
        pointerEvents: 'auto',
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        editor.select(path, kind);
      }}
    >
      {children}
    </Tag>
  );
}

export function EditableSection({
  path,
  className,
  style,
  children,
}: {
  path: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const editor = usePageEditorOptional();
  const fields = usePageFieldsOptional();
  const hidden = fields?.hidden(path) ?? false;
  const space = fields?.space(path, '') ?? '';
  if (hidden && !editor) return null;
  return (
    <Editable path={path} kind="section" as="div" className={[className, space].filter(Boolean).join(' ') || undefined} style={{ ...style, opacity: hidden ? 0.42 : style?.opacity }}>
      {hidden && editor && (
        <div
          className="text-[10px] uppercase tracking-[0.18em] font-semibold px-3 py-1"
          style={{ background: '#C45A78', color: '#fff' }}
        >
          Hidden on the live site
        </div>
      )}
      {children}
    </Editable>
  );
}
