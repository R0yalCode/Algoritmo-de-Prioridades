import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface Props {
  icon: ReactNode;
  label: string | number;
  variant?: 'cpu' | 'duration' | 'default';
}

const variantStyles = {
  cpu: {
    background: 'rgba(37, 99, 235, 0.07)',
    borderColor: 'rgba(37, 99, 235, 0.15)',
    color: '#2563eb',
    iconColor: '#2563eb',
  },
  duration: {
    background: 'rgba(6, 182, 212, 0.07)',
    borderColor: 'rgba(6, 182, 212, 0.15)',
    color: '#0891b2',
    iconColor: '#0891b2',
  },
  default: {
    background: 'rgba(255, 255, 255, 0.6)',
    borderColor: 'var(--border)',
    color: 'var(--text-secondary)',
    iconColor: 'var(--text-muted)',
  },
};

export default function GlassChip({ icon, label, variant = 'default' }: Props) {
  const v = variantStyles[variant];
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        height: 34,
        padding: '0 12px',
        borderRadius: 8,
        background: v.background,
        border: `1px solid ${v.borderColor}`,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        color: v.color,
        fontSize: 13,
        fontWeight: 500,
        fontFamily: 'var(--font)',
        whiteSpace: 'nowrap',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        transition: 'all 0.15s ease',
        cursor: 'default',
      }}
      whileHover={{
        background: variant === 'cpu'
          ? 'rgba(37, 99, 235, 0.12)'
          : variant === 'duration'
            ? 'rgba(6, 182, 212, 0.12)'
            : 'rgba(255,255,255,0.8)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}
    >
      <span style={{ display: 'flex', flexShrink: 0, color: v.iconColor }}>
        {icon}
      </span>
      <span>{label}</span>
    </motion.span>
  );
}
