import { motion } from 'framer-motion';
import { Cpu, GanttChartSquare, HardDrive, BarChart3, Shuffle, ArrowRight } from 'lucide-react';
import GlassCard from '../ui/GlassCard';

const cards = [
  {
    icon: Cpu,
    title: '¿Qué es la planificación CPU?',
    text: 'El planificador de CPU decide qué proceso ocupa el procesador en cada instante, maximizando el rendimiento del sistema.',
    color: '#3b82f6',
  },
  {
    icon: Shuffle,
    title: '¿Qué es un algoritmo por prioridades?',
    text: 'Cada proceso tiene una prioridad (1 = máxima, 20 = mínima). El planificador selecciona siempre el proceso de mayor prioridad.',
    color: '#8b5cf6',
  },
  {
    icon: ArrowRight,
    title: '¿Qué significa una apropiación?',
    text: 'Si un proceso nuevo tiene mayor prioridad que el actual, el kernel interrumpe el proceso en ejecución y lo reemplaza.',
    color: '#f59e0b',
  },
  {
    icon: HardDrive,
    title: '¿Por qué existen operaciones de E/S?',
    text: 'Los procesos realizan entrada/salida (disco, red). Durante E/S el proceso se bloquea y la CPU queda libre para otros.',
    color: '#06b6d4',
  },
  {
    icon: GanttChartSquare,
    title: '¿Qué representa el Diagrama de Gantt?',
    text: 'El Gantt muestra la secuencia temporal de ejecución: qué proceso usó la CPU y durante cuánto tiempo.',
    color: '#22c55e',
  },
  {
    icon: BarChart3,
    title: 'Métricas de rendimiento',
    text: 'Tiempo de retorno, tiempo de espera y uso de CPU son las métricas clave para evaluar el algoritmo.',
    color: '#ec4899',
  },
];

export default function EducationalCards() {
  return (
    <section className="edu-section">
      <motion.h2
        className="edu-title"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
      >
        Fundamentos educativos
      </motion.h2>
      <div className="edu-grid">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
            >
              <GlassCard hover padding="lg" className="edu-card">
                <div className="edu-icon-wrap" style={{ backgroundColor: `${card.color}15`, color: card.color }}>
                  <Icon size={22} />
                </div>
                <h3 className="edu-card-title">{card.title}</h3>
                <p className="edu-card-text">{card.text}</p>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}


