from src.domain.models import Process
from src.domain.enums import ProcessState


class SchedulerDecision:
    def __init__(self, selected: Process | None, preempted: Process | None, reason: str):
        self.selected = selected
        self.preempted = preempted
        self.reason = reason


class Scheduler:
    def select_process(
        self,
        current_process: Process | None,
        ready_queue: list[Process],
    ) -> SchedulerDecision:
        if not ready_queue:
            if current_process is not None:
                return SchedulerDecision(current_process, None, "CONTINUE")
            return SchedulerDecision(None, None, "IDLE")

        candidates = [p for p in ready_queue if p.current_state == ProcessState.READY]
        if not candidates:
            if current_process is not None:
                return SchedulerDecision(current_process, None, "CONTINUE")
            return SchedulerDecision(None, None, "IDLE")

        candidates.sort(key=lambda p: (p.priority, p.logical_order))
        best = candidates[0]

        if current_process is None:
            return SchedulerDecision(best, None, "NEW_PROCESS_SELECTED")

        if current_process.current_state != ProcessState.RUNNING:
            return SchedulerDecision(best, None, "CPU_WAS_FREE")

        if best.priority < current_process.priority:
            return SchedulerDecision(best, current_process, "PREEMPTION")

        return SchedulerDecision(current_process, None, "CONTINUE")
