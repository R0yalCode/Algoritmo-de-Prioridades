import type { InputHTMLAttributes, ReactNode } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: ReactNode;
  hint?: string;
  error?: string;
}

export default function GlassInput({ label, icon, hint, error, className = '', ...rest }: Props) {
  return (
    <div className={`input-wrapper ${error ? 'has-error' : ''}`}>
      {label && <label className="input-label">{label}</label>}
      <div className="input-container">
        {icon && <span className="input-icon">{icon}</span>}
        <input className={`glass-input ${icon ? 'has-icon' : ''} ${className}`} {...rest} />
      </div>
      {error && <span className="input-error">{error}</span>}
      {hint && !error && <span className="input-hint">{hint}</span>}
    </div>
  );
}
