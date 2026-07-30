import { motion } from 'framer-motion';
import type { GlobalMetrics, Metric, ProcessFormData } from '../../types';

/**
 * Tabla pedagógica de métricas.
 *
 * Muestra el desarrollo del cálculo junto al resultado, dentro de la misma
 * tabla. Ningún resultado se recalcula aquí: los tiempos de retorno, de espera
 * y los promedios son exactamente los que devolvió el motor. El frontend solo
 * expone los operandos que el motor usó, según las fórmulas oficiales de
 * docs/04_contratos_modulos.md (MODULE-METRIC-001):
 *
 *   TR = tiempo de finalización − tiempo de llegada
 *   TE = TR − CPU total ejecutada − tiempo total de E/S
 *
 * El tiempo de finalización se despeja de la propia métrica del motor
 * (finalización = TR + llegada), de modo que la fila nunca puede contradecir
 * el valor calculado por el backend.
 *
 * Filas de cierre:
 *   SUMA      total de cada columna (suma de los valores ya mostrados arriba,
 *             sin repetir el desarrollo 53 + 27 + 4 + ...).
 *   PROMEDIO  SUMA ÷ N = promedio. El resultado mostrado es siempre
 *             globalMetrics.averageTurnaroundTime/averageWaitingTime del
 *             backend, nunca sum/N calculado en el frontend — así el redondeo
 *             que aplica el motor no puede desviarse del que se muestra aquí.
 */

interface Props {
  metrics: Metric[];
  globalMetrics: GlobalMetrics | null;
  processes: ProcessFormData[];
}

interface Development {
  turnaround: string | null;
  waiting: string | null;
}

function developmentFor(
  metric: Metric,
  process: ProcessFormData | undefined,
): Development {
  if (!process) return { turnaround: null, waiting: null };

  const arrival = process.arrivalTime;
  const finish = metric.turnaroundTime + arrival;
  const ios = process.ioOperations ?? [];
  const ioTerm = ios.length === 0
    ? '0'
    : ios.length === 1
      ? `${ios[0].duration}`
      : `(${ios.map((io) => io.duration).join(' + ')})`;

  return {
    turnaround: `${finish} − ${arrival} =`,
    waiting: `${metric.turnaroundTime} − ${process.cpuBurst} − ${ioTerm} =`,
  };
}

/** Suma de una columna ya calculada por el motor (un valor por proceso).
 *  Es una agregación de presentación, no una fórmula de métrica: cada
 *  sumando es exactamente el valor que ya se muestra en su fila. */
function total(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}

export default function MetricsTable({ metrics, globalMetrics, processes }: Props) {
  const byId = new Map(processes.map((p) => [p.id, p]));
  const count = metrics.length;
  const sumTurnaround = total(metrics.map((m) => m.turnaroundTime));
  const sumWaiting = total(metrics.map((m) => m.waitingTime));

  return (
    <div className="metrics-explained glass">
      <div className="mx-formulas">
        <div className="mx-formula">
          <span className="mx-formula-label">Tiempo de retorno</span>
          <code className="mx-formula-expr">
            TR = Tiempo de finalización − Tiempo de llegada
          </code>
        </div>
        <div className="mx-formula">
          <span className="mx-formula-label">Tiempo de espera</span>
          <code className="mx-formula-expr">
            TE = TR − CPU total ejecutada − Tiempo total de E/S
          </code>
        </div>
      </div>

      <div className="metrics-table-wrap">
        <table className="metrics-table mx-table">
          <thead>
            <tr>
              <th>Proceso</th>
              <th>Tiempo de retorno</th>
              <th>Tiempo de espera</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((m, i) => {
              const dev = developmentFor(m, byId.get(m.processId));
              return (
                <motion.tr
                  key={m.processId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <td className="metric-proc-id">{m.processId}</td>
                  <td>
                    <span className="mx-cell">
                      {dev.turnaround && (
                        <span className="mx-op">{dev.turnaround}</span>
                      )}
                      <strong className="mx-result">{m.turnaroundTime} ms</strong>
                    </span>
                  </td>
                  <td>
                    <span className="mx-cell">
                      {dev.waiting && <span className="mx-op">{dev.waiting}</span>}
                      <strong className="mx-result">{m.waitingTime} ms</strong>
                    </span>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
          {globalMetrics && count > 0 && (
            <tfoot>
              <tr className="mx-sum">
                <td className="mx-summary-label">Suma</td>
                <td>
                  <strong className="mx-result">{sumTurnaround} ms</strong>
                </td>
                <td>
                  <strong className="mx-result">{sumWaiting} ms</strong>
                </td>
              </tr>
              <tr className="mx-summary">
                <td className="mx-summary-label">Promedio</td>
                <td>
                  <span className="mx-cell">
                    <span className="mx-op">{sumTurnaround} ÷ {count} =</span>
                    <strong className="mx-result">
                      {globalMetrics.averageTurnaroundTime.toFixed(2)} ms
                    </strong>
                  </span>
                </td>
                <td>
                  <span className="mx-cell">
                    <span className="mx-op">{sumWaiting} ÷ {count} =</span>
                    <strong className="mx-result">
                      {globalMetrics.averageWaitingTime.toFixed(2)} ms
                    </strong>
                  </span>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
