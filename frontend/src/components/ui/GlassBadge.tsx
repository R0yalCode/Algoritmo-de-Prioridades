import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
}

const variants = {
  default: 'badge-default',
  success: 'badge-success',
  warning: 'badge-warning',
  error: 'badge-error',
  info: 'badge-info',
};

export default function GlassBadge({ children, variant = 'default' }: Props) {
  return (
    <span className={`badge ${variants[variant]}`}>
      {children}
    </span>
  );
}
