import type { ReactNode } from 'react';

// Small shared building blocks used by every screen.

export function BrandMark({ tagline = true }: { tagline?: boolean }) {
  return (
    <span className="brand">
      <span className="brand-emblem" aria-hidden="true">B</span>
      <span>
        <span className="brand-name">Baho</span>
        {tagline && <span className="brand-tagline">Urubuga rw'inyigisho ku ndwara zitandura</span>}
      </span>
    </span>
  );
}

export type Crumb = { label: string; onClick?: () => void };

export function PageHeader({ crumbs = [], title, lead, actions }: { crumbs?: Crumb[]; title: ReactNode; lead?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="page-header">
      {crumbs.length > 0 && (
        <ol className="breadcrumb" aria-label="Aho uri">
          {crumbs.map((crumb) => (
            <li key={crumb.label}>{crumb.onClick ? <button onClick={crumb.onClick}>{crumb.label}</button> : crumb.label}</li>
          ))}
        </ol>
      )}
      <div className="page-header-row">
        <div>
          <h1>{title}</h1>
          {lead && <p className="lead">{lead}</p>}
        </div>
        {actions && <div className="page-actions">{actions}</div>}
      </div>
    </header>
  );
}

export function Panel({ title, description, actions, children, footer, flush = false, className = '' }: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  flush?: boolean;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`.trim()}>
      {(title || actions) && (
        <div className="panel-head">
          <div>
            {title && <h2>{title}</h2>}
            {description && <p>{description}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className={`panel-body ${flush ? 'flush' : ''}`.trim()}>{children}</div>
      {footer && <div className="panel-foot">{footer}</div>}
    </section>
  );
}

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

export function StatusBadge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  return <span className={`badge ${tone === 'neutral' ? '' : `badge-${tone}`}`.trim()}>{label}</span>;
}

// Lesson workflow: draft -> review -> approved (specialist) -> published; rejected = changes requested.
export const lessonStatus: Record<string, { label: string; tone: Tone }> = {
  draft: { label: 'Draft', tone: 'neutral' },
  review: { label: 'In review', tone: 'warning' },
  approved: { label: 'Approved by specialist', tone: 'info' },
  published: { label: 'Published', tone: 'success' },
  rejected: { label: 'Changes requested', tone: 'danger' }
};

export function LessonStatusBadge({ status }: { status: string }) {
  const info = lessonStatus[status] ?? { label: status, tone: 'neutral' as Tone };
  return <StatusBadge label={info.label} tone={info.tone} />;
}

export function Disclaimer() {
  return (
    <p className="alert alert-warning small">
      <strong>Icyitonderwa:</strong> Baho itanga amakuru gusa, ntisimbura muganga. Niba ufite impungenge ku buzima bwawe, jya ku kigo nderabuzima kikwegereye.
    </p>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>;
}

// Lesson photos come in two sizes (name.jpg 1000 px, name-sm.jpg 480 px); the
// browser picks the smaller one on phones. Photos below the first screen load
// only when scrolled to.
const photoSizes = (path: string) => (/^\/images\/[a-z-]+\.jpg$/.test(path) ? `${path.replace(/\.jpg$/, '-sm.jpg')} 480w, ${path} 1000w` : undefined);

export const smallPhoto = (path: string) => (/^\/images\/[a-z-]+\.jpg$/.test(path) ? path.replace(/\.jpg$/, '-sm.jpg') : path);

export function Photo({ src, alt = '', sizes = '(max-width: 760px) 100vw, 60vw', lazy = false }: { src: string; alt?: string; sizes?: string; lazy?: boolean }) {
  const srcSet = photoSizes(src);
  return <img src={src} srcSet={srcSet} sizes={srcSet ? sizes : undefined} alt={alt} width="320" height="200" loading={lazy ? 'lazy' : 'eager'} decoding="async" />;
}
