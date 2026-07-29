import type { ReactNode } from 'react';

interface Props {
  title?: string;
  badge?: string | number;
  children: ReactNode;
  className?: string;
  accent?: boolean;
}

export default function GlassPanel({ title, badge, children, className = '', accent = false }: Props) {
  return (
    <div className={`panel glass ${accent ? 'panel-accent' : ''} ${className}`}>
      {title && (
        <div className="panel-header">
          <h3 className="panel-title">{title}</h3>
          {badge !== undefined && <span className="panel-badge">{badge}</span>}
        </div>
      )}
      <div className="panel-body">{children}</div>
    </div>
  );
}
