import { useCallback } from 'react';
import ProcessRow from './ProcessRow';
import type { ProcessFormData } from '../../types';

interface Props {
  processes: ProcessFormData[];
  onUpdate: (idx: number, p: ProcessFormData) => void;
  onDelete: (idx: number) => void;
}

export default function ProcessTable({ processes, onUpdate, onDelete }: Props) {
  const handleUpdate = useCallback((idx: number, p: ProcessFormData) => {
    onUpdate(idx, p);
  }, [onUpdate]);

  const handleDelete = useCallback((idx: number) => {
    onDelete(idx);
  }, [onDelete]);

  return (
    <div className="table-container">
      <table className="process-table">
        <thead>
          <tr className="tr-header">
            <th className="th-name">Proceso</th>
            <th className="th-num">Llegada</th>
            <th className="th-num">CPU</th>
            <th className="th-num">Prioridad</th>
            <th className="th-io" colSpan={2}>Operaciones de Entrada / Salida</th>
          </tr>
          <tr className="tr-subheader">
            <th />
            <th />
            <th />
            <th />
            <th className="th-io-sub">Ocurre en CPU (ms)</th>
            <th className="th-io-sub">Duración (ms)</th>
            <th className="th-io-sub">Acciones</th>
          </tr>
          
        </thead>
        <tbody>
          {processes.map((p, i) => (
            <ProcessRow
              key={i}
              process={p}
              index={i}
              onChange={handleUpdate}
              onDelete={handleDelete}
            />
          ))}
        </tbody>
      </table>
      {processes.length === 0 && (
        <div className="table-empty">
          <p>No hay procesos. Agregue al menos uno para comenzar.</p>
        </div>
      )}
    </div>
  );
}
