import { useEffect, useCallback, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import GlassButton from './GlassButton';
import Portal from './Portal';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning';
}

export default function GlassDialog({
  open, onClose, onConfirm, title, message,
  confirmLabel = 'Eliminar', cancelLabel = 'Cancelar', variant = 'danger',
}: Props) {
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open, handleEscape]);

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div
            className="modal-overlay"
            style={{ zIndex: 2000 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          >
            <motion.div
              className="glass dialog-content"
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label={title}
            >
              <div className="dialog-icon" data-variant={variant}>
                <AlertTriangle size={24} />
              </div>
              <h3 className="dialog-title">{title}</h3>
              <div className="dialog-message">
                {typeof message === 'string' ? <p>{message}</p> : message}
              </div>
              <div className="dialog-actions">
                <GlassButton variant="ghost" onClick={onClose}>{cancelLabel}</GlassButton>
                <GlassButton variant={variant === 'danger' ? 'danger' : 'primary'} onClick={onConfirm}>
                  {confirmLabel}
                </GlassButton>
              </div>
              <button className="dialog-x" onClick={onClose} aria-label="Cerrar">
                <X size={18} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
