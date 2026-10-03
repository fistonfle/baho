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
