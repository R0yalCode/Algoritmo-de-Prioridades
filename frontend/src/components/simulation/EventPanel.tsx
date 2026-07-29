import { LogIn, ArrowLeftRight, Cpu, HardDrive, CheckCircle2, Cpu as CpuIcon } from 'lucide-react';
import GlassPanel from '../ui/GlassPanel';
import type { SnapshotEvent } from '../../types';

const ICONS: Record<string, typeof LogIn> = {
  ARRIVAL: LogIn,
  PREEMPTION: ArrowLeftRight,
  CPU_ASSIGNED: Cpu,
  CPU_RELEASED: CpuIcon,
  IO_START: HardDrive,
  IO_END: HardDrive,
  TERMINATED: CheckCircle2,
};

const COLORS: Record<string, string> = {
  ARRIVAL: '#3b82f6',
  PREEMPTION: '#f59e0b',
  CPU_ASSIGNED: '#22c55e',
  CPU_RELEASED: '#8b5cf6',
  IO_START: '#06b6d4',
  IO_END: '#10b981',
  TERMINATED: '#64748b',
};

interface Props {
  events: SnapshotEvent[];
  currentTime: number;
}

export default function EventPanel({ events, currentTime }: Props) {
  const visible = events.filter((e) => e.time <= currentTime).slice(-30);

  return (
    <GlassPanel title="Eventos" badge={visible.length}>
      <div className="event-timeline">
        {visible.length === 0 ? (
          <p className="panel-empty">No hay eventos en este instante</p>
        ) : (
          visible.map((e, i) => {
            const Icon = ICONS[e.type] || LogIn;
            const color = COLORS[e.type] || '#64748b';
            return (
              <div key={i} className="event-entry">
                <div className="event-marker" style={{ backgroundColor: color }}>
                  <Icon size={12} color="white" />
                </div>
                <div className="event-line" />
                <div className="event-body">
                  <span className="event-time-badge" style={{ color }}>t={e.time}</span>
                  <span className="event-desc">{e.description}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </GlassPanel>
  );
}
