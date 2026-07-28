interface IOOpsItem {
  pid: string;
  priority: number;
  duration: number;
  startTime: number;
  endTime: number;
  remaining?: number;
  isActive: boolean;
}

interface Props {
  items: IOOpsItem[];
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
}

const IO_SCALE = 8;

export default function IOQueueRow({ items, scrollRef, onScroll }: Props) {
  let offset = 0;
  const segments = items.map((item) => {
    const w = Math.max(item.duration * IO_SCALE, 16);
    const seg = { ...item, x: offset, w };
    offset += w;
    return seg;
  });

  return (
    <div className="tl-row-container">
      <div className="tl-row-label">I/O QUEUE</div>
      <div className="tl-scroll-area" ref={scrollRef} onScroll={onScroll}>
        <div className="tl-io-inner" style={{ width: offset }}>
          {segments.map((seg) => (
            <div
              key={`${seg.pid}-${seg.startTime}`}
              className={`tl-io-block ${seg.isActive ? 'active' : 'inactive'}`}
              style={{
                left: seg.x,
                width: seg.w,
              }}
            >
              <span className="tl-io-prio">{seg.priority}</span>
              <span className="tl-io-pid">{seg.pid}</span>
              <span className="tl-io-rem">CPU: {seg.remaining ?? '?'}</span>
              <span className="tl-io-end">Sale: t={seg.endTime}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
