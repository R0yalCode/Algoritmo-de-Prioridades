import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface Props {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  children?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
  type?: 'button' | 'submit';
  'aria-label'?: string;
}

const variants = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
};

// Sistema de tamaños centralizado: toda la app comparte estas tres escalas
// (ver .btn-sm/.btn-md/.btn-lg en styles.css). Ninguna pantalla define
// padding, altura o tipografía de botón por su cuenta.
const sizes = {
  sm: 'btn-sm',
  md: 'btn-md',
  lg: 'btn-lg',
};

export default function GlassButton({
  variant = 'primary', size = 'md', icon, children, loading, disabled, className = '',
  onClick, type = 'button', 'aria-label': ariaLabel,
}: Props) {
  return (
    <motion.button
      className={`glass-btn ${variants[variant]} ${sizes[size]} ${className}`}
      whileHover={disabled ? {} : { scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      disabled={disabled || loading}
      onClick={onClick}
      type={type}
      aria-label={ariaLabel}
    >
      {loading ? (
        <span className="spinner" />
      ) : icon ? (
        <span className="btn-icon">{icon}</span>
      ) : null}
      {children && <span>{children}</span>}
    </motion.button>
  );
}
