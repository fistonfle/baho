import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
  children: ReactNode;
};

export function ActionButton({ variant = 'primary', children, className = '', ...props }: ActionButtonProps) {
  const variantClass = variant === 'secondary' ? 'secondary' : variant === 'ghost' ? 'ghost' : 'primary';

  return (
    <button className={`${variantClass} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}

export function StatusBadge({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'success' | 'warning' }) {
  return <span className={`status-pill ${tone === 'success' ? 'success' : tone === 'warning' ? 'warning' : ''}`}>{label}</span>;
}

export function SectionCard({ eyebrow, title, children }: { eyebrow?: string; title?: string; children: ReactNode }) {
  return (
    <div className="panel-section">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      {title && <h2>{title}</h2>}
      {children}
    </div>
  );
}

export function BrandMark() {
  return (
    <span className="brand-mark">
      <span className="brand-symbol" aria-hidden="true">
        <svg viewBox="0 0 32 32" fill="none">
          <path d="M16 27s-10-6.1-10-13.1A5.9 5.9 0 0 1 16 10a5.9 5.9 0 0 1 10 3.9C26 20.9 16 27 16 27Z" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M8.5 16h4l2-4 3.1 8 2.1-4h3.8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span>BAHO<span className="brand-period">.</span></span>
    </span>
  );
}

export function Disclaimer() {
  return (
    <p className="health-disclaimer">
      <strong>Icyitonderwa:</strong> Baho itanga amakuru gusa, ntisimbura muganga. Niba ufite impungenge ku buzima bwawe, jya ku kigo nderabuzima kikwegereye.
    </p>
  );
}
