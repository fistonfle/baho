import type { ReactNode } from 'react';

// Small shared building blocks used by every screen.

export function BrandMark({ tagline = true }: { tagline?: boolean }) {
  return (
    <span className="brand">
      <span className="brand-emblem" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M12 20s-7-4.3-7-9.4A4.1 4.1 0 0 1 12 8a4.1 4.1 0 0 1 7 2.6C19 15.7 12 20 12 20Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M6.5 12.5h3l1.5-2.5 2 4 1.3-2h3.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
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
  draft: { label: 'Umushinga', tone: 'neutral' },
  review: { label: 'Itegereje isuzuma', tone: 'warning' },
  approved: { label: 'Byemejwe n\'inzobere', tone: 'info' },
  published: { label: 'Yasohotse', tone: 'success' },
  rejected: { label: 'Igomba gukosorwa', tone: 'danger' }
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
