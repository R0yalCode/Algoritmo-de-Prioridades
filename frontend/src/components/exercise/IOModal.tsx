import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Plus, AlertTriangle } from 'lucide-react';
import GlassModal from '../ui/GlassModal';
import GlassButton from '../ui/GlassButton';
import GlassDialog from '../ui/GlassDialog';
import IOCard from './IOCard';
import type { IOOperation } from '../../types';

interface Props {
  open: boolean;
  onClose: () => void;
  processName: string;
  operations: IOOperation[];
  onSave: (ops: IOOperation[]) => void;
}

export default function IOModal({ open, onClose, processName, operations, onSave }: Props) {
  const [localOps, setLocalOps] = useState<IOOperation[]>(operations);
  const [activationPoint, setActivationPoint] = useState('');
  const [duration, setDuration] = useState('');
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const handleAdd = () => {
    const ap = parseInt(activationPoint, 10);
    const dur = parseInt(duration, 10);
    if (isNaN(ap) || ap < 0) { setError('Ingrese un punto de activación válido (≥ 0)'); return; }
    if (isNaN(dur) || dur < 1) { setError('Ingrese una duración válida (≥ 1)'); return; }
    setLocalOps([...localOps, { activationPoint: ap, duration: dur }]);
    setActivationPoint('');
    setDuration('');
    setError('');
  };

  const confirmDelete = () => {
    if (deleteTarget === null) return;
    setLocalOps(localOps.filter((_, i) => i !== deleteTarget));
    setDeleteTarget(null);
  };

  const deleteOp = localOps[deleteTarget ?? -1];

  const handleSave = () => {
    onSave(localOps);
    onClose();
  };

  const handleCancel = () => {
    setLocalOps(operations);
    onClose();
  };

  return (
    <>
      <GlassModal open={open} onClose={handleCancel} title="Operaciones de Entrada / Salida" width="520px">
        <p className="io-modal-subtitle">
          Proceso seleccionado: <strong>{processName}</strong>
        </p>

        <div className="io-modal-form">
          <div className="io-modal-fields">
            <div className="io-modal-field">
              <label className="io-modal-label">¿Cuándo ocurre la operación?</label>
              <input
                className="glass-input"
                type="number"
                min={0}
                value={activationPoint}
                onChange={(e) => setActivationPoint(e.target.value)}
                placeholder="Ej: 5"
              />
              <span className="io-modal-hint">
                La operación se activará cuando el proceso haya ejecutado exactamente esta cantidad de CPU acumulada.
              </span>
            </div>
            <div className="io-modal-field">
              <label className="io-modal-label">Duración de la operación (ms)</label>
              <input
                className="glass-input"
                type="number"
                min={1}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="Ej: 3"
              />
            </div>
          </div>

          {error && (
            <div className="io-modal-error">
              <AlertTriangle size={14} />
              <span>{error}</span>
            </div>
          )}

          <GlassButton variant="secondary" icon={<Plus size={16} />} onClick={handleAdd}>
            Agregar operación
          </GlassButton>
        </div>

        <div className="io-modal-list">
          <AnimatePresence mode="popLayout">
            {localOps.length === 0 ? (
              <p className="io-modal-empty">No hay operaciones registradas</p>
            ) : (
              localOps.map((op, i) => (
                <IOCard
                  key={i}
                  activationPoint={op.activationPoint}
                  duration={op.duration}
                  onDelete={() => setDeleteTarget(i)}
                />
              ))
            )}
          </AnimatePresence>
        </div>

        <div className="io-modal-actions">
          <GlassButton variant="ghost" onClick={handleCancel}>Cancelar</GlassButton>
          <GlassButton variant="primary" onClick={handleSave}>Guardar</GlassButton>
        </div>
      </GlassModal>

      <GlassDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Eliminar operación"
        message={
          deleteOp ? (
            <div className="delete-io-detail">
              <p>¿Desea eliminar esta operación de Entrada/Salida?</p>
              <div className="delete-io-info glass">
                <span>CPU: {deleteOp.activationPoint} ms</span>
                <span>Duración: {deleteOp.duration} ms</span>
              </div>
              <p className="delete-io-warning">Esta acción no se puede deshacer.</p>
            </div>
          ) : ''
        }
        confirmLabel="Eliminar"
        variant="danger"
      />
    </>
  );
}
