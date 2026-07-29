import { motion } from 'framer-motion';
import GlassPanel from '../ui/GlassPanel';

interface Props {
  currentTime: number;
  totalTime: number;
  onClick: (time: number) => void;
}

export default function Timeline({ currentTime, totalTime, onClick }: Props) {
  if (totalTime === 0) return null;

  const steps = Math.min(totalTime, 20);
  const interval = Math.max(1, Math.floor(totalTime / steps));

  const marks: number[] = [];
  for (let t = 0; t <= totalTime; t += interval) {
    marks.push(t);
  }
  if (!marks.includes(totalTime)) marks.push(totalTime);

  const pct = totalTime > 0 ? (currentTime / totalTime) * 100 : 0;

  return (
    <GlassPanel>
      <div className="timeline">
        <div className="timeline-header">
          <span className="timeline-label">Línea de tiempo</span>
          <span className="timeline-current">t = {currentTime} ms</span>
        </div>
        <div className="timeline-track" onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = (e.clientX - rect.left) / rect.width;
          onClick(Math.round(x * totalTime));
        }}>
          <div className="timeline-rail" />
          <motion.div
            className="timeline-fill"
            style={{ width: `${pct}%` }}
            layout
          />
          <motion.div
            className="timeline-thumb"
            style={{ left: `${pct}%` }}
            layout
          />
        </div>
        <div className="timeline-marks">
          {marks.map((t) => (
            <span key={t} className="timeline-mark" style={{ left: `${(t / Math.max(totalTime, 1)) * 100}%` }}>
              {t}
            </span>
          ))}
        </div>
      </div>
    </GlassPanel>
  );
}
