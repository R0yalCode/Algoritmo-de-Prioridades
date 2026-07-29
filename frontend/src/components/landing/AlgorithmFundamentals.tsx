import { Cpu, Shuffle, ListOrdered, ShieldCheck } from 'lucide-react';

const rules = [
  {
    number: 1,
    icon: Cpu,
    title: 'Prioridad',
    text: 'Cada proceso tiene un nivel de prioridad asignado (1 = máxima prioridad, 20 = mínima prioridad). El planificador selecciona siempre, entre los procesos listos, aquel con la prioridad más alta (número más bajo).',
  },
  {
    number: 2,
    icon: Shuffle,
    title: 'Apropiación (Preemption)',
    text: 'Si un proceso nuevo con prioridad superior ingresa a la cola de procesos listos mientras otro proceso está ejecutándose, el kernel interrumpe el proceso actual de forma inmediata y lo reemplaza por el proceso de mayor prioridad.',
  },
  {
    number: 3,
    icon: ListOrdered,
    title: 'Desempate FIFO',
    text: 'Cuando dos procesos poseen la misma prioridad, se utiliza el criterio FIFO (First In, First Out): el proceso que ingresó primero a la cola de listos se ejecuta primero. La antigüedad FIFO se conserva durante la apropiación. Si un proceso sale de la cola de listos por una operación de E/S, al regresar se coloca al final, perdiendo su antigüedad.',
  },
  {
    number: 4,
    icon: ShieldCheck,
    title: 'CPU Ocupada — Misma Prioridad',
    text: 'Si ingresa un proceso con la misma prioridad que el proceso que está ejecutándose actualmente, no ocurre apropiación. El proceso actual continúa su ejecución normal. La apropiación solo ocurre cuando la prioridad del nuevo proceso es estrictamente menor (número menor).',
  },
];

export default function AlgorithmFundamentals() {
  return (
    <section className="landing-section">
      <h2 className="landing-section-title">Fundamentos del Algoritmo</h2>
      <div className="landing-fundamentals-grid">
        {rules.map((rule) => {
          const Icon = rule.icon;
          return (
            <div key={rule.number} className="landing-fund-card">
              <div className="landing-fund-card-header">
                <div className="landing-fund-card-rule">{rule.number}</div>
                <Icon size={18} color="var(--primary)" />
                <h3 className="landing-fund-card-title">{rule.title}</h3>
              </div>
              <p className="landing-fund-card-text">{rule.text}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
