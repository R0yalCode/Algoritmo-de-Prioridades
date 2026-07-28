from src.domain.enums import ProcessState
from src.domain.models import Process


ALLOWED_TRANSITIONS: dict[ProcessState, set[ProcessState]] = {
    ProcessState.NEW: {ProcessState.READY},
    ProcessState.READY: {ProcessState.RUNNING, ProcessState.TERMINATED},
    ProcessState.RUNNING: {ProcessState.READY, ProcessState.BLOCKED, ProcessState.TERMINATED},
    ProcessState.BLOCKED: {ProcessState.READY},
    ProcessState.TERMINATED: set(),
}


class StateManager:
    def change_state(self, process: Process, new_state: ProcessState) -> None:
        current = process.current_state
        allowed = ALLOWED_TRANSITIONS.get(current, set())
        if new_state not in allowed:
            raise ValueError(
                f"Transición inválida: {current.value} → {new_state.value} "
                f"para proceso {process.id}"
            )
        process.current_state = new_state

    def is_terminal(self, process: Process) -> bool:
        return process.current_state == ProcessState.TERMINATED
