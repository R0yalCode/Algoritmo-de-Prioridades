from src.domain.models import Process, IOOperation
from src.domain.enums import ProcessState


class IOActivity:
    def __init__(self, process: Process, operation: IOOperation, start_time: int):
        self.process = process
        self.operation = operation
        self.return_time = start_time + operation.duration + 1


class IOManager:
    def __init__(self) -> None:
        self._activities: list[IOActivity] = []

    def start_io(self, process: Process, current_time: int) -> None:
        for op in process.io_operations:
            if process.executed_cpu == op.activation_point:
                self._activities.append(IOActivity(process, op, current_time))
                return

    def tick_io(self, current_time: int) -> list[Process]:
        completed: list[Process] = []
        for activity in list(self._activities):
            if current_time >= activity.return_time:
                completed.append(activity.process)
                self._activities.remove(activity)
        return completed

    def get_blocked_processes(self) -> list[Process]:
        return [a.process for a in self._activities]

    def get_activity_for(self, process: Process) -> IOActivity | None:
        for a in self._activities:
            if a.process == process:
                return a
        return None

    def has_active_io(self) -> bool:
        return len(self._activities) > 0

    def total_blocked_time(self, process: Process) -> int:
        return sum(op.duration for op in process.io_operations)

    def clear(self) -> None:
        self._activities.clear()
