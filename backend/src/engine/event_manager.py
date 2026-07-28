from src.domain.models import Event
from src.domain.enums import EventType


class EventManager:
    def __init__(self) -> None:
        self._events: list[Event] = []
        self._counter: int = 0

    def register(
        self,
        time: int,
        event_type: EventType,
        process_id: str | None = None,
        description: str = "",
        reason: str = "",
        metadata: dict | None = None,
    ) -> Event:
        self._counter += 1
        event = Event(
            id=f"evt-{self._counter:03d}",
            time=time,
            type=event_type,
            process_id=process_id,
            description=description,
            reason=reason,
            metadata=metadata or {},
        )
        self._events.append(event)
        return event

    def get_events(self) -> list[Event]:
        return list(self._events)

    def get_events_at_time(self, time: int) -> list[Event]:
        return [e for e in self._events if e.time == time]

    def clear(self) -> None:
        self._events.clear()
        self._counter = 0
