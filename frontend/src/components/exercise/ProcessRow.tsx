import { memo, useState, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import CpuChip from '../chips/CpuChip';
import DurationChip from '../chips/DurationChip';
import IOModal from './IOModal';
import GlassDialog from '../ui/GlassDialog';
import type { ProcessFormData, IOOperation } from '../../types';

interface Props {
  process: ProcessFormData;
  index: number;
  onChange: (idx: number, p: ProcessFormData) => void;
  onDelete: (idx: number) => void;
}

function ProcessRow({ process, index, onChange, onDelete }: Props) {
  const [showIOModal, setShowIOModal] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const update = useCallback((field: keyof ProcessFormData, value: any) => {
    onChange(index, { ...process, [field]: value });
  }, [onChange, index, process]);

  const handleIOSave = useCallback((ops: IOOperation[]) => {
    onChange(index, { ...process, ioOperations: ops });
  }, [onChange, index, process]);

  const name = process.id || `P${index + 1}`;
  const ioCount = process.ioOperations.length;

  return (
    <>
      <tr className="process-row">
        <td className="td-name" data-label="Proceso">
          <div className="td-name-content">
            <span className="td-name-badge">{index + 1}</span>
            <input
              className="table-input"
              value={process.id}
              onChange={(e) => update('id', e.target.value)}
              placeholder={`P${index + 1}`}
            />
          </div>
        </td>
        <td className="td-num" data-label="Llegada">
          <input
            type="number" min={0}
            className="table-input center"
            value={process.arrivalTime}
            onChange={(e) => update('arrivalTime', +e.target.value)}
          />
        </td>
        <td className="td-num" data-label="CPU">
          <input
            type="number" min={1}
            className="table-input center"
            value={process.cpuBurst}
            onChange={(e) => update('cpuBurst', +e.target.value)}
          />
        </td>
        <td className="td-num" data-label="Prioridad">
          <input
            type="number" min={1} max={20}
            className="table-input center"
            value={process.priority}
            onChange={(e) => update('priority', +e.target.value)}
          />
          <span className="td-hint">1–20</span>
        </td>
        <td className="td-chips" data-label="Ocurre en CPU">
          <div className="chips-wrap">
            {ioCount > 0 ? (
              process.ioOperations.map((op, i) => (
                <CpuChip key={i} value={op.activationPoint} />
              ))
            ) : (
              <span className="chips-empty">—</span>
            )}
          </div>
        </td>
        <td className="td-chips" data-label="Duración">
          <div className="chips-wrap">
            {ioCount > 0 ? (
              process.ioOperations.map((op, i) => (
                <DurationChip key={i} value={op.duration} />
              ))
            ) : (
              <span className="chips-empty">—</span>
            )}
          </div>
        </td>
        <td className="td-actions" data-label="">
          <button
            className="row-action-btn add-io"
            onClick={() => setShowIOModal(true)}
            aria-label="Agregar operación E/S"
            title="Operaciones de E/S"
          >
            <Plus size={16} />
          </button>
          <button
            className="row-action-btn delete-proc"
            onClick={() => setShowDelete(true)}
            aria-label="Eliminar proceso"
            title="Eliminar proceso"
          >
            <Trash2 size={16} />
          </button>
        </td>
      </tr>

      <IOModal
        open={showIOModal}
        onClose={() => setShowIOModal(false)}
        processName={name}
        operations={process.ioOperations}
        onSave={handleIOSave}
      />

      <GlassDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={() => { onDelete(index); setShowDelete(false); }}
        title="Eliminar proceso"
        message={
          <div>
            <p>¿Desea eliminar el proceso <strong>{name}</strong>?</p>
            <p>También se eliminarán todas sus operaciones de Entrada/Salida.</p>
            <p>Esta acción no puede deshacerse.</p>
          </div>
        }
        confirmLabel="Eliminar"
        variant="danger"
      />
    </>
  );
}

export default memo(ProcessRow, (prev, next) => {
  if (prev.index !== next.index) return false;
  const a = prev.process;
  const b = next.process;
  if (a.id !== b.id || a.arrivalTime !== b.arrivalTime || a.cpuBurst !== b.cpuBurst || a.priority !== b.priority) return false;
  if (a.ioOperations.length !== b.ioOperations.length) return false;
  return a.ioOperations.every((op, i) =>
    op.activationPoint === b.ioOperations[i].activationPoint &&
    op.duration === b.ioOperations[i].duration
  );
});
