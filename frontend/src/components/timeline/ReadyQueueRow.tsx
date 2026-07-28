interface ReadyItem {
  pid: string;
  priority: number;
  isActive: boolean;
  remaining?: number;
}

interface Props {
  items: ReadyItem[];
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
}

const CARD_W = 72;

export default function ReadyQueueRow({ items, scrollRef, onScroll }: Props) {
  return (
    <div className="tl-row-container">
      <div className="tl-row-label">READY QUEUE</div>
      <div className="tl-scroll-area" ref={scrollRef} onScroll={onScroll}>
        <div className="tl-ready-inner" style={{ width: items.length * CARD_W }}>
          {items.map((item, i) => (
            <div
              key={item.pid}
              className={`tl-ready-card ${item.isActive ? 'active' : 'inactive'}`}
              style={{
                left: i * CARD_W,
                width: CARD_W,
              }}
            >
              <span className="tl-ready-prio">{item.priority}</span>
              <span className="tl-ready-pid">{item.pid}</span>
              <span className="tl-ready-rem">
                {item.isActive && item.remaining !== undefined ? item.remaining : ''}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
