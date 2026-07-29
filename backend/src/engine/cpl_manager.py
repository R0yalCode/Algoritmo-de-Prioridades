from src.domain.models import Process
from src.domain.enums import ProcessState


class CPLManager:
    def __init__(self) -> None:
        self._logical_queue: list[Process] = []
        self._fifo_counter: int = 0

    def add_process(self, process: Process, preserve_order: bool = False) -> None:
        if process.current_state != ProcessState.READY:
            raise ValueError(
                f"Proceso {process.id} debe estar en READY para entrar a CPL"
            )
        if not preserve_order:
            process.fifo_order = self._fifo_counter
            self._fifo_counter += 1
        self._logical_queue.append(process)

    def remove_process(self, process: Process) -> None:
        if process in self._logical_queue:
            self._logical_queue.remove(process)

    def get_logical_queue(self) -> list[Process]:
        return list(self._logical_queue)

    def get_visual_queue(self) -> list[Process]:
        return list(self._logical_queue)

    def is_empty(self) -> bool:
        return len(self._logical_queue) == 0

    def size(self) -> int:
        return len(self._logical_queue)

    def clear(self) -> None:
        self._logical_queue.clear()
